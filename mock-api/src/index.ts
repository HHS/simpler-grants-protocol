/**
 * Standalone Cloudflare Worker serving deterministic CommonGrants mock data.
 *
 * Routing replaces MSW's handler registration from the #1049 spike: instead of
 * `http.get(path, resolver)` matching inside a service worker, `route()` below
 * matches `url.pathname` itself and hands off to the ported handlers in
 * `src/handlers/opportunities.ts` (#1077-T3).
 *
 * Only the opportunity endpoints are served. Every other spec path answers a
 * protocol-shaped 404 — an accepted limit of the experiment, and a data point
 * for how much of the spec a production mock would have to cover.
 */

import { SUPPORTED_VERSIONS, isSupportedVersion } from "./data/fixtures";
import { getOpportunity, listOpportunities, searchOpportunities } from "./handlers/opportunities";
import { preflightResponse, withCors } from "./http/cors";
import { errorResponse, withErrorBoundary } from "./http/envelope";

const SERVICE_NAME = "@common-grants/mock-api";

/**
 * `/v{version}/common-grants/opportunities` with an optional trailing segment:
 * an `oppId` on GET, the literal `search` on POST.
 *
 * The protocol version rides in the path rather than a header or query param so
 * that an SDK `baseUrl` of `https://<worker>.workers.dev/v0.4.0` works unchanged
 * (`Client.url()` concatenates base + path), and each rendered spec file can
 * carry a version-correct `servers:` URL (#1077-T6).
 *
 * `version` is captured loosely (`[^/]+`) and narrowed by `isSupportedVersion`,
 * so `/vabc/...` and `/v9.9.9/...` both reach the same "unsupported version"
 * answer instead of falling through to a bare route miss.
 */
const OPPORTUNITIES_ROUTE = /^\/v([^/]+)\/common-grants\/opportunities(?:\/([^/]+))?$/;

function healthResponse(): Response {
  return Response.json({
    name: SERVICE_NAME,
    supportedVersions: SUPPORTED_VERSIONS,
  });
}

async function route(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === "/") {
    return healthResponse();
  }

  const match = OPPORTUNITIES_ROUTE.exec(pathname);
  if (!match) {
    return errorResponse(404, "Not found", [
      {
        field: "path",
        message: `This mock serves the opportunity endpoints only; no route matches ${request.method} ${pathname}`,
      },
    ]);
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
  // spike's `:oppId` pattern gave, since only POST registered on `/search`.
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

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return preflightResponse();
    }

    // Single choke point for everything `route()` can produce — success,
    // validation error, route miss — plus, via the error boundary, anything it
    // throws. Preflights are the one path that skips it, and
    // `preflightResponse()` sets the same headers itself.
    return withCors(await withErrorBoundary(() => route(request)));
  },
} satisfies ExportedHandler;
