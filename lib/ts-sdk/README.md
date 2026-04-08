# @common-grants/sdk

The CommonGrants protocol TypeScript SDK.

## Table of contents <!-- omit in toc -->

- [Installation](#installation)
- [Usage](#usage)
  - [Quick start](#quick-start)
  - [Kitchen sink example](#kitchen-sink-example)
- [Modules](#modules)
  - [API Client](#api-client)
  - [Schemas and Validation](#schemas-and-validation)
  - [Extensions and Plugins](#extensions-and-plugins)
- [License](#license)

## Installation

```bash
npm install @common-grants/sdk
```

## Usage

### Quick start

```ts
import { Client, Auth } from "@common-grants/sdk/client";

// 1. Create a client
const client = new Client({
  baseUrl: "https://api.example.org",
  auth: Auth.apiKey("your-api-key"),
});

// 2. Fetch opportunities
const opportunities = await client.opportunities.list();
for (const opp of opportunities.items) {
  console.log(`${opp.title} (${opp.status.value})`);
}
```

### Kitchen sink example

This example shows how the SDK's modules work together: fetching data with the client, validating it with schemas, using type-safe constants, and accessing typed custom fields via a plugin.

```ts
import { Client, Auth } from "@common-grants/sdk/client";
import { OpportunityBaseSchema } from "@common-grants/sdk/schemas";
import type { OpportunityBase } from "@common-grants/sdk/types";
import { OppStatusOptions } from "@common-grants/sdk/constants";
import { definePlugin } from "@common-grants/sdk/extensions";

// Define a plugin with typed custom fields
const myPlugin = definePlugin({
  extensions: {
    Opportunity: {
      category: { fieldType: "string", description: "Grant category" },
      legacyId: { fieldType: "integer", description: "Legacy system ID" },
    },
  },
} as const);

// Create a client
const client = new Client({
  baseUrl: "https://api.example.org",
  auth: Auth.bearer("your-jwt-token"),
});

// Fetch opportunities with typed custom fields
const results = await client.opportunities.search({
  query: "education",
  statuses: [OppStatusOptions.open],
  schema: myPlugin.schemas.Opportunity,
});

for (const opp of results.items) {
  console.log(`${opp.title} (${opp.status.value})`);

  // Custom fields are fully typed
  console.log(`  Category: ${opp.customFields?.category?.value}`);
  console.log(`  Legacy ID: ${opp.customFields?.legacyId?.value}`);
}

// Validate standalone JSON data
const rawJson = await fetch("https://api.example.org/data.json").then(r => r.json());
const validated: OpportunityBase = OpportunityBaseSchema.parse(rawJson);
```

## Modules

The SDK is organized into modules, each available as a separate import path:

| Module                                         | Import path                     | Description                                   |
| ---------------------------------------------- | ------------------------------- | --------------------------------------------- |
| [Client](./src/client/README.md)               | `@common-grants/sdk/client`     | HTTP client with auth, pagination, and search |
| [Schemas](./src/schemas/README.md)             | `@common-grants/sdk/schemas`    | Zod schemas for data validation               |
| [Types](./src/schemas/README.md#types)         | `@common-grants/sdk/types`      | Inferred TypeScript types                     |
| [Constants](./src/schemas/README.md#constants) | `@common-grants/sdk/constants`  | Runtime enum constants                        |
| [Extensions](./src/extensions/README.md)       | `@common-grants/sdk/extensions` | Custom field and plugin framework             |

### API Client

HTTP client with built-in authentication, auto-pagination, and environment variable configuration. See the [Client guide](./src/client/README.md) for setup, authentication, and usage examples. For runnable scripts, see [list-opportunities.ts](./examples/list-opportunities.ts), [get-opportunity.ts](./examples/get-opportunity.ts), and [search-opportunities.ts](./examples/search-opportunities.ts).

### Schemas and Validation

[Zod](https://zod.dev/) schemas for validating and parsing CommonGrants data, along with inferred TypeScript types (`@common-grants/sdk/types`) and runtime enum constants (`@common-grants/sdk/constants`). See the [Schemas guide](./src/schemas/README.md) for validation examples, type safety patterns, and the full API reference.

### Extensions and Plugins

Extension framework for adding typed custom fields to CommonGrants schemas, either ad hoc or as reusable plugins. See the [Extensions guide](./src/extensions/README.md) for the full guide. For runnable scripts, see [custom-fields.ts](./examples/custom-fields.ts) and [plugins.ts](./examples/plugins.ts).

## License

CC0-1.0
