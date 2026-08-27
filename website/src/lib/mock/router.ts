/**
 * Routes mock API requests to the ported opportunity handlers (#1078).
 *
 * This is the website's re-authored equivalent of the 3A standalone Worker's
 * `mock-api/src/index.ts`. It is the one piece of that experiment that could
 * *not* be copied: the Worker's entrypoint is a
 * `export default { fetch } satisfies ExportedHandler`, and it owns the whole
 * origin, so its routes hang off `/`. Here the docs site owns `/`, the mock is
 * mounted under `/api`, and the entrypoint is an Astro endpoint
 * (`src/pages/api/[...path].ts`) that delegates to `handleMockRequest` below.
 * Everything downstream of routing — fixtures, filtering, sorting, pagination,
 * envelopes, CORS — is the Worker's code unchanged.
 *
 * Byte-identity with the Worker (asserted by
 * `__tests__/lib/mock/golden-envelopes.spec.ts`) is structural rather than
 * incidental: `stripBasePath` reduces the pathname to exactly what the Worker
 * would have seen, and `OPPORTUNITIES_ROUTE` below is its regex verbatim. So
 * anything the two hosts could disagree about is decided in one place, and
 * behavior at the edges — a trailing slash, a `%2F`, a doubled slash — is
 * inherited from the Worker rather than re-litigated here.
 *
 * Only the opportunity endpoints are served. Every other spec path answers a
 * protocol-shaped 404 — an accepted limit of the experiment, and a data point
 * for how much of the spec a production mock would have to cover.
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

function healthResponse(): Response {
  return Response.json({
    name: SERVICE_NAME,
    supportedVersions: SUPPORTED_VERSIONS,
  });
}

/**
 * Protocol-shaped 404 for anything outside the opportunity endpoints. Echoes the
 * *full* requested path, base included, because that is what the caller typed —
 * the only respect in which these bodies differ from the Worker's, and the
 * reason `golden-envelopes.spec.ts` marks these two cases `pathEchoing`.
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
 * Reduces a docs-origin pathname to the path the Worker would have received, or
 * `undefined` when the request never belonged to the mock at all.
 *
 * Astro routes `/api/**` here, but `request.url` carries the raw path as typed,
 * so this is also the one place trailing slashes are considered: `/api` and
 * `/api/` are both the mount point itself (the health route), while a trailing
 * slash deeper in the path stays in the remainder and is judged by the Worker's
 * regex — which rejects it, exactly as the Worker does.
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

  // The Worker's health route lives at `/`; here that belongs to the docs
  // homepage, so it answers at the mount point instead.
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

  return errorResponse(404, "Not found", [
    {
      field: "path",
      message: `No route matches ${request.method} ${pathname}`,
    },
  ]);
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
