# Development Guide

### Prerequisites

- Node.js 22.13 or higher
- pnpm 11 or higher

### Development commands

| Command                  | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `pnpm install`           | Installs dependencies                                            |
| `pnpm run build`         | Builds the ESM package from `src` and runs TypeSpec              |
| `pnpm run typespec`      | Compile and emit TypeSpec outputs (i.e. OpenAPI and JSON schema) |
| `pnpm run test`          | Run Vitest test suite                                            |
| `pnpm run test:package`  | Test the packed SDK in an isolated ESM consumer                  |
| `pnpm run test:watch`    | Run Vitest in watch mode                                         |
| `pnpm run test:coverage` | Run Vitest with coverage report                                  |
| `pnpm run lint`          | Run ESLint and fix issues                                        |
| `pnpm run format`        | Format code with Prettier                                        |
| `pnpm run checks`        | Run lint and format checks                                       |
| `pnpm run prepare`       | Rebuild the publishable ESM artifact from `src`                  |

## ESM package validation

The SDK is published as native ESM. Relative imports in TypeScript source use `.js` extensions so
the emitted files work directly in Node.js. `tsconfig.build.json` limits package output to `src`;
tests and examples are type-checked but are not compiled into the npm artifact.

The package integration tests create consumers outside the pnpm workspace, install a packed
tarball, and verify native Node.js imports, strict TypeScript declaration resolution, and archive
contents. Run them with the rest of the suite after building the TypeSpec fixtures:

```bash
pnpm run build
pnpm run test
```

`pnpm run ci` is the authoritative CI command. It runs formatting, lint, type checks, the ESM build,
coverage (including package integration tests), and the offline transforms example.

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
