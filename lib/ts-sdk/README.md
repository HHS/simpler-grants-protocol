# @common-grants/sdk

The CommonGrants protocol TypeScript SDK.

## Table of contents <!-- omit in toc -->

- [Installation](#installation)
- [Usage](#usage)
  - [API Client](#api-client)
  - [Validation](#validation)
  - [Type-safe code](#type-safe-code)
  - [Generic response schemas](#generic-response-schemas)
  - [Extensions and Plugins](#extensions-and-plugins)
- [License](#license)

## Installation

```bash
npm install @common-grants/sdk
```

## Usage

### API Client

HTTP client with built-in authentication, auto-pagination, and environment variable configuration. See the [Client guide](./src/client/README.md) for setup, authentication, and usage examples. For runnable scripts, see [list-opportunities.ts](./examples/list-opportunities.ts), [get-opportunity.ts](./examples/get-opportunity.ts), and [search-opportunities.ts](./examples/search-opportunities.ts).

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

You can also gracefully handle errors using the `safeParse()` method:

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

### Extensions and Plugins

The SDK provides an extension framework for adding typed custom fields to CommonGrants schemas, either ad hoc with `withCustomFields()` or as reusable plugins with `definePlugin()`. See the [Extensions documentation](./src/extensions/README.md) for the full guide, including best practices for publishing plugin packages and a complete API reference.

For runnable examples, see [custom-fields.ts](./examples/custom-fields.ts) and [plugins.ts](./examples/plugins.ts).

## License

CC0-1.0
