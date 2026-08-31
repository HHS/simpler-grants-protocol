/**
 * Covers what's new in the website's port (#1078): the Astro route module,
 * the `/api` base-path stripping, version threading, and 404 discrimination.
 * Handler and CORS behavior is pinned by the ported suites.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import type { APIContext } from "astro";
import { handleMockRequest, MOCK_API_BASE_PATH } from "@/lib/mock/router";
import { CANONICAL_OPPORTUNITY_ID } from "@/lib/mock/data/fixtures";
import * as apiRoute from "@/pages/api/[...path]";

/** Builds `https://docs.example/api/v{version}/common-grants/opportunities{suffix}`. */
function opportunitiesUrl(version: string, suffix = ""): string {
  return `https://docs.example/api/v${version}/common-grants/opportunities${suffix}`;
}

describe("MOCK_API_BASE_PATH", () => {
  it("is the fixed base the router strips off the pathname before matching the Worker's route regex", () => {
    expect(MOCK_API_BASE_PATH).toBe("/api");
  });
});

describe("Astro route wiring (src/pages/api/[...path].ts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disables prerendering, since the mock must run per-request", () => {
    expect(apiRoute.prerender).toBe(false);
  });

  it("delegates ALL to handleMockRequest untouched, for a real opportunities request", async () => {
    vi.stubEnv("MOCK_API_ENABLED", "1");

    // The ALL handler only needs `request`; the rest of APIContext is cast away.
    const context = {
      request: new Request(opportunitiesUrl("0.3.0")),
    } as unknown as APIContext;

    const routed = await apiRoute.ALL(context);
    const direct = await handleMockRequest(
      new Request(opportunitiesUrl("0.3.0")),
    );

    expect(routed.status).toBe(direct.status);
    expect(await routed.json()).toEqual(await direct.json());
  });

  // The endpoint is gated on the same flag as the docs that advertise it, so
  // an ungated build — every production deploy — must not serve fixtures.
  it.each([undefined, "", "0", "false"])(
    "answers 404 without reaching the mock when MOCK_API_ENABLED is %s",
    async (gate) => {
      vi.stubEnv("MOCK_API_ENABLED", gate);

      const context = {
        request: new Request(opportunitiesUrl("0.3.0")),
      } as unknown as APIContext;

      const response = await apiRoute.ALL(context);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("");
    },
  );
});

describe("base-path handling (new in the website port, no Worker analogue)", () => {
  it.each(["https://docs.example/api", "https://docs.example/api/"])(
    "answers the health route (name + supportedVersions) at %s, since bare / here belongs to the docs homepage",
    async (url) => {
      const response = await handleMockRequest(new Request(url));

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        name: string;
        supportedVersions: string[];
      };
      expect(typeof body.name).toBe("string");
      expect(Array.isArray(body.supportedVersions)).toBe(true);
      expect(body.supportedVersions.length).toBeGreaterThan(0);
    },
  );

  it("treats a path missing the /api base as a route miss, not the opportunities list", async () => {
    const response = await handleMockRequest(
      new Request("https://docs.example/v0.3.0/common-grants/opportunities"),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string }>;
    };
    expect(body.errors[0].field).toBe("path");
  });

  // Inherited from the Worker's route regex, which has no trailing-slash
  // alternative — not re-decided here.
  it("treats a trailing slash on an opportunities path as a route miss, same as the Worker", async () => {
    const response = await handleMockRequest(
      new Request(opportunitiesUrl("0.3.0", "/")),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string }>;
    };
    expect(body.errors[0].field).toBe("path");
  });
});

describe("the requested version actually reaches the handler, not merely 200", () => {
  it("omits acceptedApplicantTypes from the v0.1.0 list record that carries it in v0.3.0", async () => {
    const v01Response = await handleMockRequest(
      new Request(opportunitiesUrl("0.1.0")),
    );
    const v03Response = await handleMockRequest(
      new Request(opportunitiesUrl("0.3.0")),
    );

    expect(v01Response.status).toBe(200);
    expect(v03Response.status).toBe(200);

    const v01Body = (await v01Response.json()) as {
      items: Array<Record<string, unknown> & { id: string }>;
    };
    const v03Body = (await v03Response.json()) as {
      items: Array<Record<string, unknown> & { id: string }>;
    };

    const v01Item = v01Body.items.find(
      (item) => item.id === CANONICAL_OPPORTUNITY_ID,
    );
    const v03Item = v03Body.items.find(
      (item) => item.id === CANONICAL_OPPORTUNITY_ID,
    );

    expect(v01Item).toBeDefined();
    expect(v03Item).toBeDefined();
    // If the router dropped `version` and always shaped for one of them,
    // this pair would collapse.
    expect(v01Item).not.toHaveProperty("acceptedApplicantTypes");
    expect(v03Item).toHaveProperty("acceptedApplicantTypes");
  });
});

describe("404 discrimination the ported handler/CORS specs leave at status-level only", () => {
  it("flags an unsupported version prefix with field: 'version'", async () => {
    const response = await handleMockRequest(
      new Request(opportunitiesUrl("9.9.9")),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors[0].field).toBe("version");
  });

  it("flags a malformed version prefix with field: 'version' too", async () => {
    const response = await handleMockRequest(
      new Request(opportunitiesUrl("abc")),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors[0].field).toBe("version");
  });

  it("flags a non-opportunity path with field: 'path' and the opportunity-endpoints-only message", async () => {
    const response = await handleMockRequest(
      new Request("https://docs.example/api/v0.4.0/common-grants/awards"),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors[0].field).toBe("path");
    expect(body.errors[0].message).toContain("opportunity endpoints only");
  });

  it("flags an unsupported method on an otherwise-valid path with field: 'path'", async () => {
    const response = await handleMockRequest(
      new Request(opportunitiesUrl("0.3.0"), { method: "PUT" }),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors[0].field).toBe("path");
  });
});
