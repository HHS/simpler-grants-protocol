---
title: Pagination strategy
description: ADR documenting the decision to use page-based pagination with query parameters for GET operations and request body parameters for POST/PUT operations that support pagination.
---

The CommonGrants protocol needs a standardized approach to pagination for API responses that return multiple records. The decision should balance ease of use for clients, implementation simplicity for servers, and support for filtering and sorting.

## Decision

The protocol will use page-based pagination with `page` and `pageSize` parameters. These parameters should be included as query parameters for `GET` requests and as properties in a `pagination` request body parameter for `POST` and `PUT` requests.

The pagination response should also include a `paginationInfo` object with the following properties:

| Property     | Description                                |
| ------------ | ------------------------------------------ |
| `page`       | The current page number                    |
| `pageSize`   | The number of items per page               |
| `totalItems` | The total number of items across all pages |
| `totalPages` | The total number of pages                  |

- **Positive consequences**
  - Familiar and widely used pagination strategy, easy for clients to adopt
  - Simpler to maintain on the server side compared to cursor-based pagination
  - Keeps filters, pagination, and sorting parameters together for POST/PUT operations
- **Negative consequences**
  - Can be inefficient for large datasets with frequent inserts or deletes, as pages may shift
  - Less precise than cursor-based pagination for real-time data
  - Limits the ability to cache paginated requests (for POST/PUT operations)

### Criteria

The pagination strategy should:

- Be widely used and understood
- Be easy for clients to implement
- Be easy for servers to support and scale
- Be consistent across endpoints
- Be easy to combine with sorting and filtering
- Easily support request caching

### Options considered

- **Pagination strategy**
  - Cursor-based pagination
  - Page-based pagination
  - Limit-offset pagination
- **Parameter placement**
  - Query parameters only
  - Request body only
  - Hybrid approach

## Evaluation - Pagination strategy

### Side-by-side comparison

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                     | Cursor-based | Page-based | Limit-offset |
| ---------------------------- | :----------: | :--------: | :----------: |
| Widely used & understood     |      ❌      |     ✅     |      ✅      |
| Easy for clients             |      🟡      |     ✅     |      ✅      |
| Easy for servers             |      🟡      |     ✅     |      ✅      |
| Efficient for large datasets |      ✅      |     🟡     |      🟡      |

### Option 1: Cursor-based pagination

:::note[Bottom line]
Cursor-based pagination is best if:

- We want precision and efficiency when working with real-time data
- But can handle increased complexity in implementation
  :::

- **Pros**
  - Efficient for real-time data
  - Avoids issues with shifting pages in large datasets
- **Cons**
  - Harder for clients to implement
  - Cannot jump directly to arbitrary pages

### Option 2: Page-based pagination

:::note[Bottom line]
Page-based pagination is best if:

- We want an easy-to-use, widely adopted solution
- But can accept potential inefficiencies with shifting datasets
  :::

- **Pros**
  - Simple and familiar to clients
  - Compatible with caching and indexing
- **Cons**
  - Can be inefficient with frequent inserts/deletes
  - Limited flexibility for real-time updates

### Option 3: Limit-offset pagination

:::note[Bottom line]
Limit-offset pagination is best if:

- We want a simple implementation for sequential access
- But can tolerate performance issues in large datasets
  :::

- **Pros**
  - Easy to implement
  - Simple to understand and use
- **Cons**
  - Inefficient for large datasets due to shifting offsets
  - Poor performance with high offset values

## Evaluation - Parameter placement

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                         | Query params only | Request body only | Hybrid approach |
| -------------------------------- | :---------------: | :---------------: | --------------- |
| HTTP caching support             |        ✅         |        ❌         | 🟡              |
| Widely used & understood         |        ✅         |        🟡         | ✅              |
| Consistent pattern across routes |        ✅         |        ✅         | 🟡              |
| Works with sorting and filtering |        🟡         |        ❌         | ✅              |

### Option 1: Query Parameters Only

:::note[Bottom line]
Query parameters are best if:

- We want efficient, cacheable, and widely supported pagination across all request types.
- We're okay with splitting pagination params from sorting and filtering params in PUT/POST requests.
  :::

- **Pros**
  - Enables HTTP caching, reducing backend load
  - Aligns with RESTful design principles
  - Easy to test and debug in the browser
- **Cons**
  - Splits pagination params from sorting and filtering params in PUT/POST requests
  - May not be ideal for complex request payloads

### Option 2: Request Body Only

:::note[Bottom line]
Request body parameters are best if:

- Pagination is part of a complex, dynamic request, and caching is not a concern.
- We're okay with banning pagination in GET requests.
  :::

- **Pros**
  - Allows more complex query structures in the body
  - Can include additional metadata for the request
- **Cons**
  - Cannot be cached by standard HTTP caches
  - Forces implementations to use POST/PUT for all requests that need pagination

### Option 3: Hybrid Approach (Recommended)

:::note[Bottom line]
The hybrid approach is best if:

- We want efficient caching for GET requests while keeping flexibility for POST/PUT requests.
- We're okay with having different pagination handling between GET and POST/PUT requests.
  :::

- **Pros**
  - `GET` requests are cacheable
  - Provides flexibility for `POST`/`PUT`
  - Familiar to most API consumers
  - Keeps pagination params close to sorting and filtering params
- **Cons**
  - Requires different handling per HTTP method
  - Doesn't support HTTP caching for pagination with PUT/POST requests
