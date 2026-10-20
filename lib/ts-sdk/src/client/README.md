# Client

The `@common-grants/sdk/client` module provides an HTTP client for interacting with CommonGrants-compatible APIs, with built-in authentication, auto-pagination, and environment variable configuration.

## Table of contents <!-- omit in toc -->

- [Quick start](#quick-start)
- [Usage](#usage)
  - [Authentication](#authentication)
  - [Configuration](#configuration)
  - [Opportunity methods](#opportunity-methods)
  - [Award methods](#award-methods)
  - [Pagination](#pagination)
  - [Low-level HTTP methods](#low-level-http-methods)
- [API reference](#api-reference)
  - [Client class](#client-class)
  - [Opportunities resource](#opportunities-resource)
  - [Awards resource](#awards-resource)
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

`get()` parses the **detail** shape by default (the base opportunity fields
plus `awards` and `competitions`), while `list()` and `search()` stay on the
base (collection) shape:

```ts
// Awards that resulted from this opportunity, as references. Omitted means
// the implementation doesn't publish this link; an empty array means the
// link is published and no awards are known.
if (opportunity.awards?.length) {
  console.log(opportunity.awards.map(award => award.title));
}
```

An award reference isn't dereferenceable through this API. To fetch the full
award record, use `GET /common-grants/awards/{id}` where the server exposes
it; otherwise join on the reference's `identifiers` against your own records.

Pass `schema` to override the default, e.g. `OpportunityBaseSchema` to parse
only the base fields:

```ts
const base = await client.opportunities.get(id, { schema: OpportunityBaseSchema });
```

See also: [get-opportunity.ts](../../examples/get-opportunity.ts)

### Award methods

The `client.awards` namespace provides typed access to the CommonGrants award get, list, and search endpoints.

#### List awards <!-- omit in toc -->

**`GET /common-grants/awards`**

`list()` auto-paginates by default and accepts the same `page`, `pageSize`, `maxItems`, `signal`, and `onParseError` controls as opportunity listing:

```ts
const awards = await client.awards.list({ pageSize: 50, maxItems: 500 });

// Passing page disables auto-pagination and fetches only that page.
const secondPage = await client.awards.list({ page: 2, pageSize: 25 });
```

Each response row is parsed separately. By default, valid rows appear in `items` and invalid rows appear in `errors` with their page-local indexes. Pass `onParseError: "throw"` to raise `BatchParseError` on the first invalid row.

#### Search awards <!-- omit in toc -->

**`POST /common-grants/awards/search`**

`search()` maps `query` to the request's text search and auto-paginates by default. Like `list()`, it parses each row separately and honors `page`, `pageSize`, `maxItems`, `signal`, and `onParseError`:

```ts
const results = await client.awards.search({ query: "research" });

// Fetch one page instead of auto-paginating.
const page2 = await client.awards.search({ query: "research", page: 2, pageSize: 25 });
```

Pass a flat `filters` bag built with the `F.*` helpers. The four standard award filters (`status`, `opportunityId`, `awardDateRange`, and `awardedAmountRange`) are validated against the award default-filter schema and sent as named fields in the request body:

```ts
import { F } from "@common-grants/sdk/extensions";

const awarded = await client.awards.search({
  query: "conservation",
  filters: {
    status: F.in(["awarded"]),
    opportunityId: F.in(["123e4567-e89b-12d3-a456-426614174000"]),
    awardDateRange: F.between("2025-01-01", "2025-12-31"),
    awardedAmountRange: F.between(
      { amount: "0", currency: "USD" },
      { amount: "1000000", currency: "USD" }
    ),
  },
});
```

Any other key is treated as a custom filter and sent under `filters.customFilters`. A plugin that declares `routes.awards.search.filters` validates those registered names against their declared types; ad-hoc and `gov.<system>@<filterName>` namespaced keys pass through with a shape-only check. Invalid standard, registered, or ad-hoc values throw before any request is sent:

```ts
const client = definePlugin({
  routes: { awards: { search: { filters: { program: { filterType: "stringArray" } } } } },
  // ...
}).getClient();

const filtered = await client.awards.search({
  filters: {
    program: F.in(["SBIR"]), // registered custom filter → customFilters
    "gov.usaspending@cfda": F.eq("47.049"), // ad-hoc namespaced key → customFilters
  },
});
```

These route-declared custom filters are distinct from the plugin schema custom fields of [#1246](https://github.com/HHS/simpler-grants-protocol/issues/1246): route filters shape the search request body, while schema custom fields extend the parsed award response.

The corresponding public option types are `AwardSearchOptions` and `AwardCustomFilterBag`.

#### Get a single award <!-- omit in toc -->

**`GET /common-grants/awards/{id}`**

```ts
const award = await client.awards.get("123e4567-e89b-12d3-a456-426614174000");
console.log(award.title);
```

All three award methods accept a compatible Zod schema per call. The schema parses the response and determines the inferred output type:

```ts
import { AwardBaseSchema } from "@common-grants/sdk/schemas";

const AwardWithLabelSchema = AwardBaseSchema.transform(award => ({
  ...award,
  label: `${award.title} (${award.status.value})`,
}));

const award = await client.awards.get(id, { schema: AwardWithLabelSchema });
const awards = await client.awards.list({ schema: AwardWithLabelSchema });
```

The corresponding public option types are `AwardGetOptions` and `AwardListOptions`.

#### Plugin-bound award calls <!-- omit in toc -->

Build a client from a plugin with `plugin.getClient()` to get award methods pre-bound to the plugin's compiled `AwdRecipientIndividual` schema, with no per-call `schema` needed. `get`, `list`, and `search` all parse the nested `recipientIndividual` through that schema by default:

```ts
import { definePlugin } from "@common-grants/sdk/extensions";

const awardPlugin = definePlugin({
  schemas: {
    AwdRecipientIndividual: {
      customFields: {
        tier: { fieldType: "string", description: "Recipient's award tier" },
      },
    },
  },
} as const);

const client = awardPlugin.getClient({ baseUrl: "https://api.example.org" });

const award = await client.awards.get(awardId);
award.recipientIndividual?.customFields?.tier?.value; // typed as string
```

When the plugin declares no `AwdRecipientIndividual` custom fields, award methods fall back to `AwardBaseSchema`. The per-call `schema` option (see [Get a single award](#get-a-single-award) above) takes precedence over the plugin-bound default for that call only. Later calls on the same client keep using the bound schema.

**Client parsing does not invoke source-system transforms.** `get`, `list`, and `search` call `.parse()` on the bound (or per-call) schema directly; they never run a plugin's `toCommon` / `fromCommon`. If a plugin declares transforms, invoke them explicitly on the raw payload. See [Plugin transformations](../extensions/README.md#plugin-transformations) in the extensions guide.

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

| Method                                                                   | Route                                      | Description                                                                                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`client.opportunities.get(id, options?)`](./resources/opportunities.ts) | `GET /common-grants/opportunities/{id}`    | Fetch a single opportunity by ID, parsed as the detail shape (base fields plus `awards`/`competitions`) by default. Accepts an optional `schema` to override. |
| [`client.opportunities.list(options?)`](./resources/opportunities.ts)    | `GET /common-grants/opportunities`         | List opportunities with auto-pagination. Pass `page` to fetch a specific page instead.                                                                        |
| [`client.opportunities.search(options?)`](./resources/opportunities.ts)  | `POST /common-grants/opportunities/search` | Search with text query, status filters, and auto-pagination.                                                                                                  |

### Awards resource

| Method                                                     | Route                               | Description                                                                                                  |
| ---------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`client.awards.get(id, options?)`](./resources/awards.ts) | `GET /common-grants/awards/{id}`    | Fetch a single award by ID. Accepts an optional compatible schema that determines the parsed output type.    |
| [`client.awards.list(options?)`](./resources/awards.ts)    | `GET /common-grants/awards`         | List awards with auto-pagination. Pass `page` for one page or `onParseError: "throw"` for fail-hard parsing. |
| [`client.awards.search(options?)`](./resources/awards.ts)  | `POST /common-grants/awards/search` | Search awards with a text query, standard and custom filters, and auto-pagination.                           |

### Auth namespace

| Method                                   | Description                                          |
| ---------------------------------------- | ---------------------------------------------------- |
| [`Auth.apiKey(key, header?)`](./auth.ts) | API key authentication. Default header: `X-API-Key`. |
| [`Auth.bearer(token)`](./auth.ts)        | Bearer token authentication.                         |
| [`Auth.none()`](./auth.ts)               | No authentication.                                   |
