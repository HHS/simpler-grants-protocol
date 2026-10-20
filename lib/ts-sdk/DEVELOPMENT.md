# Development Guide

### Prerequisites

- Node.js 22.13 or higher
- pnpm 11 or higher

### Development commands

Run `pnpm install` once from the repo root. Then run these from `lib/ts-sdk/`, or from the repo root as `pnpm --filter @common-grants/sdk run <script>`.

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
| `pnpm run check:types`   | Check types, fail if issues are found                            |
| `pnpm run checks`        | Run lint, format and type checks                                 |
| `pnpm run ci`            | Run the build, checks, tests and package check that CI runs      |
| `pnpm run prepare`       | Rebuild the publishable ESM artifact from `src`                  |

## ESM package validation

The SDK is published as native ESM. Relative imports in TypeScript source use `.js` extensions so
the emitted files work directly in Node.js. `tsconfig.build.json` limits package output to `src`;
tests and examples are type-checked but are not compiled into the npm artifact.

The package check creates a consumer outside the pnpm workspace, installs a packed tarball, and
verifies native Node.js imports, strict TypeScript declaration resolution, and archive contents. It
runs separately from the unit suite through its own command so ordinary `pnpm run test` does not
perform a registry install:

```bash
pnpm run test:package
```

`test:package` packs the SDK (building it through the `prepare` lifecycle), then installs the
tarball with npm. That install resolves the SDK's runtime dependencies from the registry, so it
needs network access; the subsequent runtime probes make no network requests.

`pnpm run ci` is the authoritative CI command and runs in dependency order: the ESM build, lint and
format and type checks, coverage, the offline transforms example, and finally the package check.

## Runbooks

### Adding new models runbook

Follow these steps when adding a new model that supports `customFields`:

1. **Define the Zod schema** in `src/schemas/zod/models.ts`:
   - Name it `<ModelName>Schema` (e.g. `AwardBaseSchema`)
   - Include `customFields: z.record(CustomFieldSchema).nullish()` in its shape

2. **Register as extensible** so the plugin framework picks it up:
   - Add the model name to `ExtensibleSchemaName` in `src/extensions/types.ts`
   - Add a corresponding entry in `EXTENSIBLE_SCHEMA_MAP` in `src/extensions/types.ts` mapping the model name to its Zod schema

3. **Verify** by running `pnpm run test`. The `extensible-schema-coverage` test will catch:
   - Schemas with `customFields` that aren't registered in the map
   - Map entries that point to schemas without `customFields`

`definePlugin()` automatically includes all registered models, so no further wiring is needed.

### Release runbook

A full TypeScript SDK release runbook hasn't been written yet. Until then, follow [Hold branches](../README.md#hold-branches) and [Releasing from a hold branch](../README.md#releasing-from-a-hold-branch), including the rules for [SDK changes](../README.md#sdk-changes).
