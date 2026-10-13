import "@common-grants/core";

using TypeSpec.JsonSchema;

/** Concrete request and response contracts for the Core award routes. */
@jsonSchema
namespace CommonGrants.Sdk;

/** Query parameters accepted by `Routes.Awards.list`. */
model AwardsListRequest is Pagination.PaginatedQueryParams;

/** Path parameters accepted by `Routes.Awards.read`. */
model AwardGetRequest {
  awdId: Types.uuid;
}

/** Request body accepted by `Routes.Awards.search`. */
model AwdSearchRequest {
  search?: string;
  filters?: Models.AwdFilters;
  sorting?: Models.AwdSorting;
  pagination?: Pagination.PaginatedBodyParams;
}

/** Success response returned by `Routes.Awards.read`. */
model AwardResponse {
  status: 200;
  message: string;
  data: Models.AwardBase;
}

/** Success response returned by `Routes.Awards.list`. */
model AwardsListResponse {
  status: 200;
  message: string;
  items: Models.AwardBase[];
  paginationInfo: Pagination.PaginatedResultsInfo;
}

/** Sorted award response contract. */
model AwardsSortedResponse extends AwardsListResponse {
  sortInfo: Sorting.SortedResultsInfo;
}

/** Success response returned by `Routes.Awards.search`. */
model AwardsFilteredResponse extends AwardsSortedResponse {
  filterInfo: {
    filters: Models.AwdFilters;
    errors?: string[];
  };
}
