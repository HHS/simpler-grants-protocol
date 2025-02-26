import "@typespec/http";

using TypeSpec.Http;

/** Models and utilities for pagination */
namespace CommonGrants.Pagination;

/** Query parameters for paginated routes */
model PaginatedQueryParams {
  /** The page to return */
  @query
  @pageIndex
  page?: int32 = 1;

  /** The number of items to return per page */
  @query
  @pageSize
  pageSize?: int32 = 100;
}

/** Body parameters for paginated routes */
model PaginatedBodyParams {
  /** The page to return */
  @pageIndex
  page?: int32 = 1;

  /** The number of items to return per page */
  @pageSize
  pageSize?: int32 = 100;
}

/** Details about the paginated results */
model PaginationInfo {
  /** Current page number (indexing starts at 1) */
  @example(1)
  page: int32;

  /** Number of items per page */
  @example(20)
  pageSize: integer;

  /** Total number of items across all pages */
  @example(100)
  totalItems: integer;

  /** Total number of pages */
  @example(5)
  totalPages: integer;

  /** URL for the next page if available */
  @example("/opportunities?page=2&pageSize=20")
  nextPageUrl?: string;

  /** URL for the previous page if available */
  @example("/opportunities?page=1&pageSize=20")
  previousPageUrl?: string;
}
