# Client

The `@common-grants/sdk/client` module provides an HTTP client for interacting with CommonGrants-compatible APIs, with built-in authentication, auto-pagination, and environment variable configuration.

## Table of contents <!-- omit in toc -->

- [Quick start](#quick-start)
- [Usage](#usage)
  - [Authentication](#authentication)
  - [Configuration](#configuration)
  - [Opportunity methods](#opportunity-methods)
  - [Pagination](#pagination)
  - [Low-level HTTP methods](#low-level-http-methods)
- [API reference](#api-reference)
  - [Client class](#client-class)
  - [Opportunities resource](#opportunities-resource)
  - [Auth namespace](#auth-namespace)

## Quick start

```ts
import { Client, Auth } from "@common-grants/sdk/client";

const client = new Client({
  baseUrl: "https://api.example.org",
  auth: Auth.apiKey("your-api-key"),
});

const allOpportunities = await client.opportunities.list();
for (const opp of allOpportunities.items) {
  console.log(`${opp.title} (${opp.status.value})`);
}
```

For runnable examples, see the [examples folder](../../examples/), including [list-opportunities.ts](../../examples/list-opportunities.ts), [get-opportunity.ts](../../examples/get-opportunity.ts), and [search-opportunities.ts](../../examples/search-opportunities.ts).

## Usage

### Authentication

The client supports multiple authentication methods via the `Auth` namespace:

```ts
import { Auth } from "@common-grants/sdk/client";

// API Key (default header: X-API-Key)
Auth.apiKey("your-api-key");

// API Key with a custom header name
Auth.apiKey("your-api-key", "X-Custom-Header");

// Bearer token (e.g. a JWT)
Auth.bearer("your-jwt-token");

// No authentication
Auth.none();
```

Pass the chosen method to the client constructor via the `auth` option. If omitted, the client defaults to `Auth.none()`.

### Configuration

```ts
const client = new Client({
  baseUrl: "https://api.example.org", // Required (or set CG_API_BASE_URL env var)
  auth: Auth.apiKey("key"), // Optional: authentication method
  timeout: 30000, // Optional: request timeout in ms (default: 30000)
  pageSize: 100, // Optional: default page size (default: 100)
  maxItems: 1000, // Optional: max items for auto-pagination (default: 1000)
});
```

#### Environment variables <!-- omit in toc -->

Every config value except `auth` can be set via an environment variable. Explicit constructor values take precedence over environment variables.

| Config     | Environment Variable      | Default    |
| ---------- | ------------------------- | ---------- |
| `baseUrl`  | `CG_API_BASE_URL`         | _required_ |
| `timeout`  | `CG_API_TIMEOUT`          | 30000      |
| `pageSize` | `CG_API_PAGE_SIZE`        | 100        |
| `maxItems` | `CG_API_LIST_ITEMS_LIMIT` | 1000       |

### Opportunity methods

The `client.opportunities` namespace provides methods for the CommonGrants opportunities endpoints.

#### List opportunities <!-- omit in toc -->

**`GET /common-grants/opportunities`**

Fetches opportunities with auto-pagination enabled by default:

```ts
// Auto-paginate to fetch all opportunities
const allOpportunities = await client.opportunities.list();
for (const opp of allOpportunities.items) {
  console.log(`${opp.id}: ${opp.title}`);
}

// Auto-paginate with custom limits
const limited = await client.opportunities.list({ maxItems: 500, pageSize: 50 });
```

See also: [list-opportunities.ts](../../examples/list-opportunities.ts)

#### Search opportunities <!-- omit in toc -->

**`POST /common-grants/opportunities/search`**

Searches with text queries and status filters:

```ts
// Search with a text query
const results = await client.opportunities.search({
  query: "education",
});

// Filter by status
const openOpps = await client.opportunities.search({
  statuses: ["open"],
});

// Combine query and statuses
const filtered = await client.opportunities.search({
  query: "community",
  statuses: ["open", "forecasted"],
});
```

Like `list()`, `search()` auto-paginates by default. Pass `page` to fetch a specific page.

See also: [search-opportunities.ts](../../examples/search-opportunities.ts)

#### Get a single opportunity <!-- omit in toc -->

**`GET /common-grants/opportunities/{id}`**

```ts
const opportunity = await client.opportunities.get("123e4567-e89b-12d3-a456-426614174000");
console.log(opportunity.title);
```

See also: [get-opportunity.ts](../../examples/get-opportunity.ts)

### Pagination

All list and search methods auto-paginate by default, fetching up to `maxItems` (default: 1000) across multiple pages. To control this behavior:

```ts
// Auto-paginate with custom limits
const limited = await client.opportunities.list({ maxItems: 500, pageSize: 50 });

// Fetch a specific page (disables auto-pagination)
const page2 = await client.opportunities.list({ page: 2, pageSize: 10 });

console.log(`Page ${page2.paginationInfo.page} of ${page2.paginationInfo.totalPages}`);
```

The same options work for `search()`:

```ts
const results = await client.opportunities.search({
  query: "research",
  maxItems: 100,
  pageSize: 25,
});
```

### Low-level HTTP methods

For custom endpoints or advanced use cases, the client exposes low-level `get()`, `post()`, and `fetch()` methods. All three attach authentication headers automatically.

```ts
// GET request with query params
const response = await client.get("/custom/endpoint", {
  params: { filter: "value" },
});
const data = await response.json();

// POST request with body
const response = await client.post("/custom/endpoint", {
  field: "value",
});

// Raw fetch for full control
const response = await client.fetch("/custom/endpoint", {
  method: "PUT",
  body: JSON.stringify({ field: "value" }),
});
```

## API reference

### Client class

| Method                                             | Description                                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`new Client(config)`](./client.ts)                | Creates a new client instance. Resolves config from constructor options and environment variables. |
| [`client.get(path, options?)`](./client.ts)        | Authenticated GET request. Accepts optional query `params` and `signal`.                           |
| [`client.post(path, body, options?)`](./client.ts) | Authenticated POST request. JSON-stringifies the body automatically.                               |
| [`client.fetch(path, init?)`](./client.ts)         | Lowest-level method. Delegates to native `fetch` with auth headers and timeout.                    |
| [`client.fetchMany(path, options?)`](./client.ts)  | Auto-paginating fetch. Aggregates items across pages up to `maxItems`. Supports both GET and POST. |

### Opportunities resource

| Method                                                         | Route                                      | Description                                                                             |
| -------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| [`client.opportunities.get(id, options?)`](./opportunities.ts) | `GET /common-grants/opportunities/{id}`    | Fetch a single opportunity by ID. Accepts an optional `schema` for typed custom fields. |
| [`client.opportunities.list(options?)`](./opportunities.ts)    | `GET /common-grants/opportunities`         | List opportunities with auto-pagination. Pass `page` to fetch a specific page instead.  |
| [`client.opportunities.search(options?)`](./opportunities.ts)  | `POST /common-grants/opportunities/search` | Search with text query, status filters, and auto-pagination.                            |

### Auth namespace

| Method                                   | Description                                          |
| ---------------------------------------- | ---------------------------------------------------- |
| [`Auth.apiKey(key, header?)`](./auth.ts) | API key authentication. Default header: `X-API-Key`. |
| [`Auth.bearer(token)`](./auth.ts)        | Bearer token authentication.                         |
| [`Auth.none()`](./auth.ts)               | No authentication.                                   |
