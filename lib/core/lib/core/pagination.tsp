import "@typespec/http";

using TypeSpec.Http;
using TypeSpec.JsonSchema;

/** Models and utilities for pagination */
@jsonSchema
namespace CommonGrants.Pagination;

/** Query parameters for paginated routes */
@Versioning.added(CommonGrants.Versions.v0_1)
model PaginatedQueryParams {
  /** The page to return */
  @query
  @pageIndex
  @minValue(1)
  page?: int32 = 1;

  /** The number of items to return per page */
  @query
  @pageSize
  @minValue(1)
  pageSize?: int32 = 100;
}

/** Body parameters for paginated routes */
@Versioning.added(CommonGrants.Versions.v0_1)
model PaginatedBodyParams {
  /** The page to return */
  @pageIndex
  @minValue(1)
  page?: int32 = 1;

  /** The number of items to return per page */
  @pageSize
  @minValue(1)
  pageSize?: int32 = 100;
}

/** Details about the paginated results */
@Versioning.added(CommonGrants.Versions.v0_1)
model PaginatedResultsInfo {
  /** Current page number (indexing starts at 1) */
  @example(1)
  @minValue(1)
  page: int32;

  /** Number of items per page */
  @example(20)
  @minValue(1)
  pageSize: integer;

  /** Total number of items across all pages */
  @example(100)
  totalItems?: integer;

  /** Total number of pages */
  @example(5)
  totalPages?: integer;
}
