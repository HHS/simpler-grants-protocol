# Development Guide

### Prerequisites

- Node.js 20 or higher
- pnpm 10.18.0 or higher

### Development commands

| Command                  | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `pnpm install`           | Installs dependencies                                            |
| `pnpm run build`         | Compiles TypeScript code to JavaScript and runs TypeSpec         |
| `pnpm run typespec`      | Compile and emit TypeSpec outputs (i.e. OpenAPI and JSON schema) |
| `pnpm run dev`           | Run the entry point with ts-node                                 |
| `pnpm run test`          | Run Vitest test suite                                            |
| `pnpm run test:watch`    | Run Vitest in watch mode                                         |
| `pnpm run test:coverage` | Run Vitest with coverage report                                  |
| `pnpm run lint`          | Run ESLint and fix issues                                        |
| `pnpm run format`        | Format code with Prettier                                        |
| `pnpm run checks`        | Run lint and format checks                                       |
| `pnpm run prepare`       | Compile TypeScript (pre-publish hook)                            |

## Runbooks

### Adding new models runbook

Follow these steps when adding a new model that supports `customFields`:

1. **Define the Zod schema** in `src/schemas/zod/models.ts`:
   - Name it `<ModelName>Schema` (e.g. `AwardBaseSchema`)
   - Include `customFields: z.record(CustomFieldSchema).nullish()` in its shape

2. **Register as extensible** so the plugin framework picks it up:
   - Add the model name to `ExtensibleSchemaName` in `src/extensions/types.ts`
   - Add a corresponding entry in `EXTENSIBLE_SCHEMA_MAP` in `src/extensions/types.ts` mapping the model name to its Zod schema

3. **Verify** by running `pnpm run test` — the `extensible-schema-coverage` test will catch:
   - Schemas with `customFields` that aren't registered in the map
   - Map entries that point to schemas without `customFields`

`definePlugin()` automatically includes all registered models, so no further wiring is needed.
