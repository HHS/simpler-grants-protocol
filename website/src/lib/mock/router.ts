/**
 * Routes mock API requests to the fixture-backed resource handlers. Mounted
 * under `/api` by the Astro endpoint (`src/pages/api/[...path].ts`).
 *
 * The protocol version comes from the `CG-Version` header, never the path
 * (ADR 0032). A request is matched to a route first, then its version is
 * resolved against the versions that route serves (`data/availability.ts`),
 * then it is dispatched.
 *
 * The opportunity routes keep the behavior the golden byte-identity corpus
 * (`golden-envelopes.spec.ts`) pins.
 */

import {
  APPLICATION_SEARCH_MIN_VERSION,
  versionsFrom,
  versionsServing,
  type ResourceName,
} from "./data/availability";
import { SUPPORTED_VERSIONS, type Version } from "./data/fixtures";
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
import {
  errorResponse,
  versionErrorResponse,
  withErrorBoundary,
} from "./http/envelope";
import {
  DEFAULT_VERSION,
  VERSION_HEADER,
  resolveRequestedVersion,
  withVaryVersion,
  withVersionHeaders,
} from "./http/version";

const SERVICE_NAME = "CommonGrants mock API";

/**
 * Where the mock is mounted. The rendered OpenAPI `servers:` entries read the
 * same constant so Swagger UI calls the same URL.
 */
export const MOCK_API_BASE_PATH = "/api";

/**
 * Resource segment for every route; the remainder is matched per resource
 * below. Segments use `[^/]+`, never `[^/]*`, so a trailing slash
 * is a route-miss 404 rather than a 400 from an empty id — matching what
 * `/opportunities/` has always answered.
 */
const RESOURCE_ROUTE = /^\/common-grants\/([^/]+)((?:\/[^/]+)*)$/;

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

/** Dispatches the opportunity endpoints, whose behavior the golden corpus pins. */
async function routeOpportunities(
  request: Request,
  version: Version,
  remainder: string,
): Promise<Response | undefined> {
  const segment = remainder === "" ? undefined : remainder.slice(1);
  if (segment !== undefined && segment.includes("/")) return undefined;

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

/**
 * Resolves the version for a matched route, then dispatches. A version error
 * carries `Vary` but no `CG-Version-Served`; every response after selection
 * carries both, including a route miss inside a known resource.
 */
async function serveVersioned(
  request: Request,
  pathname: string,
  path: string,
  versions: readonly Version[],
  dispatchRoute: (version: Version) => Promise<Response | undefined>,
): Promise<Response> {
  const resolution = resolveRequestedVersion(
    request.headers.get(VERSION_HEADER),
    {
      label: `${request.method} ${path}`,
      versions,
      defaultVersion: DEFAULT_VERSION,
    },
  );
  if ("error" in resolution) {
    return withVaryVersion(versionErrorResponse(resolution.error));
  }

  const response = await dispatchRoute(resolution.version);
  return withVersionHeaders(
    response ?? routeMissResponse(request.method, pathname),
    resolution.version,
  );
}

/** `POST /applications/search` is served from `APPLICATION_SEARCH_MIN_VERSION`. */
function versionsForRoute(
  resource: ResourceName,
  method: string,
  remainder: string,
): readonly Version[] {
  if (
    resource === "applications" &&
    method === "POST" &&
    remainder === "/search"
  ) {
    return versionsFrom(APPLICATION_SEARCH_MIN_VERSION);
  }
  return versionsServing(resource);
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

  const match = RESOURCE_ROUTE.exec(path);
  if (!match) {
    return routeMissResponse(request.method, pathname);
  }

  const [, segment, remainder] = match;
  const resource = RESOURCE_BY_SEGMENT[segment];
  if (resource === undefined) {
    return routeMissResponse(request.method, pathname);
  }

  return serveVersioned(
    request,
    pathname,
    path,
    versionsForRoute(resource, request.method, remainder),
    (version) => dispatch(request, version, resource, remainder),
  );
}

/** Hands a matched resource to its own router. */
function dispatch(
  request: Request,
  version: Version,
  resource: ResourceName,
  remainder: string,
): Promise<Response | undefined> {
  switch (resource) {
    case "opportunities":
      return routeOpportunities(request, version, remainder);
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
