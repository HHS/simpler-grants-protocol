/**
 * Routes mock API requests to the fixture-backed resource handlers.
 *
 * This is the website's re-authored equivalent of the 3A standalone Worker's
 * `mock-api/src/index.ts` (#1078). It is the one piece of that experiment
 * that could *not* be copied: the Worker's entrypoint is a
 * `export default { fetch } satisfies ExportedHandler`, and it owns the whole
 * origin, so its routes hang off `/`. Here the docs site owns `/`, the mock is
 * mounted under `/api`, and the entrypoint is an Astro endpoint
 * (`src/pages/api/[...path].ts`) that delegates to `handleMockRequest` below.
 * Everything downstream of routing — fixtures, filtering, sorting, pagination,
 * envelopes, CORS — is shared, host-agnostic code.
 *
 * Byte-identity with the Worker for the opportunity endpoints (asserted by
 * `__tests__/lib/mock/golden-envelopes.spec.ts`) is structural rather than
 * incidental: `stripBasePath` reduces the pathname to exactly what the Worker
 * would have seen, and `OPPORTUNITIES_ROUTE` below is its regex verbatim. So
 * anything the two hosts could disagree about on that surface is decided in one
 * place, and behavior at the edges — a trailing slash, a `%2F`, a doubled slash
 * — is inherited from the Worker rather than re-litigated here.
 *
 * **#334 extended the surface past opportunities.** The mock now serves all
 * 18 non-opportunity endpoints `lib/core/lib/api.tsp` publishes — awards,
 * organizations (including the `/changes` sub-resource), competitions,
 * applications with their form responses, and forms — so "Try it out" no longer
 * 404s on the default docs page. Two consequences worth stating:
 *
 *  - The Worker's surface was opportunities only, so the corpus can no longer be
 *    a *total* contract: `GET /v0.4.0/common-grants/awards` returned a route-miss
 *    404 there and returns an award list here. The guarantee narrowed to what it
 *    was always really about — the opportunity endpoints, which both hosts serve
 *    and which are pinned byte for byte. See the corpus spec for the two entries
 *    that changed and why.
 *  - Route misses no longer say "opportunity endpoints only". That message was
 *    accurate when it was written and would be a lie now.
 *
 * Version gating lives in `data/availability.ts`, not here: a resource is served
 * only from the version its `@added` decorator names, and earlier version
 * prefixes get a protocol-shaped 404 — the honest reply, since on a real v0.2 API
 * the awards path genuinely is not a route.
 */

import {
  isResourceAvailable,
  RESOURCE_MIN_VERSION,
  type ResourceName,
} from "./data/availability";
import {
  SUPPORTED_VERSIONS,
  isSupportedVersion,
  type Version,
} from "./data/fixtures";
import {
  getApplication,
  readFormResponse,
  searchApplications,
  startApplication,
  submitApplication,
  writeFormResponse,
} from "./handlers/applications";
import { getAward, listAwards, searchAwards } from "./handlers/awards";
import { getCompetition } from "./handlers/competitions";
import { getForm, listForms } from "./handlers/forms";
import {
  getOpportunity,
  listOpportunities,
  searchOpportunities,
} from "./handlers/opportunities";
import {
  getOrgChange,
  getOrganization,
  listOrgChanges,
  listOrganizations,
  submitOrgChange,
  updateOrganization,
} from "./handlers/organizations";
import { preflightResponse, withCors } from "./http/cors";
import { errorResponse, withErrorBoundary } from "./http/envelope";

const SERVICE_NAME = "CommonGrants mock API";

/**
 * Where the mock is mounted on the docs origin. Exported because #1078 needs
 * the same value to write per-version `servers:` entries into the rendered
 * OpenAPI specs — the base path and the URL Swagger UI calls have to agree, so
 * they read from one constant.
 */
export const MOCK_API_BASE_PATH = "/api";

/**
 * `/v{version}/common-grants/opportunities` with an optional trailing segment:
 * an `oppId` on GET, the literal `search` on POST. Verbatim from the Worker, and
 * applied to a base-stripped pathname so it keeps matching the same strings.
 *
 * The protocol version rides in the path rather than a header or query param so
 * that an SDK `baseUrl` of `https://commongrants.org/api/v0.4.0` works unchanged
 * (`Client.url()` concatenates base + path), and each rendered spec file can
 * carry a version-correct `servers:` URL.
 *
 * `version` is captured loosely (`[^/]+`) and narrowed by `isSupportedVersion`,
 * so `/vabc/...` and `/v9.9.9/...` both reach the same "unsupported version"
 * answer instead of falling through to a bare route miss.
 */
const OPPORTUNITIES_ROUTE =
  /^\/v([^/]+)\/common-grants\/opportunities(?:\/([^/]+))?$/;

/**
 * The version prefix and the resource segment, for every non-opportunity route.
 *
 * Matched in one place so the version is captured identically for all resources
 * and narrowed by `isSupportedVersion` before any resource-specific matching —
 * which is what makes an unsupported version answer the same way on every path
 * rather than depending on which resource happened to match first.
 *
 * The remainder is captured raw and matched per resource below, rather than
 * enumerating every shape here: the org routes alone have four distinct
 * remainders, and one regex covering all of them would be unreadable.
 *
 * Each remainder segment is `[^/]+`, not `[^/]*`, so an *empty* segment does not
 * match: `/awards/` and `/orgs//changes` fall through to a route-miss 404 rather
 * than reaching a handler with an empty-string id, which would have answered 400
 * "Invalid award id" — a different answer from the one `/opportunities/` has
 * always given, since `OPPORTUNITIES_ROUTE` requires `[^/]+` too. Keeping the two
 * quantifiers the same is what makes the trailing-slash claim in
 * `stripBasePath` true of every resource rather than only the original one.
 */
const RESOURCE_ROUTE = /^\/v([^/]+)\/common-grants\/([^/]+)((?:\/[^/]+)*)$/;

/** `/{id}`, `/{id}/changes`, and `/{id}/changes/{changeId}` for the org routes. */
const ORG_CHANGES_ROUTE = /^\/([^/]+)\/changes(?:\/([^/]+))?$/;

/** `/{appId}/forms/{formId}` and `/{appId}/submit` for the application routes. */
const APP_FORM_RESPONSE_ROUTE = /^\/([^/]+)\/forms\/([^/]+)$/;
const APP_SUBMIT_ROUTE = /^\/([^/]+)\/submit$/;

/** Maps a route segment to the resource whose availability governs it. */
const RESOURCE_BY_SEGMENT: Record<string, ResourceName> = {
  opportunities: "opportunities",
  awards: "awards",
  orgs: "orgs",
  competitions: "competitions",
  applications: "applications",
  forms: "forms",
};

function healthResponse(): Response {
  return Response.json({
    name: SERVICE_NAME,
    supportedVersions: SUPPORTED_VERSIONS,
  });
}

/**
 * Protocol-shaped 404 for anything outside the served endpoints. Echoes the
 * *full* requested path, base included, because that is what the caller typed —
 * the only respect in which these bodies differ from the Worker's, and the
 * reason `golden-envelopes.spec.ts` marks such cases `pathEchoing`.
 */
function routeMissResponse(method: string, pathname: string): Response {
  return errorResponse(404, "Not found", [
    {
      field: "path",
      message: `No route matches ${method} ${pathname}`,
    },
  ]);
}

/**
 * Protocol-shaped 404 for a resource that exists in the protocol but not in the
 * requested version.
 *
 * Distinct from a bare route miss on purpose: "this path is not a route" and
 * "this path became a route two versions after the one you asked for" are
 * different facts, and the second one tells a caller exactly what to change.
 */
function resourceNotInVersionResponse(
  resource: ResourceName,
  version: string,
): Response {
  return errorResponse(404, "Not found", [
    {
      field: "path",
      message: `The ${resource} endpoints were added in v${RESOURCE_MIN_VERSION[resource]} and are not served by v${version}`,
    },
  ]);
}

/** Protocol-shaped 404 for a version this mock does not serve at all. */
function unsupportedVersionResponse(version: string): Response {
  return errorResponse(404, "Unsupported protocol version", [
    {
      field: "version",
      message: `Version ${version} is not served by this mock; supported versions are ${SUPPORTED_VERSIONS.join(", ")}`,
    },
  ]);
}

/**
 * Reduces a docs-origin pathname to the path the Worker would have received, or
 * `undefined` when the request never belonged to the mock at all.
 *
 * Astro routes `/api/**` here, but `request.url` carries the raw path as typed,
 * so this is also the one place trailing slashes are considered: `/api` and
 * `/api/` are both the mount point itself (the health route), while a trailing
 * slash deeper in the path stays in the remainder and is judged by the resource
 * regexes — which reject it, exactly as the Worker does.
 */
function stripBasePath(pathname: string): string | undefined {
  if (pathname === MOCK_API_BASE_PATH) return "/";
  if (pathname.startsWith(`${MOCK_API_BASE_PATH}/`)) {
    return pathname.slice(MOCK_API_BASE_PATH.length);
  }
  return undefined;
}

/**
 * Dispatches the opportunity endpoints — unchanged from #1078, and matched
 * before anything else so the corpus-pinned surface cannot be affected by the
 * routing added around it.
 */
async function routeOpportunities(
  request: Request,
  version: Version,
  segment: string | undefined,
): Promise<Response | undefined> {
  // `GET .../opportunities/search` deliberately falls through to the detail
  // handler, which answers 400 "Must be a valid UUID" — the same answer the
  // Worker gives, since only POST is registered on `/search`.
  if (request.method === "GET") {
    return segment === undefined
      ? listOpportunities(request, version)
      : getOpportunity(segment, version);
  }
  if (request.method === "POST" && segment === "search") {
    return searchOpportunities(request, version);
  }
  return undefined;
}

/** Dispatches `/awards`, whose shape mirrors `/opportunities` exactly. */
async function routeAwards(
  request: Request,
  version: Version,
  remainder: string,
): Promise<Response | undefined> {
  const segment = remainder === "" ? undefined : remainder.slice(1);
  if (segment !== undefined && segment.includes("/")) return undefined;

  if (request.method === "GET") {
    return segment === undefined
      ? listAwards(request, version)
      : getAward(segment, version);
  }
  if (request.method === "POST" && segment === "search") {
    return searchAwards(request, version);
  }
  return undefined;
}

/** Dispatches the six `/orgs` routes, including the `/changes` sub-resource. */
async function routeOrgs(
  request: Request,
  version: Version,
  remainder: string,
): Promise<Response | undefined> {
  if (remainder === "") {
    return request.method === "GET"
      ? listOrganizations(request, version)
      : undefined;
  }

  const changes = ORG_CHANGES_ROUTE.exec(remainder);
  if (changes) {
    const [, orgId, changeId] = changes;
    if (changeId === undefined) {
      if (request.method === "GET")
        return listOrgChanges(orgId, request, version);
      if (request.method === "POST")
        return submitOrgChange(orgId, request, version);
      return undefined;
    }
    return request.method === "GET"
      ? getOrgChange(orgId, changeId, version)
      : undefined;
  }

  const orgId = remainder.slice(1);
  if (orgId.includes("/")) return undefined;
  if (request.method === "GET") return getOrganization(orgId, request, version);
  if (request.method === "PATCH")
    return updateOrganization(orgId, request, version);
  return undefined;
}

/** Dispatches the five `/applications` routes and their two form-response verbs. */
async function routeApplications(
  request: Request,
  version: Version,
  remainder: string,
): Promise<Response | undefined> {
  if (remainder === "") return undefined;

  const formResponse = APP_FORM_RESPONSE_ROUTE.exec(remainder);
  if (formResponse) {
    const [, appId, formId] = formResponse;
    if (request.method === "GET")
      return readFormResponse(appId, formId, version);
    if (request.method === "PUT") {
      return writeFormResponse(appId, formId, request, version);
    }
    return undefined;
  }

  const submit = APP_SUBMIT_ROUTE.exec(remainder);
  if (submit) {
    return request.method === "PUT"
      ? submitApplication(submit[1], version)
      : undefined;
  }

  const segment = remainder.slice(1);
  if (segment.includes("/")) return undefined;
  if (request.method === "POST") {
    if (segment === "start") return startApplication(request, version);
    if (segment === "search") return searchApplications(request, version);
    return undefined;
  }
  // As with opportunities, `GET .../applications/search` falls through to the
  // detail handler and answers 400 "Must be a valid UUID" — only POST is
  // registered on `/search` and `/start`.
  return request.method === "GET"
    ? getApplication(segment, version)
    : undefined;
}

/** Dispatches `/forms` (list) and `/forms/{formId}` (read). */
async function routeForms(
  request: Request,
  version: Version,
  remainder: string,
): Promise<Response | undefined> {
  if (request.method !== "GET") return undefined;
  if (remainder === "") return listForms(request, version);

  const formId = remainder.slice(1);
  return formId.includes("/") ? undefined : getForm(formId, version);
}

/** Dispatches `/competitions/{compId}` — the only competition route published. */
async function routeCompetitions(
  request: Request,
  version: Version,
  remainder: string,
): Promise<Response | undefined> {
  if (request.method !== "GET" || remainder === "") return undefined;

  const compId = remainder.slice(1);
  return compId.includes("/") ? undefined : getCompetition(compId, version);
}

async function route(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  const path = stripBasePath(pathname);

  if (path === undefined) {
    return routeMissResponse(request.method, pathname);
  }

  // The Worker's health route lives at `/`; here that belongs to the docs
  // homepage, so it answers at the mount point instead.
  if (path === "/") {
    return healthResponse();
  }

  // Opportunities keep their own regex and their own first look, so the
  // corpus-pinned surface is decided exactly as it was before #334.
  const opportunityMatch = OPPORTUNITIES_ROUTE.exec(path);
  if (opportunityMatch) {
    const [, version, segment] = opportunityMatch;
    if (!isSupportedVersion(version)) {
      return unsupportedVersionResponse(version);
    }
    const response = await routeOpportunities(request, version, segment);
    return response ?? routeMissResponse(request.method, pathname);
  }

  const match = RESOURCE_ROUTE.exec(path);
  if (!match) {
    return routeMissResponse(request.method, pathname);
  }

  const [, version, segment, remainder] = match;
  if (!isSupportedVersion(version)) {
    return unsupportedVersionResponse(version);
  }

  const resource = RESOURCE_BY_SEGMENT[segment];
  if (resource === undefined) {
    return routeMissResponse(request.method, pathname);
  }
  if (!isResourceAvailable(resource, version)) {
    return resourceNotInVersionResponse(resource, version);
  }

  const response = await dispatch(request, version, resource, remainder);
  return response ?? routeMissResponse(request.method, pathname);
}

/** Hands a matched resource to its own router. */
function dispatch(
  request: Request,
  version: Version,
  resource: ResourceName,
  remainder: string,
): Promise<Response | undefined> {
  switch (resource) {
    case "awards":
      return routeAwards(request, version, remainder);
    case "orgs":
      return routeOrgs(request, version, remainder);
    case "applications":
      return routeApplications(request, version, remainder);
    case "forms":
      return routeForms(request, version, remainder);
    case "competitions":
      return routeCompetitions(request, version, remainder);
    case "opportunities":
      // Always a no-op, but reachable: `OPPORTUNITIES_ROUTE` allows at most one
      // trailing segment, while `RESOURCE_ROUTE` allows several, so a path like
      // `/opportunities/foo/bar` reaches here after the first regex rejects it.
      // Returning `undefined` turns it into the route miss it should be.
      return Promise.resolve(undefined);
  }
}

/**
 * Entry point for the mock: same contract as the Worker's `fetch`, so the ported
 * test suites drive this function the way they drove the Worker.
 */
export async function handleMockRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }

  // Single choke point for everything `route()` can produce — success,
  // validation error, route miss — plus, via the error boundary, anything it
  // throws. Preflights are the one path that skips it, and
  // `preflightResponse()` sets the same headers itself.
  return withCors(await withErrorBoundary(() => route(request)));
}
