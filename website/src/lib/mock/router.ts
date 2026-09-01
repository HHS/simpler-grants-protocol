/**
 * Routes mock API requests to the opportunity handlers (#1078). This is the
 * website-mounted equivalent of the 3A standalone Worker's entrypoint:
 * `stripBasePath` reduces the pathname to exactly what the Worker saw, and
 * `OPPORTUNITIES_ROUTE` is its regex verbatim — which is what makes the
 * byte-identity corpus in `golden-envelopes.spec.ts` meaningful. Only the
 * opportunity endpoints are served; everything else answers a protocol-shaped
 * 404.
 */

import { SUPPORTED_VERSIONS, isSupportedVersion } from "./data/fixtures";
import {
  getOpportunity,
  listOpportunities,
  searchOpportunities,
} from "./handlers/opportunities";
import { preflightResponse, withCors } from "./http/cors";
import { errorResponse, withErrorBoundary } from "./http/envelope";

const SERVICE_NAME = "CommonGrants mock API";

/**
 * Where the mock is mounted. Shared with `scripts/inject-mock-server.ts` so
 * the injected `servers:` URLs and the router agree.
 */
export const MOCK_API_BASE_PATH = "/api";

/**
 * `/v{version}/common-grants/opportunities` with an optional trailing segment
 * (an `oppId` on GET, `search` on POST). Verbatim from the 3A Worker. The
 * version rides in the path so an SDK `baseUrl` like `/api/v0.4.0` works
 * unchanged.
 */
const OPPORTUNITIES_ROUTE =
  /^\/v([^/]+)\/common-grants\/opportunities(?:\/([^/]+))?$/;

function healthResponse(): Response {
  return Response.json({
    name: SERVICE_NAME,
    supportedVersions: SUPPORTED_VERSIONS,
  });
}

/**
 * Protocol-shaped 404 echoing the full requested path, base included — the one
 * respect in which these bodies differ from the Worker's.
 */
function routeMissResponse(method: string, pathname: string): Response {
  return errorResponse(404, "Not found", [
    {
      field: "path",
      message: `This mock serves the opportunity endpoints only; no route matches ${method} ${pathname}`,
    },
  ]);
}

/**
 * Reduces a docs-origin pathname to the path the Worker would have received,
 * or `undefined` when the request never belonged to the mock. `/api` and
 * `/api/` are both the mount point (the health route); deeper trailing slashes
 * are judged by the Worker's regex.
 */
function stripBasePath(pathname: string): string | undefined {
  if (pathname === MOCK_API_BASE_PATH) return "/";
  if (pathname.startsWith(`${MOCK_API_BASE_PATH}/`)) {
    return pathname.slice(MOCK_API_BASE_PATH.length);
  }
  return undefined;
}

async function route(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  const path = stripBasePath(pathname);

  if (path === undefined) {
    return routeMissResponse(request.method, pathname);
  }

  // The health route answers at the mount point; `/` belongs to the docs.
  if (path === "/") {
    return healthResponse();
  }

  const match = OPPORTUNITIES_ROUTE.exec(path);
  if (!match) {
    return routeMissResponse(request.method, pathname);
  }

  const [, version, segment] = match;
  if (!isSupportedVersion(version)) {
    return errorResponse(404, "Unsupported protocol version", [
      {
        field: "version",
        message: `Version ${version} is not served by this mock; supported versions are ${SUPPORTED_VERSIONS.join(", ")}`,
      },
    ]);
  }

  // `GET .../search` deliberately falls through to the detail handler and
  // answers 400, the same as the Worker.
  if (request.method === "GET") {
    return segment === undefined
      ? listOpportunities(request, version)
      : getOpportunity(segment, version);
  }
  if (request.method === "POST" && segment === "search") {
    return searchOpportunities(request, version);
  }

  return errorResponse(404, "Not found", [
    {
      field: "path",
      message: `No route matches ${request.method} ${pathname}`,
    },
  ]);
}

/** Entry point for the mock: same contract as the Worker's `fetch`. */
export async function handleMockRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }

  // One choke point for everything `route()` returns or throws. Preflights
  // skip it; `preflightResponse()` sets the same headers itself.
  return withCors(await withErrorBoundary(() => route(request)));
}
