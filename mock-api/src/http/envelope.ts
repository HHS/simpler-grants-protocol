/**
 * Protocol response envelopes, shared by the router and the opportunity
 * handlers so a version-prefix 404 and a handler-level 404 are the same shape
 * on the wire.
 *
 * Ported from the #1049 spike's `handlers.ts`, with MSW's `HttpResponse.json`
 * swapped for the platform `Response.json` — the only behavioral difference is
 * the constructor; both emit `application/json` with the given status.
 */

/** A single `{field, message}` validation error carried in the `errors` array. */
export interface FieldError {
  field: string;
  message: string;
}

/** Builds the protocol `Error` envelope (`status`, `message`, `errors`). */
export function errorResponse(status: number, message: string, errors: unknown[]): Response {
  return Response.json({ status, message, errors }, { status });
}

/** Builds the protocol success envelope (`status: 200`, `message`, plus the endpoint-specific body). */
export function successResponse(body: Record<string, unknown>): Response {
  return Response.json({ status: 200, message: "Success", ...body });
}

/**
 * Runs `handle`, converting an unexpected throw into a protocol-shaped 500.
 *
 * Under MSW the same throw surfaced as a test-time unhandled rejection. On a
 * real cross-origin Worker it costs the caller much more: no response object
 * means no CORS headers, so the browser reports an opaque CORS failure and the
 * actual cause never reaches the console. Returning an envelope keeps every
 * outcome on the path that `withCors` decorates.
 *
 * No reachable throw is known today — the search handler validates its body
 * rather than trusting it — so this is a backstop for later changes, not a live
 * code path.
 */
export async function withErrorBoundary(handle: () => Promise<Response>): Promise<Response> {
  try {
    return await handle();
  } catch (cause) {
    console.error("Unhandled error while routing request", cause);
    return errorResponse(500, "Internal error", [
      { field: "server", message: "The mock failed to handle this request" },
    ]);
  }
}
