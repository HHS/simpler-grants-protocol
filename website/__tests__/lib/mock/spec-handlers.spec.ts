import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";
import { buildHandlersFromSpec } from "@/lib/mock/spec-handlers";

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
});
