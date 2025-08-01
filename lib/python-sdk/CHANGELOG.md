# common-grants-sdk

## 0.2.0

### Minor Changes

- 653c227: Migrated schemas from FastAPI template to PySDK:

  - Filters: DateComparisonFilter, DateRangeFilter, DefaultFilter, MoneyComparisonFilter, MoneyRangeFilter, StringArrayFilter, StringComparisonFilter, OppDefaultFilters, OppFilters
  - Operators: ArrayOperators, ComparisonOperators, EquivalenceOperators, RangeOperators, StringOperators
  - Pagination: PaginatedBodyParams
  - Sorting: SortedResultsInfo, OppSortBy, OppSorting

  Implemented schemas to align with Core v0.2.0:

  - Filters: NumberArrayFilter, NumberComparisonFilter, NumberRangeFilter
  - Pagination: PaginatedQueryParams, PaginatedResultsInfo
  - Responses: Error, Filtered, Paginated, Sorted, Success
  - Sorting: SortBodyParams, SortOrder, SortQueryParams

## 0.1.0

### Minor Changes

- eb15708: Update fields and opportunity models to support core v0.1.0
