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
// Mock server and default client setup
// =============================================================================

const BASE_URL = "https://api.example.org";
const server = setupServer();
const defaultClient = new Client({ baseUrl: BASE_URL });

describe("Client", () => {
  // =============================================================================
  // Client constructor
  // =============================================================================

  describe("constructor", () => {
    it("creates a client with minimal config", () => {
      expect(defaultClient).toBeInstanceOf(Client);
      expect(defaultClient.getConfig().baseUrl).toBe(BASE_URL);
    });

    it("exposes opportunities namespace", () => {
      expect(defaultClient.opportunities).toBeDefined();
    });

    it("accepts auth configuration", () => {
      const client = new Client({
        baseUrl: BASE_URL,
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
        baseUrl: BASE_URL,
        timeout: 5000,
        pageSize: 50,
        maxItems: 500,
      });
      const config = client.getConfig();

      expect(config.baseUrl).toBe(BASE_URL);
      expect(config.timeout).toBe(5000);
      expect(config.pageSize).toBe(50);
      expect(config.maxItems).toBe(500);
    });

    it("returns a copy of the config rather a shared reference", () => {
      const config1 = defaultClient.getConfig();
      const config2 = defaultClient.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  // =============================================================================
  // Client.get
  // =============================================================================

  describe("get", () => {
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it("makes a GET request to the specified path", async () => {
      let capturedMethod: string | undefined;

      server.use(
        http.get("/test-resource", ({ request }) => {
          capturedMethod = request.method;
          return HttpResponse.json({ data: "test" });
        })
      );

      const response = await defaultClient.get("/test-resource");

      expect(capturedMethod).toBe("GET");
      expect(response.ok).toBe(true);
    });

    it("appends query params to the URL", async () => {
      let capturedUrl: string | undefined;

      server.use(
        http.get("/test-resource", ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ data: "test" });
        })
      );

      await defaultClient.get("/test-resource", {
        params: { page: 2, pageSize: 10, active: true },
      });

      const url = new URL(capturedUrl!);
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("pageSize")).toBe("10");
      expect(url.searchParams.get("active")).toBe("true");
    });

    it("works without params", async () => {
      let capturedUrl: string | undefined;

      server.use(
        http.get("/test-resource", ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ data: "test" });
        })
      );

      await defaultClient.get("/test-resource");

      const url = new URL(capturedUrl!);
      expect(url.search).toBe("");
    });
  });

  // =============================================================================
  // Client.post
  // =============================================================================

  describe("post", () => {
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it("makes a POST request with JSON body", async () => {
      let capturedMethod: string | undefined;
      let capturedBody: unknown;

      server.use(
        http.post("/test-resource", async ({ request }) => {
          capturedMethod = request.method;
          capturedBody = await request.json();
          return HttpResponse.json({ data: "created" });
        })
      );

      const response = await defaultClient.post("/test-resource", {
        name: "Test",
        value: 123,
      });

      expect(capturedMethod).toBe("POST");
      expect(capturedBody).toEqual({ name: "Test", value: 123 });
      expect(response.ok).toBe(true);
    });

    it("handles empty body", async () => {
      let capturedBody: unknown;

      server.use(
        http.post("/test-resource", async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ data: "created" });
        })
      );

      await defaultClient.post("/test-resource", {});

      expect(capturedBody).toEqual({});
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

      const result = await defaultClient.fetchMany("/test-items", { pageSize: 3 });

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

      const result = await defaultClient.fetchMany("/test-items", { pageSize: 5, maxItems: 12 });

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
        baseUrl: BASE_URL,
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

      const result = await defaultClient.fetchMany("/test-items", { pageSize: 3, maxItems: 100 });

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

      const result = await defaultClient.fetchMany("/test-items", { pageSize: 5, maxItems: 100 });

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

      const result = await defaultClient.fetchMany("/test-items", { pageSize: 3, maxItems: 100 });

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

      await expect(defaultClient.fetchMany("/test-items", { pageSize: 5 })).rejects.toThrow("500");
    });

    it("calls parseItem for each item when provided", async () => {
      const parseItemCalls: unknown[] = [];

      server.use(
        http.get(
          "/test-items",
          createPaginatedHandler({
            items: generateMockItems(3),
            defaultPageSize: 10,
          })
        )
      );

      const result = await defaultClient.fetchMany<{ id: string; name: string; parsed: true }>(
        "/test-items",
        {
          parseItem: item => {
            parseItemCalls.push(item);
            return { ...(item as { id: string; name: string }), parsed: true };
          },
        }
      );

      expect(parseItemCalls).toHaveLength(3);
      expect(result.items).toHaveLength(3);
      expect(result.items[0].parsed).toBe(true);
      expect(result.items[1].parsed).toBe(true);
      expect(result.items[2].parsed).toBe(true);
    });

    it("throws when parseItem throws (validation failure)", async () => {
      server.use(
        http.get(
          "/test-items",
          createPaginatedHandler({
            items: generateMockItems(3),
            defaultPageSize: 10,
          })
        )
      );

      await expect(
        defaultClient.fetchMany("/test-items", {
          parseItem: () => {
            throw new Error("Validation failed");
          },
        })
      ).rejects.toThrow("Validation failed");
    });
  });
});
