import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";
import {
  buildOpportunitiesExample,
  opportunitiesHandler,
  OPPORTUNITIES_PATH,
} from "@/lib/mock/opportunities-handler";

interface OpenApiSpec {
  paths: Record<string, unknown>;
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

function loadSpec(): OpenApiSpec {
  const content = readFileSync(
    resolve(process.cwd(), "public/openapi/openapi.0.3.0.yaml"),
    "utf-8",
  );
  return yaml.load(content, { schema: yaml.CORE_SCHEMA }) as OpenApiSpec;
}

describe("buildOpportunitiesExample", () => {
  it("returns a schema-valid example body for GET /common-grants/opportunities", () => {
    const spec = loadSpec();
    expect(OPPORTUNITIES_PATH).toBe("/common-grants/opportunities");

    const result = buildOpportunitiesExample(spec) as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
    expect(Array.isArray(result.items)).toBe(true);
    expect((result.items as unknown[]).length).toBeGreaterThanOrEqual(1);
    expect(result.paginationInfo).toBeDefined();
    expect(typeof result.paginationInfo).toBe("object");
    expect(typeof result.status).toBe("number");
    expect(typeof result.message).toBe("string");
  });

  it("throws when the spec has no 200 schema for the path", () => {
    expect(() => buildOpportunitiesExample({ paths: {} })).toThrow(
      /GET \/common-grants\/opportunities/,
    );
  });
});

describe("opportunitiesHandler", () => {
  it("builds an MSW GET handler for the opportunities path", () => {
    const handler = opportunitiesHandler(loadSpec());
    expect(handler.info.method).toBe("GET");
    expect(handler.info.path).toBe(OPPORTUNITIES_PATH);
  });
});
