import "../pagination.tsp";
import "../sorting.tsp";
import "@typespec/http";

namespace CommonGrants.Responses;

model Success {
  @example(200)
  status: int32;

  @example("Success")
  message: string;
}

/** Template for a 200 response with data
 *
 * @template T The schema for the value of the `"data"` property in this response
 * @example How to specify a custom 200 response model
 *
 * ```typespec
 *
 * // Define a model
 * model CustomModel {
 *   id: string;
 *   description: string;
 * }
 *
 * // Pass that model to the `Ok` template
 * alias CustomModel200 = Success.Ok<CustomModel>;
 * ```
 */
@doc("A 200 response with data")
model Ok<T> extends Success {
  // Inherit the 200 status code
  ...Http.OkResponse;

  /** Response data */
  data: T;
}

/** Template for a 200 response with paginated list of items
 *
 * @template T The schema for the value of the `"items"` property in this response
 * @example How to specify a custom paginated response model
 *
 * ```typespec
 *
 * // Define a model
 * model CustomModel {
 *   id: string;
 *   description: string;
 * }
 *
 * // Pass that model to the `Ok` template
 * alias CustomModelResponse = Success.Paginated<CustomModel>;
 * ```
 */
@doc("A 200 response with a paginated list of items")
model Paginated<T> extends Success {
  // Inherit the 200 status code
  ...Http.OkResponse;

  /** Items from the current page */
  @pageItems
  items: T[];

  /** Details about the paginated results */
  paginationInfo: Pagination.PaginationInfo;
}
