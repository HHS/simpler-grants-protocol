# @common-grants/sdk

The CommonGrants protocol TypeScript SDK.

## Table of contents <!-- omit in toc -->

- [Installation](#installation)
- [Usage](#usage)
  - [API Client](#api-client)
  - [Schemas and Validation](#schemas-and-validation)
  - [Extensions and Plugins](#extensions-and-plugins)
- [License](#license)

## Installation

```bash
npm install @common-grants/sdk
```

## Usage

### API Client

HTTP client with built-in authentication, auto-pagination, and environment variable configuration. See the [Client guide](./src/client/README.md) for setup, authentication, and usage examples. For runnable scripts, see [list-opportunities.ts](./examples/list-opportunities.ts), [get-opportunity.ts](./examples/get-opportunity.ts), and [search-opportunities.ts](./examples/search-opportunities.ts).

### Schemas and Validation

[Zod](https://zod.dev/) schemas for validating and parsing CommonGrants data, along with inferred TypeScript types (`@common-grants/sdk/types`) and runtime enum constants (`@common-grants/sdk/constants`). See the [Schemas guide](./src/schemas/README.md) for validation examples, type safety patterns, and the full API reference.

### Extensions and Plugins

The SDK provides an extension framework for adding typed custom fields to CommonGrants schemas, either ad hoc with `withCustomFields()` or as reusable plugins with `definePlugin()`. See the [Extensions documentation](./src/extensions/README.md) for the full guide, including best practices for publishing plugin packages and a complete API reference.

For runnable examples, see [custom-fields.ts](./examples/custom-fields.ts) and [plugins.ts](./examples/plugins.ts).

## License

CC0-1.0
