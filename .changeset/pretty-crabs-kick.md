---
"common-grants-sdk": minor
---

Migrates schemas from FastAPI template to PySDK, and also implements new schemas.

Migrated schemas:
Filters:

- DateComparisonFilter, DateRangeFilter, DefaultFilter, MoneyComparisonFilter, MoneyRangeFilter, StringArrayFilter, StringComparisonFilter
- OppDefaultFilters, OppFilters
  Operators:
- ArrayOperators, ComparisonOperators, EquivalenceOperators, RangeOperators, StringOperators
  Pagination:
- PaginatedBodyParams
  Sorting:
- SortedResultsInfo
- OppSortBy, OppSorting

Implemented schemas:
Filters:

- NumberArrayFilter, NumberComparisonFilter, NumberRangeFilter
  Pagination:
- PaginatedQueryParams, PaginatedResultsInfo
  Responses:
- Error, Filtered, Paginated, Sorted, Success
  Sorting:
- SortBodyParams, SortOrder, SortQueryParams
