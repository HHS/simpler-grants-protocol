/**
 * Routes mock API requests to the fixture-backed resource handlers. Mounted
 * under `/api` by the Astro endpoint (`src/pages/api/[...path].ts`).
 *
 * Opportunities keep the 3A Worker's regex verbatim and are matched first, so
 * the golden byte-identity corpus (`golden-envelopes.spec.ts`) stays pinned.
 * Version gating lives in `data/availability.ts`.
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
 * Where the mock is mounted. The rendered OpenAPI `servers:` entries read the
 * same constant so Swagger UI calls the same URL.
 */
export const MOCK_API_BASE_PATH = "/api";

/**
 * `/v{version}/common-grants/opportunities` with an optional trailing segment.
 * Verbatim from the Worker so the corpus-pinned surface matches identically;
 * `version` is captured loosely and narrowed by `isSupportedVersion`.
 */
const OPPORTUNITIES_ROUTE =
  /^\/v([^/]+)\/common-grants\/opportunities(?:\/([^/]+))?$/;

/**
 * Version prefix + resource segment for every non-opportunity route; the
 * remainder is matched per resource below. Segments use `[^/]+`, never
 * `[^/]*`, so a trailing slash is a route-miss 404 rather than a 400 from an
 * empty id — matching what `/opportunities/` has always answered.
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
 * Protocol-shaped 404 for a route miss. Echoes the full path, base included —
 * the one way these bodies differ from the Worker's.
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
 * 404 for a resource added after the requested version. Deliberately distinct
 * from a plain route miss — it tells the caller what to change.
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
 * Reduces a docs-origin pathname to the path the Worker would have seen, or
 * `undefined` when the request isn't the mock's. `/api` and `/api/` are both
 * the health route; deeper trailing slashes are judged by the resource regexes.
 */
function stripBasePath(pathname: string): string | undefined {
  if (pathname === MOCK_API_BASE_PATH) return "/";
  if (pathname.startsWith(`${MOCK_API_BASE_PATH}/`)) {
    return pathname.slice(MOCK_API_BASE_PATH.length);
  }
  return undefined;
}

/**
 * Dispatches the opportunity endpoints — matched before anything else so the
 * corpus-pinned surface is unaffected by the routing added around it.
 */
async function routeOpportunities(
  request: Request,
  version: Version,
  segment: string | undefined,
): Promise<Response | undefined> {
  // `GET .../search` falls through to the detail handler and answers 400
  // "Must be a valid UUID", as the Worker does — only POST serves `/search`.
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
  // As with opportunities, `GET .../search` falls through to the detail
  // handler — only POST serves `/search` and `/start`.
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

  // The health route answers at the mount point; the docs homepage owns `/`.
  if (path === "/") {
    return healthResponse();
  }

  // Opportunities get their own regex and the first look (see module doc).
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
      // Reachable when a path like `/opportunities/foo/bar` fails the stricter
      // OPPORTUNITIES_ROUTE; `undefined` makes it the route miss it should be.
      return Promise.resolve(undefined);
  }
}

/** Entry point for the mock: same contract as the Worker's `fetch`. */
export async function handleMockRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }

  // Every non-preflight response passes through CORS and the error boundary;
  // `preflightResponse()` sets the same headers itself.
  return withCors(await withErrorBoundary(() => route(request)));
}
