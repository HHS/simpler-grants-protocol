---
"@common-grants/core": minor
---

Add non-templated response schemas (`Ok`, `Paginated`, `Sorted`, `Filtered`, `Created`) so they are emitted as standalone JSON schemas, and rename the templated variants with a `T` suffix (`OkT<T>`, `PaginatedT<T>`, `SortedT<T>`, `FilteredT<ItemsT, FilterT>`, `CreatedT<T>`). Routes now use the `T`-suffixed templates; specs consuming the old templated names (e.g. `Responses.Ok<T>`) must switch to the `T`-suffixed equivalents. The wire contract of route responses is unchanged.
