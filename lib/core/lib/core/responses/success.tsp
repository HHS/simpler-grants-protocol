import "../pagination.tsp";
import "../sorting.tsp";
import "@typespec/http";

namespace CommonGrants.Responses;

// ############################################################################
// Default success response
// ############################################################################

@Versioning.added(CommonGrants.Versions.v0_1)
model Success {
  @example(200)
  status: int32;

  @example("Success")
  message: string;
}

// ############################################################################
// 200 response
// ############################################################################

/** Template for a 200 response with data
 *
 * @template T The schema for the value of the `"data"` property in this response
 * @example How to specify a custom 200 response model
 *
 * ```typespec
 * // Define a model
 * model CustomModel {
 *   id: string;
 *   description: string;
 * }
 *
 * // Pass that model to the `Ok` template
 * alias CustomModel200 = Responses.Ok<CustomModel>;
 * ```
 */
@doc("A 200 response with data")
@Versioning.added(CommonGrants.Versions.v0_1)
model Ok<T> extends Success {
  // Inherit the 200 status code
  ...Http.OkResponse;

  /** Response data */
  data: T;
}

// ############################################################################
// 200 paginated response
// ############################################################################

/** Template for a 200 response with paginated list of items
 *
 * @template T The schema for the value of the `"items"` property in this response
 * @example How to specify a custom paginated response model
 *
 * ```typespec
 * // Define a model
 * model CustomModel {
 *   id: string;
 *   description: string;
 * }
 *
 * // Pass that model to the `Ok` template
 * alias CustomModelResponse = Responses.Paginated<CustomModel>;
 * ```
 */
@doc("A 200 response with a paginated list of items")
@Versioning.added(CommonGrants.Versions.v0_1)
model Paginated<T> extends Success {
  // Inherit the 200 status code
  ...Http.OkResponse;

  /** Items from the current page */
  @pageItems
  items: T[];

  /** Details about the paginated results */
  paginationInfo: Pagination.PaginatedResultsInfo;
}

// ############################################################################
// 200 sorted response
// ############################################################################

/** A paginated list of items with a sort order
 *
 * @template T The schema for the value of the `"items"` property in this response
 * @example How to specify a custom sorted response model
 *
 * ```typespec
 * // Define a model
 * model CustomModel {
 *   id: string;
 *   description: string;
 * }
 *
 * // Pass that model to the `Sorted` template
 * alias CustomModelSortedResponse = Responses.Sorted<CustomModel>;
 * ```
 */
@doc("A paginated list of items with a sort order")
@Versioning.added(CommonGrants.Versions.v0_1)
model Sorted<T> {
  // Inherit the properties of the Paginated response
  ...Paginated<T>;

  /** The sort order of the items */
  sortInfo: Sorting.SortedResultsInfo;
}

// ############################################################################
// 200 filtered response
// ############################################################################

/** A paginated list of items with a filter
 *
 * @template ItemsT The schema for the value of the `"items"` property in this response
 * @template FilterT The schema for the value of the `"filter"` property in this response
 * @example How to specify a custom filtered response model
 *
 * ```typespec
 * // Define a model for the items in the response
 * model CustomModel {
 *   id: string;
 *   description: string;
 * }
 *
 * // Define a model for the filter in the response
 * model CustomFilter extends Record<Filters.DefaultFilter> {
 *   lastModifiedAt: Filters.DateComparisonFilter;
 * }
 *
 * // Pass that model to the `Filtered` template
 * alias CustomModelFilteredResponse = Responses.Filtered<CustomModel, CustomFilter>;
 * ```
 */
@doc("A paginated list of items with a filter")
@Versioning.added(CommonGrants.Versions.v0_1)
model Filtered<ItemsT, FilterT> extends Success {
  // Inherit the properties of the Sorted response
  ...Sorted<ItemsT>;

  /** The filters applied to the response items */
  filterInfo: {
    filters: FilterT;

    /** Non-fatal errors that occurred during filtering */
    errors?: string[];
  };
}

// ############################################################################
// 201 response
// ############################################################################

/** A 201 response with data
 *
 * @template T The schema for the value of the `"data"` property in this response
 */
@Versioning.added(CommonGrants.Versions.v0_1)
model Created<T> extends Success {
  // Inherit the 201 status code
  ...Http.CreatedResponse;

  /** Response data */
  data: T;
}
