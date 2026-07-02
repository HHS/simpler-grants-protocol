import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { z } from "zod";
import { http, HttpResponse, setupServer } from "../utils/mock-fetch";
import { definePlugin, F, FilterError } from "../../src/extensions";
import type { CustomFilterBag, ListResult } from "../../src/client";
import { OpportunityBaseSchema } from "../../src/schemas";
import { withCustomFields } from "../../src/extensions";

const server = setupServer();

const plugin = definePlugin({
  schemas: {
    Opportunity: {
      customFields: {
        programCode: { fieldType: "string", value: z.string() },
      },
    },
  },
  routes: {
    opportunities: { search: { filters: { region: { filterType: "stringArray" } } } },
  },
  meta: { name: "grants-gov adapter", sourceSystem: "grants.gov" },
} as const);

const mockOpp = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  title: "STEM Grant",
  status: { value: "open" },
  description: "A STEM education grant",
  createdAt: "2024-01-15T10:30:00Z",
  lastModifiedAt: "2024-06-01T14:22:00Z",
  customFields: {
    programCode: { name: "programCode", fieldType: "string", value: "STEM-ED" },
  },
};

const searchEnvelope = (items: unknown[]) => ({
  status: 200,
  message: "Success",
  items,
  paginationInfo: { page: 1, pageSize: 25, totalItems: items.length, totalPages: 1 },
  sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
  filterInfo: { filters: {} },
});

describe("plugin.getClient", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("returns a client whose search parses with the plugin schema by default", async () => {
    let capturedBody: Record<string, unknown> | undefined;

    server.use(
      http.post("/common-grants/opportunities/search", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(searchEnvelope([mockOpp]));
      })
    );

    const client = plugin.getClient({ baseUrl: "https://api.example.org" });
    const result = await client.opportunities.search({
      page: 1,
      filters: { region: F.in(["US-CA"]) },
    });

    // No per-call schema, yet the plugin's custom field is parsed and typed.
    expect(result.items).toHaveLength(1);
    expect(result.items[0].customFields?.programCode?.value).toBe("STEM-ED");

    // Registered filter lands under customFilters on the wire.
    expect(capturedBody?.filters).toMatchObject({
      customFilters: { region: { operator: "in", value: ["US-CA"] } },
    });
  });

  it("binds the plugin schema for get() and list() as well", async () => {
    server.use(
      http.get("/common-grants/opportunities/:id", () =>
        HttpResponse.json({ status: 200, message: "Success", data: mockOpp })
      ),
      http.get("/common-grants/opportunities", () => {
        return HttpResponse.json({
          status: 200,
          message: "Success",
          items: [mockOpp],
          paginationInfo: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
        });
      })
    );

    const client = plugin.getClient({ baseUrl: "https://api.example.org" });

    const opp = await client.opportunities.get(mockOpp.id);
    expect(opp.customFields?.programCode?.value).toBe("STEM-ED");

    const list: ListResult<typeof opp> = await client.opportunities.list({ page: 1 });
    expect(list.items[0].customFields?.programCode?.value).toBe("STEM-ED");
  });

  it("throws FilterError on an invalid registered filter value before any request", async () => {
    let requested = false;

    server.use(
      http.post("/common-grants/opportunities/search", () => {
        requested = true;
        return HttpResponse.json(searchEnvelope([]));
      })
    );

    const client = plugin.getClient({ baseUrl: "https://api.example.org" });

    await expect(
      client.opportunities.search({
        // Wrong value family is a compile error too; cast to hit the runtime backstop.
        filters: { region: { operator: "eq", value: "US-CA" } } as unknown as CustomFilterBag<
          NonNullable<typeof plugin.routes>
        >,
      })
    ).rejects.toThrow(FilterError);

    expect(requested).toBe(false);
  });

  it("definePlugin throws FilterError on a bad route at definition time (runtime backstop)", () => {
    expect(() =>
      definePlugin({
        routes: {
          opportunities: {
            // `status` collides with a default-filter name — invalid registration.
            search: { filters: { status: { filterType: "stringArray" } } },
          },
        },
      } as const)
    ).toThrow(FilterError);
  });

  it("per-call schema override still wins over the plugin-bound default", async () => {
    server.use(
      http.post("/common-grants/opportunities/search", () =>
        HttpResponse.json(searchEnvelope([mockOpp]))
      )
    );

    const overrideSchema = withCustomFields(OpportunityBaseSchema, {
      legacyId: { fieldType: "integer", value: z.number().int() },
    } as const);

    const client = plugin.getClient({ baseUrl: "https://api.example.org" });
    const result = await client.opportunities.search({ page: 1, schema: overrideSchema });

    // Parsed under the override: legacyId slot is typed (absent here), and
    // programCode is no longer a typed member of customFields.
    expect(result.items).toHaveLength(1);
    expect(result.items[0].customFields?.legacyId?.value).toBeUndefined();
  });
});
