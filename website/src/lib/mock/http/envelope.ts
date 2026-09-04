/**
 * Protocol response envelopes, shared by the router and the handlers so every
 * error is the same shape on the wire. Each builder mirrors the HTTP status
 * into the body's `status` field, as `Responses.Success` declares.
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

/** Builds a `Responses.CreatedT` envelope — 201 with the record under `data`. */
export function createdResponse(data: unknown): Response {
  return Response.json(
    { status: 201, message: "Success", data },
    { status: 201 },
  );
}

/**
 * Builds a `Responses.AcceptedT` envelope — 202 with the record under `data`,
 * plus an optional `Location` header for polling.
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
 * Runs `handle`, converting an uncaught throw into a protocol-shaped 500. An
 * uncaught throw would skip `withCors`, so the browser would report an opaque
 * CORS error instead of the actual failure.
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
