import "@typespec/http";

using TypeSpec.Http;

/** Utility models and functions for API routes */
namespace Core.Routes.Utils;

/** A set of query parameters for paginated routes */
model PaginatedQuery {
  /** The page to return */
  @query
  @pageIndex
  page?: int32 = 1;

  /** The number of items to return per page */
  @query
  @pageSize
  pageSize?: int32 = 100;
}
