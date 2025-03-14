---
title: Sorting strategy
description: ADR documenting the approach to sorting in the CommonGrants protocol.
---

The CommonGrants protocol needs a standardized approach to sorting across endpoints that balances consistency, flexibility, and ease of implementation.

### Questions

- Should sorting parameters be passed as query parameters or in the request body?
- How should the protocol support multiple sorting criteria?
- Should the protocol allow implementation-defined sorting options?

### Criteria

- **Consistency:** Sorting should be applied in a uniform way across all endpoints.
- **Flexibility:** Sorting should allow for multiple criteria and customization while remaining easy to implement.
- **Compatibility:** Sorting should integrate smoothly with pagination and filtering.
- **Extensibility:** Sorting should provide a way to support implementation-defined sorting options.

## Decision

API endpoints that support sorting should accept sorting parameters either as **query parameters** (for `GET` requests) or as properties in a `sorting` parameter in the request body (for `POST` and `PUT` requests).

### Sorting approach

- The following parameters MUST be used for sorting:

| Parameter      | Type            | Description                                            |
| -------------- | --------------- | ------------------------------------------------------ |
| `sortBy`       | string          | The property to use to sort the results                |
| `customSortBy` | string          | The _implementation-defined_ sort value, if applicable |
| `sortOrder`    | `asc` or `desc` | The order in which to sort the results                 |

- The response body for sorted requests SHOULD include a `sortInfo` property:

| Property       | Type            | Required | Description                                                                  |
| -------------- | --------------- | -------- | ---------------------------------------------------------------------------- |
| `sortBy`       | string          | Yes      | The property used to sort the results, or `custom` if a custom sort was used |
| `customSortBy` | string          | No       | The custom sort value used, if applicable                                    |
| `sortOrder`    | `asc` or `desc` | Yes      | The order in which the results were sorted                                   |
| `errors`       | array           | No       | Errors that occurred while sorting                                           |

- If the protocol specifies a minimum set of `sortBy` options, implementations MUST support them.
- APIs MAY support additional _implementation-defined_ options using the `customSortBy` parameter.

### Custom sorting

- If a client provides an unsupported `customSortBy` value, the API SHOULD NOT return a non-2xx response.
- Instead, it SHOULD default to the standard `sortBy` value and note the error in `sortInfo.errors`.

### Examples

Standard sorting request:

```json
{
  "sorting": {
    "sortBy": "title",
    "sortOrder": "asc"
  }
}
```

Custom sorting request:

```json
{
  "sorting": {
    "customSortBy": "agency_priority",
    "sortOrder": "desc"
  }
}
```

Response including sorting info:

```json
{
  "items": [
    // sorted results
  ],
  "paginationInfo": {
    // pagination info
  },
  "sortInfo": {
    "sortBy": "custom",
    "customSortBy": "agency_priority",
    "sortOrder": "desc",
    "errors": []
  }
}
```

### Consequences

- **Positive:**
  - Establishes a consistent pattern for sorting across endpoints.
  - Allows both standard and implementation-defined sorting.
  - Ensures sorting is easy to use alongside pagination and filtering.
- **Negative:**
  - Passing sorting in the request body makes it harder to cache `POST`/`PUT` requests.
  - Supporting `customSortBy` requires additional validation logic.

## Options considered

### Option 1: Query parameters only

- **Pros**
  - Easy to implement and widely understood.
  - Fully cacheable in HTTP caches.
- **Cons**
  - Difficult to support complex sorting with multiple criteria.
  - Doesn't provide a way to support implementation-defined sorting.

### Option 2: Request body only

- **Pros**
  - Allows structured sorting with multiple criteria.
  - Can support complex sorting rules more easily.
- **Cons**
  - Cannot be cached effectively.
  - Less intuitive for API consumers compared to query parameters.

### Option 3: Hybrid approach

- **Pros:**
  - Keeps simple sorting in query parameters for `GET` requests (cache-friendly).
  - Allows complex sorting rules in request bodies for `POST` and `PUT`.
- **Cons:**
  - Requires APIs to support sorting in multiple formats.
  - Adds some complexity for consumers handling different request types.
