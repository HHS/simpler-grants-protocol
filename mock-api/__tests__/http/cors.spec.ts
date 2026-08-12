import { describe, it, expect, vi } from "vitest";
import worker from "../../src/index";
import {
  CANONICAL_OPPORTUNITY_ID,
  RESERVED_MISSING_OPPORTUNITY_ID,
  SUPPORTED_VERSIONS,
} from "../../src/data/fixtures";
import { withCors } from "../../src/http/cors";
import { withErrorBoundary } from "../../src/http/envelope";

/** Builds `https://mock.example/v{version}/common-grants/opportunities{suffix}`. */
function opportunitiesUrl(version: string, suffix = ""): string {
  return `https://mock.example/v${version}/common-grants/opportunities${suffix}`;
}

describe("CORS", () => {
  describe("success responses carry Access-Control-Allow-Origin: *", () => {
    it.each(SUPPORTED_VERSIONS)("list route, for v%s", async version => {
      const response = await worker.fetch(new Request(opportunitiesUrl(version)));

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("detail route", async () => {
      const response = await worker.fetch(
        new Request(opportunitiesUrl("0.3.0", `/${CANONICAL_OPPORTUNITY_ID}`))
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("search route", async () => {
      const response = await worker.fetch(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("error responses carry Access-Control-Allow-Origin: * too", () => {
    it("400 for a malformed (non-UUID) detail oppId", async () => {
      const response = await worker.fetch(new Request(opportunitiesUrl("0.3.0", "/not-a-uuid")));

      expect(response.status).toBe(400);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("404 for a well-formed but unknown detail oppId", async () => {
      const response = await worker.fetch(
        new Request(opportunitiesUrl("0.3.0", `/${RESERVED_MISSING_OPPORTUNITY_ID}`))
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("400 for a malformed search request body", async () => {
      const response = await worker.fetch(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: "{not valid json",
          headers: { "Content-Type": "application/json" },
        })
      );

      expect(response.status).toBe(400);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("404 for an unsupported protocol version prefix", async () => {
      const response = await worker.fetch(
        new Request("https://mock.example/v9.9.9/common-grants/opportunities")
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("404 for an unmatched route", async () => {
      const response = await worker.fetch(new Request("https://mock.example/nonexistent"));

      expect(response.status).toBe(404);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("200 health route", async () => {
      const response = await worker.fetch(new Request("https://mock.example/"));

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("OPTIONS preflight", () => {
    const preflightTargets: Array<[string, string]> = [
      ["list", opportunitiesUrl("0.3.0")],
      ["detail", opportunitiesUrl("0.3.0", `/${CANONICAL_OPPORTUNITY_ID}`)],
      ["search", opportunitiesUrl("0.3.0", "/search")],
      ["health", "https://mock.example/"],
      ["an unmatched path", "https://mock.example/nonexistent"],
    ];

    it.each(preflightTargets)(
      "is answered with preflight headers and no body, for %s",
      async (_name, url) => {
        const response = await worker.fetch(new Request(url, { method: "OPTIONS" }));

        // 204 is the conventional preflight answer; allowing 200 too so this
        // doesn't fail on that choice alone.
        expect([200, 204]).toContain(response.status);

        expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");

        const allowMethods = (
          response.headers.get("Access-Control-Allow-Methods") ?? ""
        ).toLowerCase();
        expect(allowMethods).toContain("get");
        expect(allowMethods).toContain("post");
        expect(allowMethods).toContain("options");

        const allowHeaders = (
          response.headers.get("Access-Control-Allow-Headers") ?? ""
        ).toLowerCase();
        expect(allowHeaders).toContain("content-type");
        expect(allowHeaders).toContain("x-api-key");
        expect(allowHeaders).toContain("authorization");

        const text = await response.text();
        expect(text).toBe("");
      }
    );

    it("answers a browser-shaped preflight (Origin + Access-Control-Request-Method/Headers) the same way", async () => {
      const response = await worker.fetch(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "OPTIONS",
          headers: {
            Origin: "https://commongrants.org",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-api-key",
          },
        })
      );

      expect([200, 204]).toContain(response.status);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");

      const allowMethods = (
        response.headers.get("Access-Control-Allow-Methods") ?? ""
      ).toLowerCase();
      expect(allowMethods).toContain("get");
      expect(allowMethods).toContain("post");
      expect(allowMethods).toContain("options");

      const allowHeaders = (
        response.headers.get("Access-Control-Allow-Headers") ?? ""
      ).toLowerCase();
      expect(allowHeaders).toContain("content-type");
      expect(allowHeaders).toContain("x-api-key");
      expect(allowHeaders).toContain("authorization");

      const text = await response.text();
      expect(text).toBe("");
    });
  });

  describe("SDK auth headers on an actual (non-preflight) request", () => {
    it("a search request carrying X-API-Key and Authorization still returns 200 with the CORS header", async () => {
      const response = await worker.fetch(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: JSON.stringify({}),
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": "test-api-key",
            Authorization: "Bearer test-token",
          },
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("a search request with no auth headers (Auth.none()) still returns 200 with the CORS header", async () => {
      const response = await worker.fetch(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  // A response that never gets built can't carry CORS headers, so an exception
  // thrown inside routing costs the caller more than a 500: the browser reports
  // an opaque CORS failure and the real cause never reaches the console. These
  // pin the last-resort handler that keeps a thrown error on the CORS path.
  describe("unexpected failures stay on the CORS path", () => {
    it("answers a JSON body that is valid but not an object without throwing, and with the CORS header", async () => {
      const response = await worker.fetch(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: "null",
          headers: { "Content-Type": "application/json" },
        })
      );

      expect(response.status).toBe(400);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    // No request can currently make `route()` throw, so this exercises the
    // composition `src/index.ts` applies — `withCors(await withErrorBoundary(…))`
    // — against a thunk that does. Without the boundary the throw escapes
    // `fetch()` entirely and the caller gets no response at all, CORS or not.
    it("turns a throw inside routing into a 500 envelope that still carries the CORS header", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const response = withCors(
          await withErrorBoundary(() => {
            throw new Error("boom");
          })
        );

        expect(response.status).toBe(500);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");

        const body = (await response.json()) as {
          status: number;
          message: string;
          errors: unknown[];
        };

        expect(body.status).toBe(500);
        expect(typeof body.message).toBe("string");
        expect(Array.isArray(body.errors)).toBe(true);
        expect(body.errors.length).toBeGreaterThan(0);
      } finally {
        consoleError.mockRestore();
      }
    });
  });
});
