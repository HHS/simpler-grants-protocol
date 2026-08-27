/**
 * Router-level tests for the not-yet-written `src/lib/mock/router.ts` and its
 * thin Astro wiring at `src/pages/api/[...path].ts` (#1078, PLAN.md).
 *
 * `handlers/opportunities.spec.ts`, `http/cors.spec.ts`, and
 * `handlers/sdk-envelope.spec.ts` already pin the handler/CORS behavior
 * end-to-end through `handleMockRequest`, so this file covers only what's new
 * in the website's port: the Astro route module itself, the `/api` base-path
 * stripping the standalone Worker never had to do, that the requested version
 * actually threads through to the handler (not just "200"), and the 404
 * discrimination the ported suites leave at status-level only.
 */

import { describe, it, expect } from "vitest";
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
  it("disables prerendering, since the mock must run per-request", () => {
    expect(apiRoute.prerender).toBe(false);
  });

  it("delegates ALL to handleMockRequest untouched, for a real opportunities request", async () => {
    // Minimal Astro-ish context: the ALL handler only needs `request` to
    // delegate correctly, so casting past the rest of `APIContext` keeps this
    // from depending on Astro's dev server just to build a full context.
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

  // Inherited from the Worker's regex, not re-decided here: `OPPORTUNITIES_ROUTE`
  // has no trailing-slash alternative, so once `/api` is stripped off, the
  // remainder (`/v0.3.0/common-grants/opportunities/`) fails the exact same
  // regex the Worker itself would have rejected.
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
    // Same underlying record via two version prefixes: if the router dropped
    // `version` and always shaped for one of them, this pair would collapse.
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

  // Replaced when #334 extended the mock past opportunities. This case used
  // to request `/v0.4.0/common-grants/awards` and assert an
  // "opportunity endpoints only" 404 — awards are now served, so that path
  // answers 200 and the message would be false. What is still worth pinning is
  // the *discrimination*: a path outside the served surface reports
  // `field: "path"`, not a resource-level field, so a caller can tell "this is
  // not a route" from "this record does not exist".
  it("flags a path outside the served surface with field: 'path'", async () => {
    const response = await handleMockRequest(
      new Request("https://docs.example/api/v0.4.0/common-grants/proposals"),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors[0].field).toBe("path");
    expect(body.errors[0].message).toContain("No route matches");
  });

  // The other half of that discrimination, and new with #334: a resource
  // that IS in the protocol but not in the requested version reports which
  // version added it, rather than the bare "no route" it would have got before.
  it("names the adding version for a resource absent from the requested version", async () => {
    const response = await handleMockRequest(
      new Request("https://docs.example/api/v0.2.0/common-grants/awards"),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors[0].field).toBe("path");
    expect(body.errors[0].message).toContain("added in v0.4.0");
  });

  // Regression: `RESOURCE_ROUTE` originally captured remainder segments as
  // `[^/]*`, so a bare trailing slash matched with an EMPTY id and reached the
  // detail handler, which answered 400 "Invalid <x> id". `/opportunities/` had
  // always answered 404, because its own regex uses `[^/]+`. Two answers to the
  // same shape of request, decided by which resource you asked for. Pinned
  // across all six so the quantifiers cannot drift apart again.
  it.each([
    "opportunities",
    "awards",
    "orgs",
    "applications",
    "forms",
    "competitions",
  ])(
    "answers a bare trailing slash on /%s with a route miss, not a 400",
    async (resource) => {
      const response = await handleMockRequest(
        new Request(
          `https://docs.example/api/v0.4.0/common-grants/${resource}/`,
        ),
      );

      expect(response.status).toBe(404);

      const body = (await response.json()) as {
        errors: Array<{ field: string; message: string }>;
      };
      expect(body.errors[0].field).toBe("path");
    },
  );

  it("answers a path nested deeper than any route with a route miss", async () => {
    const response = await handleMockRequest(
      new Request(
        "https://docs.example/api/v0.4.0/common-grants/opportunities/foo/bar",
      ),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors[0].field).toBe("path");
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
