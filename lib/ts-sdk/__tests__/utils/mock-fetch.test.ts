import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse, setupServer } from "./mock-fetch";

// Define handlers - same pattern as MSW
const handlers = [
  http.get("/opportunities/:id", ({ params }) => {
    return HttpResponse.json({ id: params.id, title: "Test Grant" });
  }),
  http.get("/opportunities", () => {
    return HttpResponse.json({ data: [{ id: "opp-1" }, { id: "opp-2" }] });
  }),
  http.post("/opportunities", async ({ request }) => {
    const body = (await request.json()) as { title: string };
    return HttpResponse.json({ id: "new-opp", title: body.title }, { status: 201 });
  }),
];

// Create server - same pattern as MSW
const server = setupServer(...handlers);

describe("mock-fetch (MSW-like API)", () => {
  // Lifecycle - same pattern as MSW
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("http.get", () => {
    it("handles GET with path parameters", async () => {
      const response = await fetch("https://api.example.org/opportunities/opp-123");
      const data = (await response.json()) as { id: string; title: string };

      expect(response.status).toBe(200);
      expect(data.id).toBe("opp-123");
      expect(data.title).toBe("Test Grant");
    });

    it("handles GET without parameters", async () => {
      const response = await fetch("https://api.example.org/opportunities");
      const data = (await response.json()) as { data: Array<{ id: string }> };

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
    });
  });

  describe("http.post", () => {
    it("handles POST with request body", async () => {
      const response = await fetch("https://api.example.org/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Grant" }),
      });
      const data = (await response.json()) as { id: string; title: string };

      expect(response.status).toBe(201);
      expect(data.id).toBe("new-opp");
      expect(data.title).toBe("New Grant");
    });
  });

  describe("server.use (runtime handlers)", () => {
    it("allows overriding handlers for specific tests", async () => {
      // Override the default handler for this test only
      server.use(
        http.get("/opportunities/:id", () => {
          return HttpResponse.json({ error: "Server error" }, { status: 500 });
        })
      );

      const response = await fetch("https://api.example.org/opportunities/opp-123");

      expect(response.status).toBe(500);
    });

    it("resets to original handlers after resetHandlers()", async () => {
      // The previous test's override should be gone after resetHandlers()
      const response = await fetch("https://api.example.org/opportunities/opp-123");
      const data = (await response.json()) as { id: string };

      expect(response.status).toBe(200);
      expect(data.id).toBe("opp-123");
    });
  });

  describe("unhandled requests", () => {
    it("returns 404 for unmatched routes", async () => {
      const response = await fetch("https://api.example.org/unknown-endpoint");

      expect(response.status).toBe(404);
    });
  });
});
