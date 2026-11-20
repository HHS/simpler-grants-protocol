/**
 * Pins header-based version selection in the router (#1393-T2, ADR 0032):
 * `CG-Version` picks the version, the path never does, and each outcome
 * carries (or omits) the served/vary headers as the ADR requires.
 */

import { describe, it, expect } from "vitest";
import { handleMockRequest } from "@/lib/mock/router";
import {
  SUPPORTED_VERSIONS,
  CANONICAL_OPPORTUNITY_ID,
  RESERVED_MISSING_OPPORTUNITY_ID,
} from "@/lib/mock/data/fixtures";
import {
  VERSION_HEADER,
  VERSION_SERVED_HEADER,
  DEFAULT_VERSION,
} from "@/lib/mock/http/version";
import { mockRequest } from "./__fixtures__/mock-request";

interface ErrorBody {
  status: number;
  message: string;
  errors: Array<Record<string, unknown>>;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

describe("version selected by the CG-Version header", () => {
  it.each(SUPPORTED_VERSIONS)(
    "serves GET /opportunities in %s with the served and Vary headers",
    async (version) => {
      const response = await handleMockRequest(
        mockRequest("/opportunities", version),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get(VERSION_SERVED_HEADER)).toBe(version);
      expect(response.headers.get("Vary")).toContain(VERSION_HEADER);
    },
  );

  it("serves the default version when no header is sent", async () => {
    const response = await handleMockRequest(
      mockRequest("/opportunities", undefined),
    );

    expect(response.status).toBe(200);
    expect(DEFAULT_VERSION).toBe("0.6.0");
    expect(response.headers.get(VERSION_SERVED_HEADER)).toBe("0.6.0");
    expect(response.headers.get("Vary")).toContain(VERSION_HEADER);
  });

  it("serves the hosted version for a patch that isn't hosted", async () => {
    const response = await handleMockRequest(
      mockRequest("/opportunities", "0.5.9"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get(VERSION_SERVED_HEADER)).toBe("0.5.0");
  });

  it("ignores a cg-version query parameter", async () => {
    const response = await handleMockRequest(
      mockRequest("/opportunities?cg-version=0.5.0", undefined),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get(VERSION_SERVED_HEADER)).toBe("0.6.0");
  });

  it("passes the version to the handler, not merely the header", async () => {
    const find = async (version: string) => {
      const response = await handleMockRequest(
        mockRequest("/opportunities", version),
      );
      const body = (await response.json()) as {
        items: Array<Record<string, unknown> & { id: string }>;
      };
      return body.items.find((item) => item.id === CANONICAL_OPPORTUNITY_ID);
    };

    const v01Item = await find("0.1.0");
    const v03Item = await find("0.3.0");

    expect(v01Item).toBeDefined();
    expect(v03Item).toBeDefined();
    expect(v01Item).not.toHaveProperty("acceptedApplicantTypes");
    expect(v03Item).toHaveProperty("acceptedApplicantTypes");
  });

  it("marks a record 404 with the served version", async () => {
    const response = await handleMockRequest(
      mockRequest(`/opportunities/${RESERVED_MISSING_OPPORTUNITY_ID}`, "0.3.0"),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get(VERSION_SERVED_HEADER)).toBe("0.3.0");
    expect(response.headers.get("Vary")).toContain(VERSION_HEADER);
  });

  it("marks a body validation 400 with the served version", async () => {
    const response = await handleMockRequest(
      mockRequest("/opportunities/search", "0.3.0", {
        method: "POST",
        headers: JSON_HEADERS,
        body: "{not json",
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get(VERSION_SERVED_HEADER)).toBe("0.3.0");
  });
});

describe("a version in the path is not a selector", () => {
  it("answers /api/v{x}/common-grants/... with the plain route-miss 404", async () => {
    const response = await handleMockRequest(
      new Request(
        "https://docs.example/api/v0.5.0/common-grants/opportunities",
      ),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get(VERSION_SERVED_HEADER)).toBeNull();

    const body = (await response.json()) as ErrorBody;
    expect(body.status).toBe(404);
    expect(body.message).toBe("Not found");
    expect(body.errors[0].field).toBe("path");
  });
});

describe("a route requested in a version that predates it", () => {
  it.each([
    {
      name: "awards in 0.2.0",
      path: "/awards",
      init: {},
      supported: ["0.4.0", "0.5.0", "0.6.0"],
    },
    {
      name: "application search in 0.2.0",
      path: "/applications/search",
      init: { method: "POST", headers: JSON_HEADERS, body: "{}" },
      supported: ["0.3.0", "0.4.0", "0.5.0", "0.6.0"],
    },
  ])("returns 406 version.unsupported (operation) for $name", async (c) => {
    const response = await handleMockRequest(
      mockRequest(c.path, "0.2.0", c.init),
    );

    expect(response.status).toBe(406);
    expect(response.headers.get(VERSION_SERVED_HEADER)).toBeNull();

    const body = (await response.json()) as ErrorBody;
    expect(body.errors[0]).toMatchObject({
      code: "version.unsupported",
      scope: "operation",
      requested: "0.2.0",
      supported: c.supported,
      defaultVersion: "0.6.0",
      field: "CG-Version",
    });
  });
});

describe("route matching comes before version resolution", () => {
  it("returns the plain route-miss 404 for an unknown resource even with a malformed header", async () => {
    const response = await handleMockRequest(
      mockRequest("/proposals", "banana"),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get(VERSION_SERVED_HEADER)).toBeNull();

    const body = (await response.json()) as ErrorBody;
    expect(body.message).toBe("Not found");
    expect(body.errors[0].field).toBe("path");
  });
});

describe("a route miss inside a known resource", () => {
  it.each([
    ["/awards", { method: "DELETE" }],
    ["/opportunities/foo/bar", {}],
  ])(
    "answers %s with a 404 that carries the served version and Vary",
    async (path, init) => {
      const response = await handleMockRequest(
        mockRequest(path, "0.5.0", init),
      );

      expect(response.status).toBe(404);
      expect(response.headers.get(VERSION_SERVED_HEADER)).toBe("0.5.0");
      expect(response.headers.get("Vary")).toContain(VERSION_HEADER);
    },
  );

  // The accepted gap (PLAN-1393 T2): the version is resolved before the
  // router knows the sub-route is missing, so a bad header wins over the 404.
  it("answers a malformed header with 400 rather than 404", async () => {
    const response = await handleMockRequest(
      mockRequest("/awards", "banana", { method: "DELETE" }),
    );

    expect(response.status).toBe(400);
  });
});

describe("version errors through the router", () => {
  it.each([
    {
      header: "banana",
      status: 400,
      code: "version.malformed",
      scope: undefined,
    },
    {
      header: "0.9.0",
      status: 406,
      code: "version.unsupported",
      scope: "deployment",
    },
    {
      header: "0.5.0, 0.6.0",
      status: 400,
      code: "version.conflict",
      scope: undefined,
    },
  ])(
    "answers CG-Version: $header with $status $code",
    async ({ header, status, code, scope }) => {
      const response = await handleMockRequest(
        mockRequest("/opportunities", header),
      );

      expect(response.status).toBe(status);
      expect(response.headers.get(VERSION_SERVED_HEADER)).toBeNull();
      expect(response.headers.get("Vary")).toContain(VERSION_HEADER);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");

      const body = (await response.json()) as ErrorBody;
      expect(body.errors[0].code).toBe(code);
      if (scope) expect(body.errors[0].scope).toBe(scope);
    },
  );
});

describe("health route", () => {
  it("stays 200 and unversioned", async () => {
    const response = await handleMockRequest(
      new Request("https://docs.example/api"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get(VERSION_SERVED_HEADER)).toBeNull();
  });
});
