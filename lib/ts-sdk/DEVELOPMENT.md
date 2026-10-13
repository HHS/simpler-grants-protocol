# Development Guide

### Prerequisites

- Node.js 22.13 or higher
- pnpm 11 or higher

### Development commands

Run `pnpm install` once from the repo root. Then run these from `lib/ts-sdk/`, or from the repo root as `pnpm --filter @common-grants/sdk run <script>`.

| Command                  | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `pnpm run build`         | Compiles TypeScript code to JavaScript and runs TypeSpec         |
| `pnpm run typespec`      | Compile and emit TypeSpec outputs (i.e. OpenAPI and JSON schema) |
| `pnpm run test`          | Run Vitest test suite                                            |
| `pnpm run test:watch`    | Run Vitest in watch mode                                         |
| `pnpm run test:coverage` | Run Vitest with coverage report                                  |
| `pnpm run lint`          | Run ESLint and fix issues                                        |
| `pnpm run format`        | Format code with Prettier                                        |
| `pnpm run check:types`   | Check types, fail if issues are found                            |
| `pnpm run checks`        | Run lint, format and type checks                                 |
| `pnpm run ci`            | Run the checks, build, tests and transforms example that CI runs |
| `pnpm run prepare`       | Compile TypeScript (runs on `pnpm install`)                      |

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

### Release runbook

A full TypeScript SDK release runbook hasn't been written yet. Until then, follow [Hold branches](../README.md#hold-branches) and [Releasing from a hold branch](../README.md#releasing-from-a-hold-branch), including the rules for [SDK changes](../README.md#sdk-changes).
