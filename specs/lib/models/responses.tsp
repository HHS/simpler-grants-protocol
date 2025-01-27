import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

namespace CommonGrants.Models;

/** Standard response template for read operations */
model ReadResponse<T> {
  ...OkResponse;
  ...Body<T>;
}

/** Standard error response */
@error
model ErrorResponse<Code extends int32, Message extends string> {
  /** Error code */
  code: Code;

  /** Human-readable error message */
  message: Message;

  /** Additional error details if available */
  details?: Record<unknown>;
}

/** Template for paginated responses */
model PaginatedItems<T> {
  @pageItems
  items: T[];
}
