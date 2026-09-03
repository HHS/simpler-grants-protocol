/**
 * Covers what's new in the website's port (#1078): the Astro route module,
 * the `/api` base-path stripping, version threading, and 404 discrimination.
 * Handler and CORS behavior is pinned by the ported suites.
 */

import { describe, it, expect } from "vitest";
import type { APIContext } from "astro";
import { handleMockRequest, MOCK_API_BASE_PATH } from "@/lib/mock/router";
import { SUPPORTED_METHODS } from "@/lib/mock/http/methods";
import { CANONICAL_OPPORTUNITY_ID } from "@/lib/mock/data/fixtures";
import { CANONICAL_APPLICATION_ID } from "@/lib/mock/data/applications";
import { CANONICAL_FORM_ID } from "@/lib/mock/data/forms";
import { CANONICAL_ORGANIZATION_ID } from "@/lib/mock/data/organizations";
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
});

describe("method allowlist", () => {
  const V = "0.4.0";
  const ORG = `/api/v${V}/common-grants/orgs/${CANONICAL_ORGANIZATION_ID}`;

  /**
   * One route per supported verb, each chosen because it actually serves that
   * verb. Between them they cover every entry in `SUPPORTED_METHODS`, which is
   * what makes the assertions below bite in both directions: drop a verb from
   * the constant and its route keeps answering, so the 404 sweep fails.
   */
  const ROUTE_SERVING: Record<string, string> = {
    GET: ORG,
    POST: `/api/v${V}/common-grants/opportunities/search`,
    PUT: `/api/v${V}/common-grants/applications/${CANONICAL_APPLICATION_ID}/forms/${CANONICAL_FORM_ID}`,
    PATCH: ORG,
  };

  /**
   * `TRACE`, `CONNECT` and `TRACK` are absent because the Fetch spec forbids
   * them in the `Request` constructor, so the router can never see one.
   */
  const CONSTRUCTIBLE_METHODS = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ];

  /**
   * Derived, not hand-listed. `OPTIONS` is excluded because
   * `handleMockRequest` answers preflights before routing.
   */
  const unlistedMethods = CONSTRUCTIBLE_METHODS.filter(
    (method) =>
      method !== "OPTIONS" &&
      !(SUPPORTED_METHODS as readonly string[]).includes(method),
  );

  function call(method: string, path: string): Promise<Response> {
    const url = `https://docs.example${path}`;
    return handleMockRequest(
      method === "GET" || method === "HEAD"
        ? new Request(url, { method })
        : new Request(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }),
    );
  }

  // Guards the two suites below: without a route per supported verb the 404
  // sweep can pass while the router quietly serves an unlisted one, and without
  // an unlisted verb there is nothing to sweep.
  it("pairs every supported verb with a route that serves it", () => {
    expect(Object.keys(ROUTE_SERVING).sort()).toEqual(
      [...SUPPORTED_METHODS].sort(),
    );
  });

  it("leaves at least one verb unlisted", () => {
    expect(unlistedMethods.length).toBeGreaterThan(0);
  });

  it.each([...SUPPORTED_METHODS])(
    "serves %s on the route that declares it",
    async (method) => {
      const response = await call(method, ROUTE_SERVING[method]);

      expect(response.status).not.toBe(404);
    },
  );

  it.each(unlistedMethods)(
    "answers 404 to %s on every route that serves a listed verb",
    async (method) => {
      for (const path of new Set(Object.values(ROUTE_SERVING))) {
        const response = await call(method, path);

        expect(response.status).toBe(404);
      }
    },
  );

  it("advertises exactly these verbs, plus OPTIONS, in the CORS preflight", async () => {
    const response = await call("OPTIONS", ROUTE_SERVING.GET);

    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      [...SUPPORTED_METHODS, "OPTIONS"].join(", "),
    );
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

  // `field: "path"` lets a caller tell "this is not a route" from "this
  // record does not exist".
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

  // The gate is driven by the RESOURCE_MIN_VERSION table, so every entry
  // should behave alike; only awards was covered.
  it.each([
    { resource: "orgs", version: "0.3.0", addedIn: "0.4.0" },
    { resource: "competitions", version: "0.1.0", addedIn: "0.2.0" },
    { resource: "applications", version: "0.1.0", addedIn: "0.2.0" },
    { resource: "forms", version: "0.1.0", addedIn: "0.2.0" },
  ])(
    "404s $resource at v$version, naming v$addedIn as the version that added it",
    async ({ resource, version, addedIn }) => {
      const response = await handleMockRequest(
        new Request(
          `https://docs.example/api/v${version}/common-grants/${resource}`,
        ),
      );

      expect(response.status).toBe(404);

      const body = (await response.json()) as {
        errors: Array<{ field: string; message: string }>;
      };
      expect(body.errors[0].field).toBe("path");
      expect(body.errors[0].message).toContain(`added in v${addedIn}`);
    },
  );

  // Regression: `[^/]*` in the route regex let a bare trailing slash reach
  // the detail handler with an empty id and answer 400 instead of 404.
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
