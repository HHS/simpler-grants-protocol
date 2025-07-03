import "@typespec/http";
import "@typespec/json-schema";

using TypeSpec.Http;
using TypeSpec.JsonSchema;
/** Models for sorting
 *
 * @example How to use the `Sorting` namespace
 * ```typespec
 *
 * using CommonGrants // Exposes the `Sorting` and `Responses` namespaces
 * using TypeSpec.Http;
 *
 * @route("/foo/")
 * @get
 * op list(sorting: Sorting.SortQueryParams): Responses.Sorted<MyModel>;
 * ```
 */
namespace CommonGrants.Sorting;

enum SortOrder {
  asc,
  desc,
}

/** Query parameters for sorting */
model SortQueryParams {
  /** The field to sort by */
  @query
  @example("lastModifiedAt")
  sortBy: unknown;

  /** Implementation-defined sort key */
  @query
  @example("customField")
  customSortBy?: string;

  /** The order to sort by */
  @query
  @example(SortOrder.asc)
  sortOrder?: SortOrder;
}

/** Sorting parameters included in the request body */
model SortBodyParams {
  /** The field to sort by */
  @example("lastModifiedAt")
  sortBy: unknown;

  /** Implementation-defined sort key */
  @example("customField")
  customSortBy?: string;

  /** The order to sort by */
  @example(SortOrder.asc)
  sortOrder?: SortOrder;
}

/** Information about the sort order of the items returned */
model SortedResultsInfo {
  /** The field results are sorted by, or "custom" if an implementation-defined sort key is used */
  @example("lastModifiedAt")
  sortBy: string;

  /** Implementation-defined sort key used to sort the results, if applicable */
  @example("customField")
  customSortBy?: string;

  /** The order in which the results are sorted, e.g. ascending or descending */
  @example(SortOrder.asc)
  sortOrder: SortOrder;

  /** Non-fatal errors that occurred during sorting */
  errors?: string[];
}
