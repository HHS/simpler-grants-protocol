---
title: Filtering strategy
description: ADR documenting the approach to filtering in the CommonGrants protocol.
---

## Summary

### Problem statement

The CommonGrants protocol needs a standardized approach to filtering across endpoints that balances consistency, flexibility, and ease of implementation.

### Sub-questions

- Should filters be passed in the request body or as query parameters?
- If the request body accepts a `filters` parameter, should it be an object or an array?
- Which filter operators (e.g. `eq`, `neq`, `gt`, etc.) should be supported?
- How should the protocol support implementation-defined filters?

### Decision drivers

- **Consistency:** Filters should be consistent across endpoints.
- **Flexibility:** Filters should support complex queries while keeping implementation straightforward.
- **Compatibility:** Filters should be easy to combine with pagination and sorting.
- **Extensibility:** Filters should provide a way to support implementation-defined filters.

## Decision outcome

API endpoints that support filtering should be POST operations that accept a `filters` parameter in the request body. Filters will be defined using a standard schema to ensure consistency across different endpoints.

### Filtering approach

- The `filters` parameter MUST be included at the root of the request body.
- Each filter MUST conform to the `Filter` schema, which contains:

| Property    | Type | Required | Description                              |
| ----------- | ---- | -------- | ---------------------------------------- |
| `operation` | enum | Yes      | The operation to perform on the value    |
| `value`     | any  | Yes      | The data to use for the filter operation |

- Supported operations:

| Operation | Description              | Supported `value` types                      |
| --------- | ------------------------ | -------------------------------------------- |
| `eq`      | Equal to                 | string, number, boolean, date                |
| `neq`     | Not equal to             | string, number, boolean, date                |
| `gt`      | Greater than             | number, date                                 |
| `gte`     | Greater than or equal to | number, date                                 |
| `lt`      | Less than                | number, date                                 |
| `lte`     | Less than or equal to    | number, date                                 |
| `like`    | Contains                 | string                                       |
| `in`      | In list                  | array                                        |
| `not_in`  | Not in list              | array                                        |
| `between` | Between two values       | range object with `min` and `max` properties |

### Custom filters

- If a route supports implementation-defined filters, it MUST include a `customFilters` property.
- This property must be an object whose values match the `Filter` schema.
- Unsupported custom filters should be ignored and reported in the `filterInfo.errors` property.

### Examples

An example of a request body that includes a _standard_ filter:

```json
{
  "filters": {
    "title": {
      "value": "example",
      "operation": "like"
    },
    "closedDateRange": {
      "value": {
        "min": "2024-01-01",
        "max": "2024-01-31"
      },
      "operation": "between"
    }
  }
}
```

An example of a request body that includes both _standard_ and _custom_ filters:

```json
{
  "filters": {
    "title": {
      "value": "example",
      "operation": "like"
    },
    "customFilters": {
      "agency": {
        "value": ["Department of Transportation"],
        "operation": "in"
      }
    }
  }
}
```

### Consequences

- **Positive**
  - Establishes a consistent pattern for filtering across endpoints.
  - Supports more complex filters than query parameters.
  - Provide a consistent way to extend the protocol with implementation-defined filters.
- **Negative**
  - Passing filters in the request body makes it harder to cache requests.
  - Using an object to represent filters makes it harder to support complex queries that include multiple filters with the same property name.

## Options considered

These are the other options we considered but did not choose.

### Query parameters only

- **Pros**
  - Easy to implement for simple filters.
  - Fully cacheable in HTTP caches.
- **Cons**
  - Difficult to support complex filtering.
  - Doesn't provide a way to support implementation-defined filters.

### A `filter` request body parameter of type `array`

- **Pros**
  - Easy to understand.
  - Supports complex filtering with multiple filters for the same property.
  - Could support index-based filter logic (e.g. `(1 AND 2) OR (3 AND 4)`).
- **Cons**
  - Doesn't provide a way to support implementation-defined filters.
  - Makes it harder to define standard and custom filters in the OpenAPI document.
  - Makes it harder for API servers to parse request bodies in a deterministic way.
