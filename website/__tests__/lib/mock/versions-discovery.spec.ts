/**
 * The versions discovery route (ADR 0032, #1393-T3): `GET /common-grants/versions`
 * lists what the mock serves, ignores `CG-Version`, and is the target of the
 * `discovery` URL on every version error.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import { handleMockRequest } from "@/lib/mock/router";
import { VERSION_HEADER, VERSION_SERVED_HEADER } from "@/lib/mock/http/version";
import { SUPPORTED_VERSIONS } from "@/lib/mock/data/fixtures";
import { getValidator } from "./conformance/schema-validator";
import { mockRequest, mockUrl } from "./__fixtures__/mock-request";

const DISCOVERY = "https://docs.example/api/common-grants/versions";

interface OperationEntry {
  versions: string[];
  defaultVersion: string;
}

interface Discovery {
  versions: string[];
  defaultVersion: string;
  operations: Record<string, OperationEntry>;
}

async function fetchDiscovery(version?: string) {
  const response = await handleMockRequest(mockRequest("/versions", version));
  return { response, body: await response.json() };
}

describe("GET /common-grants/versions", () => {
  it("returns the success envelope with a VersionDiscovery", async () => {
    const { response, body } = await fetchDiscovery();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 200, message: "Success" });
    const data: Discovery = body.data;
    expect(data.versions).toEqual(SUPPORTED_VERSIONS);
    expect(data.defaultVersion).toBe("0.6.0");
    expect(typeof data.operations).toBe("object");
  });

  it("validates against the 0.6.0 VersionDiscovery schema", async () => {
    const { body } = await fetchDiscovery();
    const { validate, errorText } = getValidator(
      "0.6.0",
      "VersionDiscovery.yaml",
      { requireVersioned: true },
    );

    expect(validate(body.data), errorText()).toBe(true);
  });

  it("lists each operation's default inside its own versions", async () => {
    const { body } = await fetchDiscovery();
    const entries = Object.values(
      body.data.operations as Record<string, OperationEntry>,
    );

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.versions).toContain(entry.defaultVersion);
    }
  });

  it("omits upcomingDefault and deprecated", async () => {
    const { body } = await fetchDiscovery();
    const levels = [
      body.data,
      ...Object.values(body.data.operations ?? {}),
    ] as object[];

    expect(levels.length).toBeGreaterThan(1);
    for (const level of levels) {
      expect(level).not.toHaveProperty("upcomingDefault");
      expect(level).not.toHaveProperty("deprecated");
    }
  });

  describe("CG-Version", () => {
    it.each([undefined, "0.3.0", "v1", "0.5.0, 0.4.0", "9.9.0"])(
      "is ignored when the header is %j",
      async (header) => {
        const baseline = await fetchDiscovery();
        const { response, body } = await fetchDiscovery(header);

        expect(response.status).toBe(200);
        expect(body).toEqual(baseline.body);
        expect(body.data.versions).toEqual(SUPPORTED_VERSIONS);
        expect(response.headers.has(VERSION_SERVED_HEADER)).toBe(false);
        expect(response.headers.get("Vary") ?? "").not.toContain(
          VERSION_HEADER,
        );
      },
    );
  });

  it("serves only GET", async () => {
    const response = await handleMockRequest(
      mockRequest("/versions", undefined, { method: "POST" }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.errors[0].field).toBe("path");
    expect(response.headers.has(VERSION_SERVED_HEADER)).toBe(false);
  });
});

describe("version errors link to discovery", () => {
  it.each([
    ["/awards", "0.2.0", 406, "VersionUnsupportedError.yaml"],
    ["/opportunities", "v1", 400, "VersionMalformedError.yaml"],
    ["/opportunities", "0.5.0, 0.4.0", 400, "VersionConflictError.yaml"],
    ["/opportunities", "9.9.0", 406, "VersionUnsupportedError.yaml"],
  ])("%s with %j", async (route, header, status, schemaName) => {
    const response = await handleMockRequest(mockRequest(route, header));
    const body = await response.json();
    const { validate, errorText } = getValidator("0.6.0", schemaName, {
      requireVersioned: true,
    });

    expect(response.status).toBe(status);
    expect(body.errors[0].discovery).toBe(DISCOVERY);
    expect(new URL(body.errors[0].discovery).origin).toBe(
      new URL(mockUrl("")).origin,
    );
    expect(validate(body), errorText()).toBe(true);
  });
});

describe("discovery operations vs published OpenAPI", () => {
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const OPENAPI_DIR = path.resolve(HERE, "../../../public/openapi");
  const METHODS = ["get", "post", "put", "patch", "delete"];
  const SELF = "GET /common-grants/versions";

  /** `"<METHOD> <path>"` keys with exact published paths, per version. */
  function routesFor(version: string): string[] {
    const doc = yaml.load(
      readFileSync(path.join(OPENAPI_DIR, `openapi.${version}.yaml`), "utf8"),
    ) as { paths: Record<string, Record<string, unknown>> };
    return Object.entries(doc.paths).flatMap(([p, item]) =>
      METHODS.filter((m) => m in item).map((m) => `${m.toUpperCase()} ${p}`),
    );
  }

  const normalize = (key: string) => key.replace(/\{[^}]*\}/g, "{}");

  const byVersion = new Map(
    SUPPORTED_VERSIONS.map((v) => [v, routesFor(v).map(normalize)]),
  );
  const latest = routesFor("0.6.0").filter((r) => r !== SELF);

  it("has one entry per route that appeared after 0.1.0", async () => {
    const { body } = await fetchDiscovery();
    const operations = body.data.operations as Record<string, OperationEntry>;
    const normalized = new Map(
      Object.entries(operations).map(([k, v]) => [normalize(k), v]),
    );

    for (const route of latest) {
      const key = normalize(route);
      const first = SUPPORTED_VERSIONS.find((v) =>
        byVersion.get(v)?.includes(key),
      );
      if (first === "0.1.0") {
        expect(normalized.has(key), `${route} is in 0.1.0`).toBe(false);
        continue;
      }
      const entry = normalized.get(key);
      expect(entry, `missing ${route}`).toBeDefined();
      expect(entry?.versions, route).toEqual(
        SUPPORTED_VERSIONS.slice(SUPPORTED_VERSIONS.indexOf(first!)),
      );
      expect(entry?.defaultVersion, route).toBe("0.6.0");
    }
  });

  it("names only routes published in 0.6.0, with their exact paths", async () => {
    const { body } = await fetchDiscovery();
    const keys = Object.keys(body.data.operations);

    expect(keys).toHaveLength(18);
    for (const key of keys) {
      expect(latest, key).toContain(key);
    }
  });
});
