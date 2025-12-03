import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse, setupServer } from "../utils/mock-fetch";
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
  });
});
