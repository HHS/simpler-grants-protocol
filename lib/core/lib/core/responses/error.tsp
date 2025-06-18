import "@typespec/http";

namespace CommonGrants.Responses;

/** A standard error response schema, used to create custom error responses
 *
 * @example - How to use this model to create custom error response schemas
 *
 * ```
 * import "@typespec/http"
 *
 * alias Unauthorized = Error & Http.UnauthorizedResponse
 * ```
 */
@error
@doc("A non-2xx response schema")
model Error {
  @example(400)
  status: int32;

  /** Human-readable error message */
  @example("Error")
  message: string;

  /** List of errors */
  errors: Array<unknown>;
}

alias Unauthorized = Error & Http.UnauthorizedResponse;
alias NotFound = Error & Http.NotFoundResponse;
