import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse, setupServer, createPaginatedHandler } from "../utils/mock-fetch";
import { Client, Auth } from "../../src/client";

// =============================================================================
// Mock data helpers
// =============================================================================

const createMockItem = (id: number) => ({
  id: `item-${id}`,
  name: `Item ${id}`,
});

const generateMockItems = (count: number) => {
  const items = [];
  for (let i = 1; i <= count; i++) {
    items.push(createMockItem(i));
  }
  return items;
};

// =============================================================================
// Mock server setup
// =============================================================================

const server = setupServer();

describe("Client", () => {
  // =============================================================================
  // Client constructor
  // =============================================================================

  describe("constructor", () => {
    it("creates a client with minimal config", () => {
      const client = new Client({ baseUrl: "https://api.example.org" });

      expect(client).toBeInstanceOf(Client);
      expect(client.getConfig().baseUrl).toBe("https://api.example.org");
    });

    it("exposes opportunities namespace", () => {
      const client = new Client({ baseUrl: "https://api.example.org" });

      expect(client.opportunities).toBeDefined();
    });

    it("uses Auth.none() by default", () => {
      const client = new Client({ baseUrl: "https://api.example.org" });

      // Client should be created without errors when no auth is provided
      expect(client).toBeInstanceOf(Client);
    });

    it("accepts auth configuration", () => {
      const client = new Client({
        baseUrl: "https://api.example.org",
        auth: Auth.bearer("test-token"),
      });

      expect(client).toBeInstanceOf(Client);
    });
  });

  // =============================================================================
  // Client.getConfig
  // =============================================================================

  describe("getConfig", () => {
    it("returns resolved configuration", () => {
      const client = new Client({
        baseUrl: "https://api.example.org",
        timeout: 5000,
        pageSize: 50,
        maxItems: 500,
      });
      const config = client.getConfig();

      expect(config.baseUrl).toBe("https://api.example.org");
      expect(config.timeout).toBe(5000);
      expect(config.pageSize).toBe(50);
      expect(config.maxItems).toBe(500);
    });

    it("returns a copy of the config rather a shared reference", () => {
      const client = new Client({ baseUrl: "https://api.example.org" });
      const config1 = client.getConfig();
      const config2 = client.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  // =============================================================================
  // Client.fetchMany (auto-pagination)
  // =============================================================================

  describe("fetchMany", () => {
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it("fetches all items across multiple pages", async () => {
      let requestCount = 0;

      server.use(
        http.get(
          "/test-items",
          createPaginatedHandler({
            items: generateMockItems(7),
            defaultPageSize: 3,
            onRequest: () => requestCount++,
          })
        )
      );

      const client = new Client({ baseUrl: "https://api.example.org" });
      const result = await client.fetchMany("/test-items", { pageSize: 3 });

      // Should make 3 requests (3 + 3 + 1 = 7 items)
      expect(requestCount).toBe(3);
      expect(result.items).toHaveLength(7);
      expect(result.paginationInfo.totalItems).toBe(7);
    });

    it("respects maxItems parameter", async () => {
      let requestCount = 0;

      server.use(
        http.get(
          "/test-items",
          createPaginatedHandler({
            items: generateMockItems(20),
            defaultPageSize: 5,
            onRequest: () => requestCount++,
          })
        )
      );

      const client = new Client({ baseUrl: "https://api.example.org" });
      const result = await client.fetchMany("/test-items", { pageSize: 5, maxItems: 12 });

      // Should stop after getting 12 items (3 pages: 5 + 5 + 2)
      expect(requestCount).toBe(3);
      expect(result.items).toHaveLength(12);
    });

    it("uses client default maxItems when not specified in options", async () => {
      let requestCount = 0;

      server.use(
        http.get(
          "/test-items",
          createPaginatedHandler({
            items: generateMockItems(15),
            defaultPageSize: 5,
            onRequest: () => requestCount++,
          })
        )
      );

      // Client with maxItems = 8
      const client = new Client({
        baseUrl: "https://api.example.org",
        maxItems: 8,
      });
      const result = await client.fetchMany("/test-items", { pageSize: 5 });

      // Should stop after getting 8 items (2 pages: 5 + 3)
      expect(requestCount).toBe(2);
      expect(result.items).toHaveLength(8);
    });

    it("stops when maxItems exceeds total available items", async () => {
      // Only 5 items available, but maxItems is 100
      let requestCount = 0;

      server.use(
        http.get(
          "/test-items",
          createPaginatedHandler({
            items: generateMockItems(5),
            defaultPageSize: 3,
            onRequest: () => requestCount++,
          })
        )
      );

      const client = new Client({ baseUrl: "https://api.example.org" });
      const result = await client.fetchMany("/test-items", { pageSize: 3, maxItems: 100 });

      // Should stop after 2 pages because there are only 5 items total
      // (not keep requesting pages indefinitely)
      expect(requestCount).toBe(2);
      expect(result.items).toHaveLength(5);
      expect(result.paginationInfo.totalItems).toBe(5);
    });

    it("stops when receiving an empty page", async () => {
      let requestCount = 0;

      server.use(
        http.get("/test-items", ({ url }) => {
          requestCount++;
          const urlObj = new URL(url);
          const page = parseInt(urlObj.searchParams.get("page") || "1");
          const pageSize = parseInt(urlObj.searchParams.get("pageSize") || "5");

          // Return items only on page 1, then empty pages
          const items = page === 1 ? generateMockItems(3) : [];

          return HttpResponse.json({
            status: 200,
            message: "Success",
            items,
            paginationInfo: {
              page,
              pageSize,
              totalItems: 3,
              totalPages: 1,
            },
          });
        })
      );

      const client = new Client({ baseUrl: "https://api.example.org" });
      const result = await client.fetchMany("/test-items", { pageSize: 5, maxItems: 100 });

      // Should stop after page 1 because items.length < pageSize
      expect(requestCount).toBe(1);
      expect(result.items).toHaveLength(3);
    });

    it("stops based on totalPages from pagination info", async () => {
      let requestCount = 0;

      server.use(
        http.get(
          "/test-items",
          createPaginatedHandler({
            items: generateMockItems(6),
            defaultPageSize: 3,
            onRequest: () => requestCount++,
          })
        )
      );

      const client = new Client({ baseUrl: "https://api.example.org" });
      const result = await client.fetchMany("/test-items", { pageSize: 3, maxItems: 100 });

      // Should stop after 2 pages because totalPages = 2
      expect(requestCount).toBe(2);
      expect(result.items).toHaveLength(6);
    });

    it("throws on HTTP error during pagination", async () => {
      let requestCount = 0;

      server.use(
        http.get("/test-items", () => {
          requestCount++;
          if (requestCount === 2) {
            return HttpResponse.json({ error: "Server error" }, { status: 500 });
          }

          return HttpResponse.json({
            status: 200,
            message: "Success",
            items: generateMockItems(5),
            paginationInfo: {
              page: requestCount,
              pageSize: 5,
              totalItems: 15,
              totalPages: 3,
            },
          });
        })
      );

      const client = new Client({ baseUrl: "https://api.example.org" });

      await expect(client.fetchMany("/test-items", { pageSize: 5 })).rejects.toThrow("500");
    });
  });
});
