/**
 * CORS for the mock API, applied once around the router rather than per
 * handler. The `*` origin is fine because the mock serves public, stateless
 * fixture data and holds no credentials.
 */

/**
 * `X-API-Key` and `Authorization` are listed because the TS SDK sends them
 * when auth is configured; a preflight must name non-simple headers.
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
  "Access-Control-Max-Age": "86400",
};

/**
 * Answers 204 to an `OPTIONS` preflight for any path, matched or not — on
 * purpose: a preflight asks about policy, not whether the resource exists.
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
