import "@typespec/http";

using TypeSpec.Http;

/** Utility models and functions for API routes */
namespace CommonGrants.Routes.Utils;

/** A set of query parameters for paginated routes */
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

model PaginatedBodyParams {
  /** The page to return */
  @pageIndex
  page?: int32 = 1;

  /** The number of items to return per page */
  @pageSize
  pageSize?: int32 = 100;
}
