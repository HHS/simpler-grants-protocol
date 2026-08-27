/**
 * Protocol response envelopes, shared by the router and every resource handler
 * so a version-prefix 404 and a handler-level 404 are the same shape on the
 * wire.
 *
 * Ported from the #1049 spike's `handlers.ts`, with MSW's `HttpResponse.json`
 * swapped for the platform `Response.json` — the only behavioral difference is
 * the constructor; both emit `application/json` with the given status.
 *
 * The 201/202 builders arrived with #3C-2-T1, which added the first write
 * endpoints: `POST /applications/start` answers `Responses.CreatedT` and
 * `POST /orgs/{orgId}/changes` answers `Responses.AcceptedT`. Every builder
 * writes the HTTP status into the body's `status` field as well, because
 * `Responses.Success` declares one and the protocol's own examples mirror the
 * transport status there.
 */

/** A single `{field, message}` validation error carried in the `errors` array. */
export interface FieldError {
  field: string;
  message: string;
}

/** Builds the protocol `Error` envelope (`status`, `message`, `errors`). */
export function errorResponse(
  status: number,
  message: string,
  errors: unknown[],
): Response {
  return Response.json({ status, message, errors }, { status });
}

/** Builds the protocol success envelope (`status: 200`, `message`, plus the endpoint-specific body). */
export function successResponse(body: Record<string, unknown>): Response {
  return Response.json({ status: 200, message: "Success", ...body });
}

/**
 * Builds a `Responses.CreatedT` envelope — HTTP 201 with the created record
 * under `data`.
 */
export function createdResponse(data: unknown): Response {
  return Response.json(
    { status: 201, message: "Success", data },
    { status: 201 },
  );
}

/**
 * Builds a `Responses.AcceptedT` envelope — HTTP 202 with the accepted record
 * under `data`.
 *
 * `AcceptedT` declares an optional `Location` header pointing at where the
 * accepted resource can be retrieved, so callers polling a queued change have
 * somewhere to poll. It is sent whenever the caller gave us a URL to build.
 *
 * @param data - The accepted record.
 * @param location - Absolute or root-relative URL for the accepted resource.
 */
export function acceptedResponse(data: unknown, location?: string): Response {
  return Response.json(
    { status: 202, message: "Success", data },
    {
      status: 202,
      headers: location === undefined ? undefined : { Location: location },
    },
  );
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
export async function withErrorBoundary(
  handle: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handle();
  } catch (cause) {
    console.error("Unhandled error while routing request", cause);
    return errorResponse(500, "Internal error", [
      { field: "server", message: "The mock failed to handle this request" },
    ]);
  }
}
