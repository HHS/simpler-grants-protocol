import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse, setupServer, createPaginatedHandler } from "../utils/mock-fetch";
import { Client, Auth } from "../../src/client";

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
  });
});
