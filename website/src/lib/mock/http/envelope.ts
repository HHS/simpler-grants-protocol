/**
 * Protocol response envelopes, shared by the router and the handlers so every
 * error is the same shape on the wire.
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
