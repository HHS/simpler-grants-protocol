import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { z } from "zod";
import { http, HttpResponse, setupServer } from "../utils/mock-fetch";
import { definePlugin, F, FilterError } from "../../src/extensions";
import { Auth, Awards, Client } from "../../src/client";
import type {
  AwardCustomFilterBag,
  AwardSearchOptions,
  CustomFilterBag,
  ListResult,
} from "../../src/client";
import { AwardBaseSchema, OpportunityBaseSchema } from "../../src/schemas";
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

  it("passes auth through to the underlying transport", async () => {
    let capturedAuth: string | null = null;

    server.use(
      http.get("/common-grants/opportunities/:id", ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        return HttpResponse.json({ status: 200, message: "Success", data: mockOpp });
      })
    );

    const client = plugin.getClient({
      baseUrl: "https://api.example.org",
      auth: Auth.bearer("test-token"),
    });
    await client.opportunities.get(mockOpp.id);

    expect(capturedAuth).toBe("Bearer test-token");
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

  it("binds award filter routes for typed classification and fail-fast validation", async () => {
    const awardPlugin = definePlugin({
      routes: {
        awards: {
          search: {
            filters: {
              recipientRegion: { filterType: "stringArray" },
            },
          },
        },
      },
      meta: { name: "award adapter", sourceSystem: "awards.example" },
    } as const);
    type AwardRoutes = NonNullable<typeof awardPlugin.routes>;

    const registeredAndAdHoc = {
      status: F.in(["awarded"]),
      recipientRegion: F.in(["US-CA"]),
      legacyAwardCode: F.eq("LEGACY-42"),
      "gov.usaspending@recipientType": F.in(["nonprofit"]),
    } satisfies AwardCustomFilterBag<AwardRoutes>;
    const options = {
      page: 1,
      filters: registeredAndAdHoc,
    } satisfies AwardSearchOptions<typeof AwardBaseSchema, AwardRoutes>;
    const requestBodies: unknown[] = [];

    server.use(
      http.post("/common-grants/awards/search", async ({ request }) => {
        requestBodies.push(await request.json());
        return HttpResponse.json({
          status: 200,
          message: "Success",
          items: [],
          paginationInfo: { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
          sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
          filterInfo: { filters: {} },
        });
      })
    );

    const client = awardPlugin.getClient({ baseUrl: "https://api.example.org" });
    await client.awards.search(options);
    await client.awards.search({ page: 1, filters: {} });

    expect(requestBodies).toEqual([
      {
        filters: {
          status: F.in(["awarded"]),
          customFilters: {
            recipientRegion: F.in(["US-CA"]),
            legacyAwardCode: F.eq("LEGACY-42"),
            "gov.usaspending@recipientType": F.in(["nonprofit"]),
          },
        },
        pagination: { page: 1 },
      },
      { filters: {}, pagination: { page: 1 } },
    ]);

    const requestCountBeforeInvalidFilters = requestBodies.length;
    const searchWithUncheckedFilters = (filters: Record<string, unknown>) =>
      client.awards.search({
        page: 1,
        filters: filters as unknown as AwardCustomFilterBag<AwardRoutes>,
      });
    const invalidFilters = [
      { status: F.eq("awarded") },
      { recipientRegion: F.eq("US-CA") },
      { unregistered: { operator: "in", value: "not-an-array" } },
    ];

    for (const filters of invalidFilters) {
      await expect(searchWithUncheckedFilters(filters)).rejects.toBeInstanceOf(FilterError);
    }
    expect(requestBodies).toHaveLength(requestCountBeforeInvalidFilters);

    expect(() =>
      definePlugin({
        routes: {
          awards: {
            search: { filters: { mystery: { filterType: "unknown" } } },
          },
        },
      } as never)
    ).toThrow(FilterError);
    expect(() =>
      definePlugin({
        routes: {
          awards: {
            list: { filters: { recipientRegion: { filterType: "stringArray" } } },
          },
        },
      } as never)
    ).toThrow(FilterError);

    const collidingRoutes = {
      awards: {
        search: { filters: { status: { filterType: "stringArray" } } },
      },
    } as const;
    expect(
      () =>
        new Awards(
          new Client({ baseUrl: "https://api.example.org" }),
          AwardBaseSchema,
          collidingRoutes
        )
    ).toThrow(FilterError);
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

  it("definePlugin accepts an explicitly-undefined resource route value", () => {
    expect(() => definePlugin({ routes: { opportunities: undefined } } as const)).not.toThrow();
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
