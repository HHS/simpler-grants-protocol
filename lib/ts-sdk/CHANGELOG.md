# @common-grants/sdk

## 0.5.0

### Minor Changes

- 324809b: Add a TypeScript proof-of-concept for the plugin transformation framework (issue #798), mirroring the Python PoC in PR #810. Plugin authors can now compile declarative mapping objects into typed `(toCommon, fromCommon)` callables, validate `toCommon` output against an extended Zod schema, and attach those callables to a plugin via `definePlugin({ schemas })`.

  **New public surface (under `@common-grants/sdk/extensions`):**

  - `buildTransforms(toCommonMapping, fromCommonMapping, handlers?, commonModel?)` — compiles a pair of mapping objects into typed `(toCommon, fromCommon)` callables with call-time structural validation. `handlers` is a `Map<string, Handler>` for custom handler registration. Optional `commonModel` Zod schema turns parse failures into `PluginError[]` instead of thrown exceptions.
  - `TransformResult<T>` — unconditional `{ result, errors }` return shape.
  - `PluginError` — structured error class carrying `path`, `handler`, `sourceValue`, `cause`.
  - `transformFromMapping()`, `getFromPath()`, `DEFAULT_HANDLERS` — lower-level mapping runtime pieces; `DEFAULT_HANDLERS` is a `Map<string, Handler>` of six built-in handlers (`const`, `field`, `match` / `switch` alias, `numberToString`, `stringToNumber`).
  - `definePlugin()` accepts optional `meta: PluginMeta` and `schemas: SchemasInput`. All per-object declarations (custom fields, native schema, transforms) are co-located under `schemas[Object]` — `customFields` lives on `schemas[Object].customFields` rather than on the `extensions` key. The compiled `plugin.schemas[Object].common` holds the extended Zod schema.
  - `definePlugin()` **auto-wires transforms** from declarative `extensions.schemas[Name].mappings` at call time when no explicit `toCommon`/`fromCommon` callables are provided in `schemas[Name]`. The auto-wired path also runs `validateOutputPaths()` against the resolved schema (base or extended) so key-name mismatches are caught at `definePlugin()` call time rather than at runtime. Auto-wiring is all-or-nothing per object: any explicit callable disables it for that object.
  - New supporting types: `Handler`, `SchemasInput`, `ObjectSchemasInput`, `ObjectSchemas`, `PluginMeta`, `PluginCapability`, `ObjectMappings`, `PluginExtensionsObjectConfig`, `PluginExtensions`.

  **Three-state null handling (ADR-0024)** for optional fields:

  - `numberToString` and `stringToNumber` now preserve `null` source values as `null` (the publisher's "doesn't apply" assertion) instead of collapsing to `undefined`. Return types widen from `string | undefined` / `number | undefined` to `string | null | undefined` / `number | null | undefined`.
  - `match` / `switch` passes `null` source through by default; opt in to target-side translation via a `"null"` key in the `case` map. `default` is not consulted for `null` source values.
  - `field` / `getFromPath` already preserve terminal `null`; intermediate-null short-circuits the path (documented as propagating "doesn't apply").
  - The walker places handler-returned `null` onto the output object as a real `null`, distinct from an absent key — so consumers can read the three states (absent / `null` / value) end-to-end through `toCommon` and `fromCommon`.

  **Removed:**

  - `mergeExtensions` has been removed from the public surface. Consumers who previously used `mergeExtensions` to combine extension objects should merge them manually (e.g. with object spread) before passing to `definePlugin`.

  **Deferred to full SDK:**

  - Always-on `commonModel` validation inside `definePlugin()` — opt-in at `buildTransforms()` call site for now (pass the fully extended schema as `commonModel` to enable Zod validation on `toCommon` output).

  Runnable example: `pnpm --filter @common-grants/sdk example:transforms` (round-trips a synthetic grants.gov record through `toCommon` and `fromCommon` with custom `join` / `split` handlers, extended-schema validation, and three-state null preservation on `source_url: null`).

## 0.4.1

### Patch Changes

- 941413f: Document Node 22 as the minimum supported runtime via `engines.node: ">=22.0.0"`. Node 20 reached end of maintenance on 2026-04-30; this aligns the packages with current LTS and matches the runtime requirement upstream from `@typespec/compiler` 1.12+.

  Consumers of `@common-grants/sdk` who only import the published Zod schemas or TypeScript types at runtime are unaffected. The Node 22 floor applies when invoking `tsp` (via `@common-grants/cli` or compiling `@common-grants/core`) or building the SDK from source.

  Migration: the repo includes `.nvmrc` at root. Switch your local Node with `nvm use`, `fnm use`, or your runtime manager of choice.

## 0.4.0

### Minor Changes

- c2b9145: Adds a plugin framework for defining, composing, and sharing typed custom field extensions.

  **Additions:**
  - `definePlugin()` to create reusable plugins with typed schemas from `SchemaExtensions` configs
  - `mergeExtensions()` to combine extensions from multiple plugins with configurable conflict resolution
  - `HasCustomFields` and `ExtensibleObject` types to enforce compile-time constraints on `withCustomFields()` and `getCustomFieldValue()`
  - Extensions documentation covering custom field extraction, plugin composition, and API client integration

  ```typescript
  import { z } from "zod";
  import { definePlugin, mergeExtensions } from "@common-grants/sdk/extensions";

  // Define a plugin with typed custom fields
  const legacyPlugin = definePlugin({
    extensions: {
      Opportunity: {
        legacyId: {
          fieldType: "integer",
          value: z.number().int(),
          description: "Legacy system opportunity ID",
        },
      },
    },
  } as const);

  // Parse data with fully typed custom fields
  const opp = legacyPlugin.schemas.Opportunity.parse(data);
  opp.customFields?.legacyId?.value; // typed as number

  // Combine multiple plugins
  const merged = mergeExtensions([pluginA.extensions, pluginB.extensions]);
  const combined = definePlugin({ extensions: merged });
  ```

  **Breaking changes:**
  - `CustomFieldSpec.valueSchema` renamed to `CustomFieldSpec.value` to align with the Python SDK
  - `getCustomFieldValue()` now accepts the parent object directly (e.g. `getCustomFieldValue(opp, "legacyId", schema)`) instead of the raw `customFields` record, aligning with the Python SDK
  - `withCustomFields()` now requires schemas with a `customFields` property typed as `Record<string, CustomField>` (via the `HasCustomFields` constraint), rejecting loosely typed schemas at compile time

### Patch Changes

- c2b9145: Updates dependencies

## 0.3.0

### Minor Changes

- 2ab4121: Supports registering custom fields at runtime
  - Adds `withCustomFields` function to extend a base schema with typed custom fields
  - Adds `getCustomFieldValue` function to get and parse a typed value of a custom field from a customFields object
  - Updates `Client.opportunity` methods to allow SDK users to optionally pass a custom schema to parse the response data

  ```typescript
  import { z } from "zod";
  import { Client, Auth } from "@common-grants/sdk/client";
  import { OpportunityBaseSchema } from "@common-grants/sdk/schemas";
  import { CustomFieldType } from "@common-grants/sdk/constants";
  import { withCustomFields } from "@common-grants/sdk/extensions";

  const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
    legacyId: {
      name: "Legacy ID",
      fieldType: CustomFieldType.integer,
      valueSchema: z.number().int(),
      description:
        "An integer ID for the opportunity, needed for compatibility with legacy systems",
    },
  } as const);

  const client = new Client({
    baseUrl: "http://localhost:8000",
    auth: Auth.apiKey("your-api-key"),
  });

  async function main() {
    const opportunities = await client.opportunities.list({ schema: OpportunitySchema });

    for (const opportunity of opportunities.items) {
      console.log(`${opportunity.id}: ${opportunity.title}`);
      console.log(`  Status: ${opportunity.status.value}`);
      console.log(`  Legacy ID: ${opportunity.customFields?.legacyId?.value}`); // typed access
    }
  }

  main().catch(console.error);
  ```

## 0.2.0

### Minor Changes

- b204ace: Adds support for an API client with Opportunity resource methods.

  For example, to fetch an auto-paginated list of all opportunities:

  ```typescript
  import { Client, Auth } from "@common-grants/sdk/client";

  const client = new Client({
    baseUrl: "https://api.example.org",
    auth: Auth.apiKey("your-api-key"),
  });

  const opportunities = await client.opportunities.list();
  for (const opportunity of opportunities) {
    console.log(`${opportunity.id}: ${opportunity.title}`);
  }
  ```

## 0.1.0

### Minor Changes

- 188c01f: Creates @common-grants/sdk with zod schemas
