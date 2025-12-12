# @common-grants/sdk

The CommonGrants protocol TypeScript SDK.

## Installation

```bash
npm install @common-grants/sdk
```

## Usage

### API Client

The SDK provides an HTTP client for interacting with CommonGrants-compatible APIs:

```ts
import { Client, Auth } from "@common-grants/sdk/client";

// Create a client with API key authentication
const client = new Client({
  baseUrl: "https://api.example.org",
  auth: Auth.apiKey("your-api-key"),
});

// List opportunities (auto-paginates by default)
const allOpportunities = await client.opportunities.list();
console.log(`Found ${allOpportunities.items.length} opportunities`);
for (const opp of allOpportunities.items) {
  console.log(`${opp.id}: ${opp.title}`);
}

// List a specific page
const page2 = await client.opportunities.list({ page: 2, pageSize: 10 });
for (const opp of page2.items) {
  console.log(`${opp.id}: ${opp.title}`);
}

// Search opportunities with filters
const results = await client.opportunities.search({
  query: "education",
  statuses: ["open"],
});

// View details for a single opportunity
const opportunityId = allOpportunities.items[0].id;
const opportunity = await client.opportunities.get(opportunityId);
console.log(opportunity.title);
```

#### Authentication

The client supports multiple authentication methods:

```ts
// API Key (default header: X-API-Key)
Auth.apiKey("your-api-key");

// API Key with custom header
Auth.apiKey("your-api-key", "X-Custom-Header");

// Bearer token
Auth.bearer("your-jwt-token");

// No authentication
Auth.none();
```

#### Client Configuration

```ts
const client = new Client({
  baseUrl: "https://api.example.org", // Required (or set CG_API_BASE_URL env var)
  auth: Auth.apiKey("key"), // Optional: Authentication method
  timeout: 30000, // Optional: Request timeout in ms (default: 30000)
  pageSize: 100, // Optional: Default page size (default: 100)
  maxItems: 1000, // Optional: Max items for auto-pagination (default: 1000)
});
```

Config values can also be set via environment variables:

| Config     | Environment Variable      | Default    |
| ---------- | ------------------------- | ---------- |
| `baseUrl`  | `CG_API_BASE_URL`         | _required_ |
| `timeout`  | `CG_API_TIMEOUT`          | 30000      |
| `pageSize` | `CG_API_PAGE_SIZE`        | 100        |
| `maxItems` | `CG_API_LIST_ITEMS_LIMIT` | 1000       |

#### Low-level HTTP Methods

For custom endpoints or advanced use cases, use the low-level methods:

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

> **Note:** For runnable examples, see the [examples folder](./examples/).

### Validation

Use the SDK schemas to validate JSON data and convert it to a typed object:

```ts
import * as Schemas from "@common-grants/sdk/schemas";
import * as Types from "@common-grants/sdk/types";

// Successful validation
const oppData = {
  id: "ac201443-5480-4e36-9799-a39765225153",
  title: "Test Opportunity",
  description: "This is a test opportunity",
  status: { value: "open" },
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-01T00:00:00Z",
};
const opportunity: Types.OpportunityBase = Schemas.OpportunityBaseSchema.parse(oppData);
console.log(opportunity.title);
console.log(opportunity.createdAt.getFullYear());
```

Which should print:

```
Test Opportunity
2025
```

You can also gracefully handle errors uisng the `safeParse()` method:

```ts
import * as Schemas from "@common-grants/sdk/schemas";
import * as Types from "@common-grants/sdk/types";

// Validation error
const invalidOppData = {
  id: "invalid-id",
  title: "Test Opportunity",
  description: "This is a test opportunity",
  status: { value: "invalid-status" },
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-01T00:00:00Z",
};
const result = Schemas.OpportunityBaseSchema.safeParse(invalidOppData);
if (!result.success) {
  console.error(result.error.message);
} else {
  console.log("Validation successful");
}
```

Which should print:

```json
[
  {
    "validation": "uuid",
    "code": "invalid_string",
    "message": "Invalid uuid",
    "path": ["id"]
  },
  {
    "received": "invalid-status",
    "code": "invalid_enum_value",
    "options": ["forecasted", "open", "closed", "custom"],
    "path": ["status", "value"],
    "message": "Invalid enum value. Expected 'forecasted' | 'open' | 'closed' | 'custom', received 'invalid-status'"
  }
]
```

### Type-safe code

Import TypeScript types and runtime constants for consistent, type-safe operations:

```ts
import type { OpportunityBase, OppStatus } from "@common-grants/sdk/types";
import { OppStatusOptions } from "@common-grants/sdk/constants";

function processOpportunity(opp: OpportunityBase): void {
  console.log(opp.title);

  // Use constants instead of magic strings for better type safety
  if (opp.status.value === OppStatusOptions.open) {
    console.log("Opportunity is open");
  }

  // Type-safe status handling
  const statusLabel = getStatusLabel(opp.status);
  console.log(statusLabel);
}

function getStatusLabel(status: OppStatus): string {
  switch (status.value) {
    case OppStatusOptions.open:
      return "Currently accepting applications";
    case OppStatusOptions.closed:
      return "Not accepting applications";
    case OppStatusOptions.forecasted:
      return "Coming soon";
    default:
      return "Unknown status";
  }
}

// Example usage
const opp: OpportunityBase = {
  id: "123",
  title: "Test Opportunity",
  description: "This is a test opportunity",
  status: { value: OppStatusOptions.open },
  createdAt: new Date(),
  lastModifiedAt: new Date(),
};
processOpportunity(opp);
```

Which should print:

```
Test Opportunity
Opportunity is open
Currently accepting applications
```

### Generic response schemas

The SDK provides generic response schemas that allow you to flexibly validate API responses for different resource types:

```ts
import { PaginatedSchema, OpportunityBaseSchema } from "@common-grants/sdk/schemas";

// Create a paginated response schema for opportunities
const PaginatedOpportunitiesSchema = PaginatedSchema(OpportunityBaseSchema);

// Validate a paginated API response
const paginatedResponse = PaginatedOpportunitiesSchema.parse({
  status: 200,
  message: "Success",
  items: [
    {
      id: "ac201443-5480-4e36-9799-a39765225153",
      title: "Test Opportunity 1",
      description: "This is a test opportunity",
      status: { value: "open" },
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-01T00:00:00Z",
    },
    {
      id: "bc201443-5480-4e36-9799-a39765225154",
      title: "Test Opportunity 2",
      description: "Another test opportunity",
      status: { value: "open" },
      createdAt: "2025-01-02T00:00:00Z",
      lastModifiedAt: "2025-01-02T00:00:00Z",
    },
  ],
  paginationInfo: {
    page: 1,
    pageSize: 20,
    totalItems: 100,
    totalPages: 5,
  },
});

// Access the validated data
console.log(
  `Page ${paginatedResponse.paginationInfo.page} of ${paginatedResponse.paginationInfo.totalPages}`
);
console.log(`Found ${paginatedResponse.items.length} opportunities`);
```

Which should print:

```
Page 1 of 5
Found 2 opportunities
```

Other generic response schemas include `OkSchema<T>`, `SortedSchema<T>`, `FilteredSchema<ItemsT, FilterT>`, `CreatedSchema<T>`, and error schemas like `ErrorSchema`, `UnauthorizedSchema`, and `NotFoundSchema`.

## License

CC0-1.0
