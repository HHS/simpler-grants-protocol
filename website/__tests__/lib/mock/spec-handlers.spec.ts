import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";
import { http, HttpResponse, type HttpHandler } from "msw";
import { buildHandlersFromSpec, memoize } from "@/lib/mock/spec-handlers";
import { buildOpportunityHandlers } from "@/lib/mock/opportunities/handlers";
import { OPPORTUNITY_FIXTURES } from "@/lib/mock/opportunities/fixtures";

interface OpenApiSpec {
  paths: Record<string, unknown>;
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

function loadSpec(version: string): OpenApiSpec {
  const content = readFileSync(
    resolve(process.cwd(), `public/openapi/openapi.${version}.yaml`),
    "utf-8",
  );
  return yaml.load(content, { schema: yaml.CORE_SCHEMA }) as OpenApiSpec;
}

const OPPORTUNITIES_URL = "http://localhost/common-grants/opportunities";

describe("buildHandlersFromSpec", () => {
  const versions = ["0.1.0", "0.2.0", "0.3.0"];

  it.each(versions)(
    "yields a non-empty handler set and a matched request returns a schema-valid body for v%s",
    async (version) => {
      const spec = loadSpec(version);

      const handlers = await buildHandlersFromSpec(spec);
      expect(handlers.length).toBeGreaterThan(0);

      // The specs have no `servers:` block, so handlers match same-origin
      // RELATIVE paths (e.g. /common-grants/opportunities). In the browser MSW
      // resolves those against `location.origin`; node has no location, so we
      // supply the equivalent base via `resolutionContext.baseUrl` to exercise
      // the real (production) relative-path handler.
      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(OPPORTUNITIES_URL),
        requestId: `test-${version}`,
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(200);

      const body = (await result!.response!.json()) as Record<string, unknown>;
      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.paginationInfo).toBe("object");
    },
  );

  it("returns byte-identical bodies across two calls to the same generated (non-opportunity) handler", async () => {
    const spec = loadSpec("0.3.0");

    const handlers = await buildHandlersFromSpec(spec);
    const handler = handlers.find(
      (h) => String(h.info.path) === "/common-grants/opportunities",
    );
    expect(handler).toBeDefined();

    const firstResult = await handler!.run({
      request: new Request(OPPORTUNITIES_URL),
      requestId: "test-memoization-1",
      resolutionContext: { baseUrl: "http://localhost/" },
    });
    const secondResult = await handler!.run({
      request: new Request(OPPORTUNITIES_URL),
      requestId: "test-memoization-2",
      resolutionContext: { baseUrl: "http://localhost/" },
    });

    expect(firstResult).not.toBeNull();
    expect(secondResult).not.toBeNull();

    const firstBody = (await firstResult!.response!.json()) as Record<
      string,
      unknown
    >;
    const secondBody = (await secondResult!.response!.json()) as Record<
      string,
      unknown
    >;

    expect(JSON.stringify(secondBody)).toBe(JSON.stringify(firstBody));
  });

  it("opportunity path resolves to the hand-authored handler, not the generated one", async () => {
    const spec = loadSpec("0.3.0");
    const specHandlers = await buildHandlersFromSpec(spec);
    const opportunityHandlers = buildOpportunityHandlers("0.3.0");

    // Production order (MockPlayground.handleVersionChange): hand-authored
    // opportunity handlers registered before the generated `fromOpenApi` set,
    // so MSW's first-match-wins semantics let them override the generated
    // opportunity detail handler.
    const combinedHandlers: HttpHandler[] = [
      ...opportunityHandlers,
      ...specHandlers,
    ];

    const oppId = OPPORTUNITY_FIXTURES[0].id;
    const request = new Request(
      `http://localhost/common-grants/opportunities/${oppId}`,
    );
    const resolutionContext = { baseUrl: "http://localhost/" };

    let winner: HttpHandler | undefined;
    for (const handler of combinedHandlers) {
      const parsedResult = await handler.parse({ request, resolutionContext });
      const matches = await handler.predicate({
        request,
        parsedResult,
        resolutionContext,
      });
      if (matches) {
        winner = handler;
        break;
      }
    }

    expect(winner).toBeDefined();
    expect(opportunityHandlers).toContain(winner);
    expect(specHandlers).not.toContain(winner);
  });
});

describe("memoize", () => {
  const resolutionContext = { baseUrl: "http://localhost/" };

  it("evicts a failed request instead of replaying the failure forever", async () => {
    let calls = 0;
    const [handler] = memoize([
      http.get("/flaky", () => {
        calls += 1;
        if (calls === 1) throw new Error("resolver blew up");
        return HttpResponse.json({ calls });
      }),
    ]);

    // The failure propagates, as it would without memoization...
    await expect(
      handler.run({
        request: new Request("http://localhost/flaky"),
        requestId: "test-memoize-failure-1",
        resolutionContext,
      }),
    ).rejects.toThrow("resolver blew up");

    // ...but it isn't cached, so the same request can still succeed later.
    const retry = await handler.run({
      request: new Request("http://localhost/flaky"),
      requestId: "test-memoize-failure-2",
      resolutionContext,
    });

    expect(retry!.response?.status).toBe(200);
    expect(await retry!.response!.json()).toEqual({ calls: 2 });
  });

  it("keys the cache on the request body, not just the URL", async () => {
    let calls = 0;
    const [handler] = memoize([
      http.post("/echo", () => HttpResponse.json({ calls: ++calls })),
    ]);

    const post = (body: string, requestId: string) =>
      handler.run({
        request: new Request("http://localhost/echo", { method: "POST", body }),
        requestId,
        resolutionContext,
      });

    const first = await post('{"a":1}', "test-memoize-body-1");
    const repeat = await post('{"a":1}', "test-memoize-body-2");
    const different = await post('{"a":2}', "test-memoize-body-3");

    expect(await repeat!.response!.json()).toEqual(
      await first!.response!.json(),
    );
    expect(await different!.response!.json()).toEqual({ calls: 2 });
  });
});
