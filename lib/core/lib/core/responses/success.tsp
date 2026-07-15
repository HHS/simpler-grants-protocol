import "../pagination.tsp";
import "../sorting.tsp";
import "@typespec/http";

// Templated models aren't emitted as standalone JSON schemas, so each response
// family pairs a non-templated model (emitted, documented) with a `T`-suffixed
// template (used by routes). Shared `*Base` models keep the pairs in sync.
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

/** A 200 response with data of an unspecified shape
 *
 * Routes use the typed `OkT<T>` variant.
 */
@doc("A 200 response with data")
@Versioning.added(CommonGrants.Versions.v0_1)
model Ok extends Success {
  /** Response data */
  data: unknown;
}

/** Template for a 200 response with typed data
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
 * // Pass that model to the `OkT` template
 * alias CustomModel200 = Responses.OkT<CustomModel>;
 * ```
 */
@doc("A 200 response with typed data")
@Versioning.added(CommonGrants.Versions.v0_1)
model OkT<T> extends Success {
  // Inherit the 200 status code
  ...Http.OkResponse;

  /** Response data */
  data: T;
}

// ############################################################################
// 200 paginated response
// ############################################################################

/** Body properties shared by `Paginated` and `PaginatedT<T>`
 *
 * @template T The schema for the value of the `"items"` property in this response
 */
@Versioning.added(CommonGrants.Versions.v0_1)
model PaginatedBase<T> {
  /** Items from the current page */
  @pageItems
  items: T[];

  /** Details about the paginated results */
  paginationInfo: Pagination.PaginatedResultsInfo;
}

/** A 200 response with a paginated list of items of an unspecified shape
 *
 * Routes use the typed `PaginatedT<T>` variant.
 */
@doc("A 200 response with a paginated list of items")
@Versioning.added(CommonGrants.Versions.v0_1)
model Paginated extends Success {
  ...PaginatedBase<unknown>;
}

/** Template for a 200 response with a paginated list of typed items
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
 * // Pass that model to the `PaginatedT` template
 * alias CustomModelResponse = Responses.PaginatedT<CustomModel>;
 * ```
 */
@doc("A 200 response with a paginated list of typed items")
@Versioning.added(CommonGrants.Versions.v0_1)
model PaginatedT<T> extends Success {
  // Inherit the 200 status code
  ...Http.OkResponse;

  ...PaginatedBase<T>;
}

// ############################################################################
// 200 sorted response
// ############################################################################

/** Body properties shared by `Sorted` and `SortedT<T>`
 *
 * @template T The schema for the value of the `"items"` property in this response
 */
@Versioning.added(CommonGrants.Versions.v0_1)
model SortedBase<T> {
  ...PaginatedBase<T>;

  /** The sort order of the items */
  sortInfo: Sorting.SortedResultsInfo;
}

/** A paginated list of items of an unspecified shape with a sort order
 *
 * Routes use the typed `SortedT<T>` variant.
 */
@doc("A paginated list of items with a sort order")
@Versioning.added(CommonGrants.Versions.v0_1)
model Sorted extends Success {
  ...SortedBase<unknown>;
}

/** Template for a paginated list of typed items with a sort order
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
 * // Pass that model to the `SortedT` template
 * alias CustomModelSortedResponse = Responses.SortedT<CustomModel>;
 * ```
 */
@doc("A paginated list of typed items with a sort order")
@Versioning.added(CommonGrants.Versions.v0_1)
model SortedT<T> extends Success {
  // Inherit the 200 status code
  ...Http.OkResponse;

  ...SortedBase<T>;
}

// ############################################################################
// 200 filtered response
// ############################################################################

/** Body properties shared by `Filtered` and `FilteredT<ItemsT, FilterT>`
 *
 * @template ItemsT The schema for the value of the `"items"` property in this response
 * @template FilterT The schema for the value of the `"filter"` property in this response
 */
@Versioning.added(CommonGrants.Versions.v0_1)
model FilteredBase<ItemsT, FilterT> {
  ...SortedBase<ItemsT>;

  /** The filters applied to the response items */
  filterInfo: {
    filters: FilterT;

    /** Non-fatal errors that occurred during filtering */
    errors?: string[];
  };
}

/** A paginated list of items of an unspecified shape with a filter
 *
 * Routes use the typed `FilteredT<ItemsT, FilterT>` variant.
 */
@doc("A paginated list of items with a filter")
@Versioning.added(CommonGrants.Versions.v0_1)
model Filtered extends Success {
  ...FilteredBase<unknown, unknown>;
}

/** Template for a paginated list of typed items with a typed filter
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
 * // Pass that model to the `FilteredT` template
 * alias CustomModelFilteredResponse = Responses.FilteredT<CustomModel, CustomFilter>;
 * ```
 */
@doc("A paginated list of typed items with a typed filter")
@Versioning.added(CommonGrants.Versions.v0_1)
model FilteredT<ItemsT, FilterT> extends Success {
  // Inherit the 200 status code
  ...Http.OkResponse;

  ...FilteredBase<ItemsT, FilterT>;
}

// ############################################################################
// 201 response
// ############################################################################

/** A 201 response with data of an unspecified shape
 *
 * Routes use the typed `CreatedT<T>` variant.
 */
@doc("A 201 response with data")
@Versioning.added(CommonGrants.Versions.v0_1)
model Created extends Success {
  /** Response data */
  data: unknown;
}

/** A 201 response with typed data
 *
 * @template T The schema for the value of the `"data"` property in this response
 */
@doc("A 201 response with typed data")
@Versioning.added(CommonGrants.Versions.v0_1)
model CreatedT<T> extends Success {
  // Inherit the 201 status code
  ...Http.CreatedResponse;

  /** Response data */
  data: T;
}
