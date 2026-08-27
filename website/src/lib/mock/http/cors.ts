/**
 * Cross-origin access for the mock Worker.
 *
 * The whole point of the standalone-Worker experiment is that the docs site
 * ("Try it out" on `commongrants.org`), a copied `curl`, and the TS SDK all hit
 * one real URL — and the first two of those are cross-origin browser requests.
 * So CORS is applied once, wrapping the router, rather than per handler: a
 * response that skipped these headers would be invisible to the browser
 * regardless of its status code, and errors are exactly the responses a
 * playground visitor most needs to see.
 *
 * `Access-Control-Allow-Origin: *` is correct here because the mock serves
 * public, deterministic fixture data and holds no credentials or session state.
 * A productionized mock with per-key rate limits would need an origin allowlist
 * instead — noted in the findings write-up (#1077-T7).
 */

/**
 * `X-API-Key` and `Authorization` are listed because the TS SDK sends one or
 * the other whenever auth is configured (`Auth.apiKey()` / bearer). Both are
 * non-simple request headers, so a browser refuses the request unless the
 * preflight names them explicitly — even though this mock ignores their values.
 *
 * `PUT` and `PATCH` joined the method list with #3C-2-T1, which added the first
 * write endpoints (`PUT /applications/{appId}/submit`, `PATCH /orgs/{orgId}`,
 * and the rest). A method the mock routes but the preflight omits is invisible
 * to a cross-origin browser caller regardless of what the handler returns, so
 * this list has to track the router's.
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
  "Access-Control-Max-Age": "86400",
};

/**
 * Answers an `OPTIONS` preflight for any path, matched or not.
 *
 * Deliberately blanket: a preflight is a question about the *policy* for a
 * method/header pair, not about whether the resource exists, and answering 404
 * to it makes a browser report an opaque CORS failure instead of the
 * protocol-shaped 404 the real request would have returned.
 */
export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Returns `response` with the CORS headers added, leaving status and body untouched. */
export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
