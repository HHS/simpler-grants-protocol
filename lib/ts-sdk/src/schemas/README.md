# Schemas

The `@common-grants/sdk/schemas` module provides [Zod](https://zod.dev/) schemas for validating and parsing CommonGrants data. Use these schemas to validate JSON from APIs, files, or any external source and convert it into typed TypeScript objects.

The `@common-grants/sdk/types` and `@common-grants/sdk/constants` modules complement the schemas by exporting inferred TypeScript types and runtime enum constants, respectively.

## Table of contents <!-- omit in toc -->

- [Quick start](#quick-start)
- [Usage](#usage)
  - [Validation](#validation)
  - [Type safety](#type-safety)
  - [Award contracts](#award-contracts)
  - [Generic response schemas](#generic-response-schemas)
- [API reference](#api-reference)
  - [Base schemas](#base-schemas)
  - [Types](#types)
  - [Constants](#constants)

## Quick start

```ts
import { OpportunityBaseSchema } from "@common-grants/sdk/schemas";

const opportunity = OpportunityBaseSchema.parse({
  id: "ac201443-5480-4e36-9799-a39765225153",
  title: "Test Opportunity",
  description: "This is a test opportunity",
  status: { value: "open" },
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-01T00:00:00Z",
});

console.log(opportunity.title); // "Test Opportunity"
console.log(opportunity.createdAt.getFullYear()); // 2025
```

## Usage

### Validation

#### Strict validation with `parse()` <!-- omit in toc -->

`parse()` returns a fully typed object on success or throws a `ZodError` on failure:

```ts
import * as Schemas from "@common-grants/sdk/schemas";
import * as Types from "@common-grants/sdk/types";

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

Which prints:

```
Test Opportunity
2025
```

#### Graceful error handling with `safeParse()` <!-- omit in toc -->

`safeParse()` returns a result object instead of throwing, making it easier to handle validation errors:

```ts
import * as Schemas from "@common-grants/sdk/schemas";

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

Which prints:

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

### Type safety

Import TypeScript types from `@common-grants/sdk/types` for type annotations, and runtime constants from `@common-grants/sdk/constants` for type-safe comparisons instead of magic strings:

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

Which prints:

```
Test Opportunity
Opportunity is open
Currently accepting applications
```

### Award contracts

The SDK exports runtime validators for Core v0.5 award models and the list,
read, and search route contracts. These are schemas and types only; an awards
client resource is not available yet.

The canonical award model is `AwardBaseSchema`. The `AwardBase` type is inferred
from it, and `Award` is a convenience alias for the same type:

```ts
import { AwardBaseSchema } from "@common-grants/sdk/schemas";
import { AwdStatusOptions } from "@common-grants/sdk/constants";
import type { Award } from "@common-grants/sdk/types";

const award: Award = AwardBaseSchema.parse({
  id: "123e4567-e89b-42d3-a456-426614174000",
  title: "Community Health Center Grant",
  description: "Supports community health center improvements.",
  status: { value: AwdStatusOptions.awarded },
  createdAt: "2026-03-01T00:00:00Z",
  lastModifiedAt: "2026-06-01T00:00:00Z",
  identifiers: {
    "awd:us:fain": {
      registry: { code: "awd:us:fain" },
      id: "FAIN-001",
    },
  },
  opportunity: {
    id: "018f2e77-3a4b-4c1d-9e2f-abcdef123456",
    title: "Health Center Capital Improvement Program",
  },
  recipientIndividual: {
    name: { firstName: "Taylor", lastName: "Grant" },
    customFields: {
      programArea: {
        name: "programArea",
        fieldType: "string",
        value: "Healthcare Innovation",
      },
    },
  },
});

console.log(award.createdAt.toISOString()); // "2026-03-01T00:00:00.000Z"
console.log(JSON.stringify(award)); // Dates return to protocol wire strings
```

`createdAt` and `lastModifiedAt` accept UTC date-time strings or valid `Date`
objects and parse to `Date`. Event date fields such as
`keyDates.awardDate.date` accept `YYYY-MM-DD` strings or valid `Date` objects,
parse to `Date`, and serialize back to `YYYY-MM-DD`. Award-date filter values
remain protocol strings: either `YYYY-MM-DD` or an ISO date-time with an offset.
Invalid `Date` objects are rejected.

For award-specific schemas, an optional property may be omitted; `null` is not
a substitute for omission unless the referenced schema explicitly permits it.
Award objects are sealed, and custom fields are supported on
`recipientIndividual.customFields`, not at the award root. That record may use
arbitrary keys, but every value must satisfy `CustomFieldSchema`. The recipient
schema is also registered with `withCustomFields()` and the plugin extension
framework as `AwdRecipientIndividual`.

The award schemas currently inherit two shared-model parity dependencies tracked
by [#1192](https://github.com/HHS/simpler-grants-protocol/issues/1192): event
variants and `CustomFieldSchema` accept `null` for some optional metadata and do
not yet reject every unknown nested key that the emitted Core contract rejects.
The award-specific route envelopes avoid the analogous shared pagination and
sorting differences by using protocol-exact concrete validators.

Award filters have two intentionally different object policies:

- `AwdDefaultFiltersSchema` is open. Alongside its named fields, it accepts and
  preserves additional root keys whose values satisfy `DefaultFilterSchema`.
- `AwdFiltersSchema` is sealed. Its root accepts only the named award filters
  and `customFilters`; implementation-defined filters belong inside the open
  `customFilters` record.

Use the concrete route schemas when validating award API traffic:

```ts
import {
  AwardsListRequestSchema,
  AwardGetRequestSchema,
  AwdSearchRequestSchema,
  AwardResponseSchema,
  AwardsListResponseSchema,
  AwardsSortedResponseSchema,
  AwardsFilteredResponseSchema,
} from "@common-grants/sdk/schemas";

AwardsListRequestSchema.parse({}); // { page: 1, pageSize: 100 }
AwardGetRequestSchema.parse({
  awdId: "123e4567-e89b-42d3-a456-426614174000",
});
AwdSearchRequestSchema.parse({
  filters: {
    status: { operator: "in", value: ["awarded"] },
    customFilters: {
      serviceArea: { operator: "eq", value: "rural" },
    },
  },
  sorting: { sortBy: "lastModifiedAt", sortOrder: "desc" },
  pagination: {}, // defaults to page 1 with 100 items
});
```

The response schemas above require status `200` and validate embedded awards
plus pagination, sorting, and filtering metadata. `NotFoundSchema` validates
the read route's not-found response.

### Generic response schemas

The SDK provides generic (parameterized) schemas for validating common API response shapes. Pass any item schema to create a typed response validator:

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

console.log(
  `Page ${paginatedResponse.paginationInfo.page} of ${paginatedResponse.paginationInfo.totalPages}`
);
console.log(`Found ${paginatedResponse.items.length} opportunities`);
```

Which prints:

```
Page 1 of 5
Found 2 opportunities
```

Other generic response schemas include `OkSchema(T)`, `SortedSchema(T)`, `FilteredSchema(T, F)`, `CreatedSchema(T)`, and error schemas like `ErrorSchema`, `UnauthorizedSchema`, and `NotFoundSchema`. See the [responses source](./zod/responses.ts) for the full list.

## API reference

### Base schemas

All Zod schemas are exported from `@common-grants/sdk/schemas`. See the [schemas index](./zod/index.ts) for the full list, organized by module:

- [**Fields**](./zod/fields.ts): `EventSchema`, `MoneySchema`, `CustomFieldSchema`, `SystemMetadataSchema`
- [**Identifiers**](./zod/identifiers.ts): `IdentifierSchema`, `SystemIdSchema`, `IdentifierCollectionSchema`, `IdentifierStatusEnum`
- [**References**](./zod/references.ts): `AppRefSchema`; organization EIN, UEI, and DUNS identifier schemas; organization collections; opportunity FON and ALN identifier schemas; `OppRefSchema`
- [**Awards**](./zod/awards.ts): `AwardBaseSchema`, award status, funding, timeline, FAIN identifier, reference, individual-recipient, filter, and sorting schemas
- [**Award routes**](./zod/award-routes.ts): `AwardsListRequestSchema`, `AwardGetRequestSchema`, `AwdSearchRequestSchema`, `AwardResponseSchema`, `AwardsListResponseSchema`, `AwardsSortedResponseSchema`, `AwardsFilteredResponseSchema`
- [**Models**](./zod/models.ts): `OpportunityBaseSchema`, `OppStatusSchema`, `OppFundingSchema`, `OppTimelineSchema`, `ApplicantTypeSchema`, `OppSortingSchema`, `OppFiltersSchema`
- [**Filters**](./zod/filters.ts): String, number, date, and money comparison/range/array filters
- [**Responses**](./zod/responses.ts): `OkSchema`, `PaginatedSchema`, `SortedSchema`, `FilteredSchema`, `CreatedSchema`, `ErrorSchema`, `UnauthorizedSchema`, `NotFoundSchema`
- [**Pagination**](./zod/pagination.ts): `PaginatedBodyParamsSchema`, `PaginatedResultsInfoSchema`
- [**Sorting**](./zod/sorting.ts): `SortedResultsInfoSchema`

### Types

All TypeScript types are inferred from schemas using `z.infer<>` and exported from `@common-grants/sdk/types`. See [types.ts](../types.ts) for the full list, including:

- Model types: `OpportunityBase`, `OppStatus`, `OppFunding`, `OppTimeline`
- Award model types: `AwardBase` (`Award` is an alias), `AwdStatus`, `AwdFunding`, `AwdTimeline`, `AwdRecipientIndividual`, `AwdSorting`, `AwdDefaultFilters`, `AwdFilters`
- Identifier and reference types: `Identifier`, `SystemId`, `IdentifierCollection`, `AwdIdFain`, `AwdIds`, `AwdRef`, `AppRef`, organization identifiers/references, and opportunity identifiers/references
- Field types: `Event`, `Money`, `CustomField`
- Response types: `Ok<T>`, `Paginated<T>`, `Sorted<T>`, `Filtered<T, F>`
- Award route types: `AwardsListRequest`, `AwardGetRequest`, `AwdSearchRequest`, `AwardResponse`, `AwardsListResponse`, `AwardsSortedResponse`, `AwardsFilteredResponse`
- Opportunity request types: `OppFilters`, `OppSearchRequest`

### Constants

Runtime enum constants are exported from `@common-grants/sdk/constants`. See [constants.ts](../constants.ts) for the full list, including:

- `OppStatusOptions`: `open`, `closed`, `forecasted`, `custom`
- `AwdStatusOptions`: `awarded`, `completed`, `cancelled`, `custom`
- `AwdSortBy`: award sort field values
- `IdentifierStatus`: `active`, `archived`
- `ApplicantTypeOptions`: applicant type values
- `OppSortBy`: sort field values
- Filter operators: `EquivalenceOperator`, `ComparisonOperator`, `ArrayOperator`, `StringOperator`, `RangeOperator`
