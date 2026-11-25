/**
 * Tests for `withVersionHeader` in `src/lib/api-docs-version.ts` (ADR 0032):
 * Swagger UI sends the selected version as the `CG-Version` header on mock
 * API requests only.
 */

import { describe, it, expect } from "vitest";
import { withVersionHeader } from "@/lib/api-docs-version";

/** Swagger UI requests carry string headers keyed by name. */
const noHeaders = (): Record<string, string> => ({});

const options = {
  version: "0.5.0",
  basePath: "/api",
  header: "CG-Version",
  origin: "https://docs.example",
};

describe("withVersionHeader", () => {
  it("sets the version header on a same-origin mock API request", () => {
    const result = withVersionHeader(
      {
        url: "https://docs.example/api/common-grants/opportunities",
        headers: noHeaders(),
      },
      options,
    );

    expect(result.headers["CG-Version"]).toBe("0.5.0");
  });

  it("resolves a relative URL against the origin", () => {
    const result = withVersionHeader(
      { url: "/api/common-grants/opportunities", headers: noHeaders() },
      options,
    );

    expect(result.headers["CG-Version"]).toBe("0.5.0");
  });

  it.each(["CG-Version", "cg-version"])(
    "keeps a user-entered %s value without adding a second key",
    (key) => {
      const result = withVersionHeader(
        {
          url: "https://docs.example/api/common-grants/opportunities",
          headers: { [key]: "0.1.0" },
        },
        options,
      );

      expect(result.headers).toEqual({ [key]: "0.1.0" });
    },
  );

  it("treats an empty existing value as missing", () => {
    const result = withVersionHeader(
      {
        url: "https://docs.example/api/common-grants/opportunities",
        headers: { "CG-Version": "" },
      },
      options,
    );

    expect(result.headers["CG-Version"]).toBe("0.5.0");
  });

  it.each([
    "https://docs.example/openapi-mock/openapi.0.5.0.yaml",
    "https://other.example/api/common-grants/opportunities",
    "https://docs.example/apiary",
  ])("does not add the header to non-mock URL %s", (url) => {
    const result = withVersionHeader({ url, headers: noHeaders() }, options);

    expect(result.headers).toEqual({});
  });

  it("returns the request with every other field unchanged", () => {
    const result = withVersionHeader(
      {
        url: "https://docs.example/api/common-grants/opportunities",
        headers: { Accept: "application/json" },
        method: "POST",
        body: '{"a":1}',
      },
      options,
    );

    expect(result).toEqual({
      url: "https://docs.example/api/common-grants/opportunities",
      headers: { Accept: "application/json", "CG-Version": "0.5.0" },
      method: "POST",
      body: '{"a":1}',
    });
  });
});
