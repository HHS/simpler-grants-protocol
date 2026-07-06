import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { z } from "zod";
import { http, HttpResponse, setupServer, createPaginatedHandler } from "../utils/mock-fetch";
import { Client, Auth, Opportunities, BatchParseError } from "../../src/client";
import type { CustomFilterBag } from "../../src/client";
import { OpportunityBaseSchema } from "../../src/schemas";
import { withCustomFields, F, FilterError, validateRoutes } from "../../src/extensions";
import type { PluginRoutes } from "../../src/extensions";
import { CustomFieldType } from "../../src/constants";

// =============================================================================
// Custom schema for testing withCustomFields support
// =============================================================================

const OpportunityWithLegacyIdSchema = withCustomFields(OpportunityBaseSchema, {
  legacyId: {
    fieldType: CustomFieldType.integer,
    value: z.number().int(),
    description: "Maps to the opportunity_id in the legacy system",
  },
} as const);

// =============================================================================
// Mock API Handlers
// =============================================================================

// Helper to create valid opportunity data matching OpportunityBaseSchema
const createMockOpportunity = (id: string, title: string, statusValue: string) => ({
  id,
  title,
  status: { value: statusValue },
  description: "A grant for community development projects",
  createdAt: "2024-01-15T10:30:00Z",
  lastModifiedAt: "2024-06-01T14:22:00Z",
});

const createMockOpportunityWithCustomFields = (
  id: string,
  title: string,
  statusValue: string,
  legacyIdValue: number
) => ({
  ...createMockOpportunity(id, title, statusValue),
  customFields: {
    legacyId: {
      name: "legacyId",
      fieldType: "integer",
      value: legacyIdValue,
      description: "Maps to the opportunity_id in the legacy system",
    },
  },
});

// Valid UUIDs for testing
const OPP_UUID_1 = "550e8400-e29b-41d4-a716-446655440001";
const OPP_UUID_2 = "550e8400-e29b-41d4-a716-446655440002";
const NOT_FOUND_UUID = "550e8400-e29b-41d4-a716-446655440404";

// Generate a larger set of mock opportunities for pagination tests
const generateMockOpportunities = (count: number) => {
  const opportunities = [];
  for (let i = 1; i <= count; i++) {
    const id = `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, "0")}`;
    opportunities.push(
      createMockOpportunity(id, `Grant ${i}`, i % 2 === 0 ? "open" : "forecasted")
    );
  }
  return opportunities;
};

const server = setupServer(
  // GET /common-grants/opportunities/:id
  http.get("/common-grants/opportunities/:id", ({ params }) => {
    if (params.id === NOT_FOUND_UUID) {
      return HttpResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }
    // Return response matching OkSchema(OpportunityBaseSchema)
    return HttpResponse.json({
      status: 200,
      message: "Success",
      data: createMockOpportunity(params.id as string, "Community Development Grant", "open"),
    });
  }),

  // GET /common-grants/opportunities
  http.get("/common-grants/opportunities", () => {
    // Return response matching PaginatedSchema(OpportunityBaseSchema)
    return HttpResponse.json({
      status: 200,
      message: "Success",
      items: [
        createMockOpportunity(OPP_UUID_1, "Grant A", "open"),
        createMockOpportunity(OPP_UUID_2, "Grant B", "forecasted"),
      ],
      paginationInfo: {
        page: 1,
        pageSize: 25,
        totalItems: 2,
        totalPages: 1,
      },
    });
  })
);

// =============================================================================
// Test fixtures
// =============================================================================

/** Shared test client instance */
const client = new Client({
  baseUrl: "https://api.example.org",
  auth: Auth.bearer("test-token"),
});

/** Opportunities bound to routes over a fresh authed client (the plugin.getClient() shape). */
const makeRoutedOpportunities = (routes: PluginRoutes) =>
  new Opportunities(
    new Client({ baseUrl: "https://api.example.org", auth: Auth.bearer("test-token") }),
    undefined,
    routes
  );

// =============================================================================
// Opportunities resource tests
// =============================================================================

describe("Opportunities", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  // =============================================================================
  // Opportunities.get
  // =============================================================================

  describe("get", () => {
    it("fetches an opportunity by ID", async () => {
      const opp = await client.opportunities.get(OPP_UUID_1);

      expect(opp.id).toBe(OPP_UUID_1);
      expect(opp.title).toBe("Community Development Grant");
      expect(opp.status.value).toBe("open");
    });

    it("throws on 404", async () => {
      await expect(client.opportunities.get(NOT_FOUND_UUID)).rejects.toThrow(
        `Failed to get opportunity ${NOT_FOUND_UUID}: 404`
      );
    });

    it("handles server errors", async () => {
      server.use(
        http.get("/common-grants/opportunities/:id", () => {
          return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
        })
      );

      await expect(client.opportunities.get(OPP_UUID_1)).rejects.toThrow("500");
    });

    it("parses get result with a custom schema", async () => {
      server.use(
        http.get("/common-grants/opportunities/:id", ({ params }) => {
          return HttpResponse.json({
            status: 200,
            message: "Success",
            data: createMockOpportunityWithCustomFields(
              params.id as string,
              "Custom Fields Grant",
              "open",
              42
            ),
          });
        })
      );

      const opp = await client.opportunities.get(OPP_UUID_1, {
        schema: OpportunityWithLegacyIdSchema,
      });

      expect(opp.id).toBe(OPP_UUID_1);
      expect(opp.title).toBe("Custom Fields Grant");
      expect(opp.customFields?.legacyId?.value).toBe(42);
      expect(opp.customFields?.legacyId?.fieldType).toBe("integer");
    });
  });

  // =============================================================================
  // Opportunities.list
  // =============================================================================

  describe("list", () => {
    it("fetches a list of opportunities", async () => {
      const result = await client.opportunities.list();

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(OPP_UUID_1);
      expect(result.items[1].id).toBe(OPP_UUID_2);
      expect(result.paginationInfo.totalItems).toBe(2);
    });

    it("supports pagination parameters", async () => {
      // This test verifies the client doesn't error with pagination params
      // A more complete test would verify the query params are sent correctly
      const result = await client.opportunities.list({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(2);
    });

    // =========================================================================
    // Single page (explicit page parameter)
    // =========================================================================

    it("fetches a single page when page is explicitly specified", async () => {
      // Create mock data for 3 pages (5 items total, pageSize 2)
      const allOpportunities = generateMockOpportunities(5);
      let requestCount = 0;

      server.use(
        http.get(
          "/common-grants/opportunities",
          createPaginatedHandler({
            items: allOpportunities,
            defaultPageSize: 2,
            onRequest: () => requestCount++,
          })
        )
      );

      // Request page 2 explicitly - should NOT auto-paginate
      const result = await client.opportunities.list({ page: 2, pageSize: 2 });

      // Should only make 1 request (no auto-pagination)
      expect(requestCount).toBe(1);

      // Should return only page 2 items
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(allOpportunities[2].id);
      expect(result.items[1].id).toBe(allOpportunities[3].id);
      expect(result.paginationInfo.page).toBe(2);
    });

    // =========================================================================
    // Auto-pagination
    // =========================================================================

    it("auto-paginates across multiple pages when no page is specified", async () => {
      let requestCount = 0;

      server.use(
        http.get(
          "/common-grants/opportunities",
          createPaginatedHandler({
            items: generateMockOpportunities(5),
            defaultPageSize: 2,
            onRequest: () => requestCount++,
          })
        )
      );

      // Request without page - should auto-paginate
      const result = await client.opportunities.list({ pageSize: 2 });

      // Should make 3 requests (pages 1, 2, 3)
      expect(requestCount).toBe(3);

      // Should return all 5 items aggregated
      expect(result.items).toHaveLength(5);
      expect(result.paginationInfo.totalItems).toBe(5);
    });

    it("respects maxItems limit during auto-pagination", async () => {
      let requestCount = 0;

      server.use(
        http.get(
          "/common-grants/opportunities",
          createPaginatedHandler({
            items: generateMockOpportunities(10),
            defaultPageSize: 2,
            onRequest: () => requestCount++,
          })
        )
      );

      // Request with maxItems = 5 and pageSize = 2
      const result = await client.opportunities.list({ pageSize: 2, maxItems: 5 });

      // Should stop after collecting 5 items (3 pages: 2 + 2 + 1)
      expect(requestCount).toBe(3);
      expect(result.items).toHaveLength(5);
    });

    it("parses list results with a custom schema", async () => {
      server.use(
        http.get("/common-grants/opportunities", () => {
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [
              createMockOpportunityWithCustomFields(OPP_UUID_1, "Grant A", "open", 100),
              createMockOpportunityWithCustomFields(OPP_UUID_2, "Grant B", "forecasted", 200),
            ],
            paginationInfo: {
              page: 1,
              pageSize: 25,
              totalItems: 2,
              totalPages: 1,
            },
          });
        })
      );

      const result = await client.opportunities.list({
        page: 1,
        schema: OpportunityWithLegacyIdSchema,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].customFields?.legacyId?.value).toBe(100);
      expect(result.items[1].customFields?.legacyId?.value).toBe(200);
    });
  });

  // =============================================================================
  // Opportunities.search
  // =============================================================================

  describe("search", () => {
    it("searches opportunities with query and statuses filter", async () => {
      let capturedBody: unknown;

      server.use(
        http.post("/common-grants/opportunities/search", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [
              createMockOpportunity(OPP_UUID_1, "Education Grant", "open"),
              createMockOpportunity(OPP_UUID_2, "Research Grant", "forecasted"),
            ],
            paginationInfo: {
              page: 1,
              pageSize: 25,
              totalItems: 2,
              totalPages: 1,
            },
            sortInfo: {
              sortBy: "lastModifiedAt",
              sortOrder: "desc",
            },
            filterInfo: {
              filters: {
                status: {
                  operator: "in",
                  value: ["open", "forecasted"],
                },
              },
            },
          });
        })
      );

      const result = await client.opportunities.search({
        query: "education",
        statuses: ["open", "forecasted"],
      });

      // Verify request body includes search and filters (pagination is added automatically)
      expect(capturedBody).toMatchObject({
        search: "education",
        filters: {
          status: {
            operator: "in",
            value: ["open", "forecasted"],
          },
        },
      });

      // Verify response structure matches OpportunitiesFilteredResponse
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe("Education Grant");
      expect(result.paginationInfo.totalItems).toBe(2);
      expect(result.sortInfo.sortBy).toBe("lastModifiedAt");
      expect(result.filterInfo?.filters.status).toEqual({
        operator: "in",
        value: ["open", "forecasted"],
      });
    });

    it("classifies a flat custom-filter bag into the OppFilters body when routes are supplied", async () => {
      let capturedBody: Record<string, unknown> | undefined;

      server.use(
        http.post("/common-grants/opportunities/search", async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [createMockOpportunity(OPP_UUID_1, "Conservation Grant", "open")],
            paginationInfo: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
            sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
            filterInfo: { filters: {} },
          });
        })
      );

      // A plugin registering one custom filter on opportunities.search.
      const routes: PluginRoutes = {
        opportunities: { search: { filters: { agency: { filterType: "stringArray" } } } },
      };

      // routes are resource-bound: supplied once at construction, not per call
      // (plugin.getClient() does this wiring for consumers).
      const routedOpps = makeRoutedOpportunities(routes);

      await routedOpps.search({
        filters: {
          status: F.in(["open"]), // default field → top-level
          agency: F.in(["HHS", "NSF"]), // registered custom → customFilters
          legacyTag: F.eq("conservation-2024"), // ad-hoc → customFilters passthrough
        },
      });

      // Default field stays top-level; registered + ad-hoc land under customFilters.
      expect(capturedBody?.filters).toMatchObject({
        status: { operator: "in", value: ["open"] },
        customFilters: {
          agency: { operator: "in", value: ["HHS", "NSF"] },
          legacyTag: { operator: "eq", value: "conservation-2024" },
        },
      });
      // A default field must NOT be duplicated into customFilters.
      const customFilters = (capturedBody?.filters as { customFilters?: Record<string, unknown> })
        .customFilters;
      expect(customFilters).not.toHaveProperty("status");
    });

    it("throws FilterError when status is given via both the shorthand and filters", async () => {
      // `status` given via both the `statuses` shorthand and `filters.status` is
      // a conflicting instruction: search() throws before any request is sent.
      let requested = false;

      server.use(
        http.post("/common-grants/opportunities/search", () => {
          requested = true;
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [],
            paginationInfo: { page: 1, pageSize: 25, totalItems: 0, totalPages: 1 },
            sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
            filterInfo: { filters: {} },
          });
        })
      );

      await expect(
        client.opportunities.search({
          statuses: ["open"],
          filters: { status: F.in(["closed"]) },
        })
      ).rejects.toThrow(FilterError);

      expect(requested).toBe(false);
    });

    it("rejects with FilterError on an invalid registered filter value before any request", async () => {
      // A registered stringArray filter given a non-array `between` value fails
      // categorizeFilters validation. Fail-fast: search() throws and no HTTP
      // request is made.
      let requested = false;

      server.use(
        http.post("/common-grants/opportunities/search", () => {
          requested = true;
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [],
            paginationInfo: { page: 1, pageSize: 25, totalItems: 0, totalPages: 1 },
            sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
            filterInfo: { filters: {} },
          });
        })
      );

      const routes: PluginRoutes = {
        opportunities: { search: { filters: { agency: { filterType: "stringArray" } } } },
      };
      const routedOpps = makeRoutedOpportunities(routes);

      await expect(
        routedOpps.search({
          // Wrong value family on a registered filter is a compile error too;
          // cast to exercise the runtime backstop plain-JS callers hit.
          filters: { agency: { operator: "between", value: 5 } } as unknown as CustomFilterBag<
            typeof routes
          >,
        })
      ).rejects.toThrow(FilterError);

      expect(requested).toBe(false);
    });

    it("passes the server envelope through unchanged when filterInfo is absent (auto-paginate)", async () => {
      // Auto-pagination returns the raw server envelope; the client no longer
      // injects its own filterInfo, so an absent filterInfo stays absent.
      server.use(
        http.post("/common-grants/opportunities/search", () => {
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [createMockOpportunity(OPP_UUID_1, "Conservation Grant", "open")],
            paginationInfo: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
            sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
            // No filterInfo on the response.
          });
        })
      );

      const routes: PluginRoutes = {
        opportunities: { search: { filters: { agency: { filterType: "stringArray" } } } },
      };
      const routedOpps = makeRoutedOpportunities(routes);

      const result = await routedOpps.search({
        filters: { agency: F.in(["HHS"]) },
      });

      expect(result.items).toHaveLength(1);
      expect(result.filterInfo).toBeUndefined();
    });

    it("validateRoutes throws on a default-name collision (runtime backstop)", () => {
      const badRoutes: PluginRoutes = {
        opportunities: { search: { filters: { status: { filterType: "stringArray" } } } },
      };
      expect(() => validateRoutes(badRoutes)).toThrow(FilterError);
    });

    it("throws FilterError on direct construction with invalid routes (bypassing definePlugin)", () => {
      const badRoutes: PluginRoutes = {
        opportunities: { search: { filters: { status: { filterType: "stringArray" } } } },
      };
      expect(() => makeRoutedOpportunities(badRoutes)).toThrow(FilterError);
    });

    it("passes server-returned filterInfo.errors through unmodified", async () => {
      server.use(
        http.post("/common-grants/opportunities/search", () => {
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [createMockOpportunity(OPP_UUID_1, "Conservation Grant", "open")],
            paginationInfo: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
            sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
            filterInfo: { filters: {}, errors: ["server: something was ignored"] },
          });
        })
      );

      const routes: PluginRoutes = {
        opportunities: { search: { filters: { agency: { filterType: "stringArray" } } } },
      };
      const routedOpps = makeRoutedOpportunities(routes);

      const result = await routedOpps.search({
        filters: { agency: F.in(["HHS"]) },
      });

      // filterInfo.errors carries server-returned errors only, untouched.
      expect(result.filterInfo?.errors).toEqual(["server: something was ignored"]);
    });

    it("partitions a malformed row into result.errors and keeps valid rows in items", async () => {
      const goodOpp = createMockOpportunity(OPP_UUID_1, "Conservation Grant", "open");
      const badRow = { id: "not-a-uuid", title: 42 };

      server.use(
        http.post("/common-grants/opportunities/search", () => {
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [goodOpp, badRow],
            paginationInfo: { page: 1, pageSize: 25, totalItems: 2, totalPages: 1 },
            sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
            filterInfo: { filters: {} },
          });
        })
      );

      const result = await client.opportunities.search({ page: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Conservation Grant");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].raw).toEqual(badRow);
    });

    it('rejects with BatchParseError on a malformed row under onParseError: "throw"', async () => {
      server.use(
        http.post("/common-grants/opportunities/search", () => {
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [{ id: "not-a-uuid", title: 42 }],
            paginationInfo: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
            sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
            filterInfo: { filters: {} },
          });
        })
      );

      await expect(client.opportunities.search({ page: 1, onParseError: "throw" })).rejects.toThrow(
        BatchParseError
      );
    });

    it("searches with only query parameter", async () => {
      server.use(
        http.post("/common-grants/opportunities/search", () => {
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [createMockOpportunity(OPP_UUID_1, "Community Grant", "open")],
            paginationInfo: {
              page: 1,
              pageSize: 25,
              totalItems: 1,
              totalPages: 1,
            },
            sortInfo: {
              sortBy: "lastModifiedAt",
              sortOrder: "desc",
            },
            filterInfo: {
              filters: {},
            },
          });
        })
      );

      const result = await client.opportunities.search({ query: "community" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Community Grant");
    });

    it("searches with only statuses parameter", async () => {
      server.use(
        http.post("/common-grants/opportunities/search", () => {
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [createMockOpportunity(OPP_UUID_1, "Open Grant", "open")],
            paginationInfo: {
              page: 1,
              pageSize: 25,
              totalItems: 1,
              totalPages: 1,
            },
            sortInfo: {
              sortBy: "lastModifiedAt",
              sortOrder: "desc",
            },
            filterInfo: {
              filters: {
                status: {
                  operator: "in",
                  value: ["open"],
                },
              },
            },
          });
        })
      );

      const result = await client.opportunities.search({ statuses: ["open"] });

      expect(result.items).toHaveLength(1);
      expect(result.filterInfo?.filters.status).toEqual({
        operator: "in",
        value: ["open"],
      });
    });

    it("handles server errors", async () => {
      server.use(
        http.post("/common-grants/opportunities/search", () => {
          return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
        })
      );

      await expect(client.opportunities.search({ query: "test" })).rejects.toThrow("500");
    });

    it("parses search results with a custom schema", async () => {
      server.use(
        http.post("/common-grants/opportunities/search", () => {
          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: [createMockOpportunityWithCustomFields(OPP_UUID_1, "Custom Grant", "open", 555)],
            paginationInfo: {
              page: 1,
              pageSize: 25,
              totalItems: 1,
              totalPages: 1,
            },
            sortInfo: {
              sortBy: "lastModifiedAt",
              sortOrder: "desc",
            },
            filterInfo: {
              filters: {},
            },
          });
        })
      );

      const result = await client.opportunities.search({
        query: "custom",
        schema: OpportunityWithLegacyIdSchema,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Custom Grant");
      expect(result.items[0].customFields?.legacyId?.value).toBe(555);
      expect(result.items[0].customFields?.legacyId?.fieldType).toBe("integer");
    });

    // =========================================================================
    // Single page (explicit page parameter)
    // =========================================================================

    it("fetches a single page when page is explicitly specified", async () => {
      let requestCount = 0;
      let capturedBody: Record<string, unknown> | undefined;

      server.use(
        http.post("/common-grants/opportunities/search", async ({ request }) => {
          requestCount++;
          capturedBody = (await request.json()) as Record<string, unknown>;
          const pagination = capturedBody.pagination as { page: number; pageSize?: number };
          const page = pagination?.page ?? 1;
          const pageSize = pagination?.pageSize ?? 2;

          // Simulate 5 total items across 3 pages
          const allOpportunities = generateMockOpportunities(5);
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const pageItems = allOpportunities.slice(start, end);

          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: pageItems,
            paginationInfo: {
              page,
              pageSize,
              totalItems: 5,
              totalPages: Math.ceil(5 / pageSize),
            },
            sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
            filterInfo: { filters: {} },
          });
        })
      );

      // Request page 2 explicitly - should NOT auto-paginate
      const result = await client.opportunities.search({
        query: "test",
        page: 2,
        pageSize: 2,
      });

      // Should only make 1 request (no auto-pagination)
      expect(requestCount).toBe(1);

      // Should return only page 2 items
      expect(result.items).toHaveLength(2);
      expect(result.paginationInfo.page).toBe(2);

      // Verify pagination was sent in body
      expect(capturedBody?.pagination).toEqual({ page: 2, pageSize: 2 });
    });

    // =========================================================================
    // Auto-pagination
    // =========================================================================

    it("auto-paginates across multiple pages when no page is specified", async () => {
      let requestCount = 0;

      server.use(
        http.post("/common-grants/opportunities/search", async ({ request }) => {
          requestCount++;
          const body = (await request.json()) as Record<string, unknown>;
          const pagination = body.pagination as { page: number; pageSize?: number } | undefined;
          const page = pagination?.page ?? 1;
          const pageSize = pagination?.pageSize ?? 2;

          // Simulate 5 total items
          const allOpportunities = generateMockOpportunities(5);
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const pageItems = allOpportunities.slice(start, end);

          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: pageItems,
            paginationInfo: {
              page,
              pageSize,
              totalItems: 5,
              totalPages: Math.ceil(5 / pageSize),
            },
            sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
            filterInfo: { filters: { status: { operator: "in", value: ["open"] } } },
          });
        })
      );

      // Request without page - should auto-paginate
      const result = await client.opportunities.search({
        statuses: ["open"],
        pageSize: 2,
      });

      // Should make 3 requests (pages 1, 2, 3) — metadata comes from page 1
      expect(requestCount).toBe(3);

      // Should return all 5 items aggregated
      expect(result.items).toHaveLength(5);
      expect(result.paginationInfo.totalItems).toBe(5);

      // Should preserve sortInfo and filterInfo from first page
      expect(result.sortInfo.sortBy).toBe("lastModifiedAt");
      expect(result.filterInfo?.filters.status).toEqual({
        operator: "in",
        value: ["open"],
      });
    });

    it("respects maxItems limit during auto-pagination", async () => {
      let requestCount = 0;

      server.use(
        http.post("/common-grants/opportunities/search", async ({ request }) => {
          requestCount++;
          const body = (await request.json()) as Record<string, unknown>;
          const pagination = body.pagination as { page: number; pageSize?: number } | undefined;
          const page = pagination?.page ?? 1;
          const pageSize = pagination?.pageSize ?? 2;

          // Simulate 10 total items
          const allOpportunities = generateMockOpportunities(10);
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const pageItems = allOpportunities.slice(start, end);

          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: pageItems,
            paginationInfo: {
              page,
              pageSize,
              totalItems: 10,
              totalPages: Math.ceil(10 / pageSize),
            },
            sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
            filterInfo: { filters: {} },
          });
        })
      );

      // Request with maxItems = 5 and pageSize = 2
      const result = await client.opportunities.search({
        query: "test",
        pageSize: 2,
        maxItems: 5,
      });

      // Should stop after collecting 5 items (3 pages: 2 + 2 + 1)
      expect(requestCount).toBe(3);
      expect(result.items).toHaveLength(5);
    });
  });
});
