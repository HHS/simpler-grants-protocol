/**
 * `CG-Version` resolution (ADR 0032, #1393): which version a route serves for a
 * request header, and the 0.6.0 version errors rendered for a bad one.
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_VERSION,
  VERSION_HEADER,
  resolveRequestedVersion,
  type RouteVersions,
  type VersionError,
} from "@/lib/mock/http/version";
import { versionErrorResponse } from "@/lib/mock/http/envelope";
import { SUPPORTED_VERSIONS } from "@/lib/mock/data/fixtures";
import { getValidator } from "../conformance/schema-validator";

const DISCOVERY = "https://docs.example/api/common-grants/versions";

const FULL_ROUTE: RouteVersions = {
  label: "GET /common-grants/opportunities",
  versions: SUPPORTED_VERSIONS,
  defaultVersion: "0.6.0",
};

const NARROW_ROUTE: RouteVersions = {
  label: "GET /common-grants/awards",
  versions: ["0.4.0", "0.5.0", "0.6.0"],
  defaultVersion: "0.6.0",
};

/** Resolves and returns the error, failing the test if resolution succeeded. */
function errorFor(header: string | null, route = NARROW_ROUTE): VersionError {
  const resolution = resolveRequestedVersion(header, route);
  if (!("error" in resolution)) {
    throw new Error(`Expected an error for ${JSON.stringify(header)}`);
  }
  return resolution.error;
}

describe("resolveRequestedVersion", () => {
  it("serves the default version when no header is sent", () => {
    expect(resolveRequestedVersion(null, FULL_ROUTE)).toEqual({
      version: DEFAULT_VERSION,
    });
    expect(DEFAULT_VERSION).toBe("0.6.0");
  });

  it("serves the route's own default when no header is sent", () => {
    const route = { ...NARROW_ROUTE, defaultVersion: "0.5.0" } as const;

    expect(resolveRequestedVersion(null, route)).toEqual({ version: "0.5.0" });
  });

  it.each([
    ["0.5.1", "0.5.0"],
    [" 0.5.0 ", "0.5.0"],
    ["0.6.0", "0.6.0"],
  ])("serves the hosted version for %j", (header, expected) => {
    expect(resolveRequestedVersion(header, NARROW_ROUTE)).toEqual({
      version: expected,
    });
  });

  describe("version.conflict", () => {
    it.each(["0.5.0, 0.6.0", "0.5.0, 0.5.0", "banana, 0.5.0", "0.5.0, "])(
      "rejects multiple values %j with 400 and names each value",
      (header) => {
        const error = errorFor(header);

        expect(error.status).toBe(400);
        expect(error.detail.code).toBe("version.conflict");
        for (const value of header.split(",").map((v) => v.trim())) {
          expect(error.detail.message).toContain(JSON.stringify(value));
        }
        expect(error.detail.field).toBe(VERSION_HEADER);
        expect(error.detail).not.toHaveProperty("requested");
        expect(error.detail).not.toHaveProperty("scope");
        expect(error.detail.supported).toEqual(NARROW_ROUTE.versions);
        expect(error.detail.defaultVersion).toBe(NARROW_ROUTE.defaultVersion);
      },
    );
  });

  describe("version.malformed", () => {
    it.each(["banana", "0.5", "v0.5.0", "00.5.0", ""])(
      "rejects %j with 400 and echoes it as sent",
      (header) => {
        const error = errorFor(header);

        expect(error.status).toBe(400);
        expect(error.detail).toMatchObject({
          code: "version.malformed",
          requested: header,
        });
        expect(error.detail.message).toContain(header);
        expect(error.detail.field).toBe(VERSION_HEADER);
        expect(error.detail).not.toHaveProperty("scope");
        expect(error.detail.supported).toEqual(NARROW_ROUTE.versions);
        expect(error.detail.defaultVersion).toBe(NARROW_ROUTE.defaultVersion);
      },
    );

    it("echoes the value untrimmed", () => {
      expect(errorFor(" 0.5 ").detail).toMatchObject({ requested: " 0.5 " });
    });
  });

  describe("version.unsupported", () => {
    it.each(["0.9.0", "1.5.0"])(
      "rejects %s with 406 at deployment scope",
      (header) => {
        const error = errorFor(header);

        expect(error.status).toBe(406);
        expect(error.detail).toMatchObject({
          code: "version.unsupported",
          scope: "deployment",
          requested: header,
        });
        expect(error.detail.message).toContain(header);
        expect(error.detail.field).toBe(VERSION_HEADER);
        expect(error.detail.supported).toEqual(NARROW_ROUTE.versions);
        expect(error.detail.defaultVersion).toBe(NARROW_ROUTE.defaultVersion);
      },
    );

    it("rejects a version the mock serves but the route does not, at operation scope", () => {
      const error = errorFor("0.2.0");

      expect(error.status).toBe(406);
      expect(error.detail).toMatchObject({
        code: "version.unsupported",
        scope: "operation",
        requested: "0.2.0",
      });
      expect(error.detail.message).toContain("0.2.0");
      expect(error.detail.supported).toEqual(NARROW_ROUTE.versions);
      expect(error.detail.defaultVersion).toBe(NARROW_ROUTE.defaultVersion);
    });
  });
});

describe("versionErrorResponse for version errors", () => {
  it.each([
    ["version.malformed", "banana", "VersionMalformedError.yaml"],
    ["version.conflict", "0.5.0, 0.6.0", "VersionConflictError.yaml"],
    ["version.unsupported", "0.9.0", "VersionUnsupportedError.yaml"],
  ])("renders %s as a schema-valid body", async (code, header, schemaName) => {
    const error = errorFor(header);
    expect(error.detail.code).toBe(code);

    const response = versionErrorResponse(error, DISCOVERY);
    const body = await response.json();
    const { validate, errorText } = getValidator("0.6.0", schemaName, {
      requireVersioned: true,
    });

    expect(response.status).toBe(error.status);
    expect(body.status).toBe(error.status);
    expect(body.errors[0].discovery).toBe(DISCOVERY);
    expect(validate(body), errorText()).toBe(true);
  });

  it("omits discovery when no discovery URL is given", async () => {
    const response = versionErrorResponse(errorFor("banana"));
    const body = await response.json();

    expect(body.errors[0]).not.toHaveProperty("discovery");
  });
});
