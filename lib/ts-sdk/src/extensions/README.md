# Extensions

The CommonGrants protocol defines a standard set of fields for grants data, but agencies and systems often need to track additional information beyond that core set. **Extensions** are the mechanism for adding these agency- or system-specific fields to CommonGrants resources without modifying the base specification.

For background, see:

- [Custom Fields catalog](https://commongrants.org/custom-fields/): The published set of recommended custom fields
- [Extensions section of the CommonGrants specification](https://commongrants.org/protocol/specification/#extensions): How extensions fit into the protocol

The `@common-grants/sdk/extensions` module provides TypeScript utilities for working with extensions: registering custom fields on base schemas, bundling them into reusable plugins, and composing plugins together.

## Table of contents <!-- omit in toc -->

- [Key concepts](#key-concepts)
- [Extending base models with custom fields](#extending-base-models-with-custom-fields)
  - [Option 1: Ad hoc with `withCustomFields()`](#option-1-ad-hoc-with-withcustomfields)
  - [Option 2: Build-time with plugins](#option-2-build-time-with-plugins)
- [Extracting custom field values](#extracting-custom-field-values)
  - [Direct dot notation](#direct-dot-notation)
  - [Using `getCustomFieldValue()`](#using-getcustomfieldvalue)
- [Plugins](#plugins)
  - [What is a plugin?](#what-is-a-plugin)
  - [Defining a plugin](#defining-a-plugin)
  - [Publishing a plugin](#publishing-a-plugin)
- [Using plugins with the API client](#using-plugins-with-the-api-client)
- [Plugin transformations (PoC)](#plugin-transformations-poc)
  - [Defining bidirectional transforms](#defining-bidirectional-transforms)
  - [Built-in mapping handlers](#built-in-mapping-handlers)
  - [Null handling](#null-handling)
  - [Custom handlers](#custom-handlers)
  - [Validating against the extended schema](#validating-against-the-extended-schema)
  - [Wiring transforms into a plugin](#wiring-transforms-into-a-plugin)
  - [Error handling](#error-handling)
- [Best practices](#best-practices)
  - [When you need `as const`](#when-you-need-as-const)
  - [Export value schemas alongside your plugin](#export-value-schemas-alongside-your-plugin)
  - [Use `peerDependencies` for `@common-grants/sdk`](#use-peerdependencies-for-common-grantssdk)
  - [Keep plugins focused](#keep-plugins-focused)
- [API reference](#api-reference)
  - [Plugin creation](#plugin-creation)
  - [Schema utilities](#schema-utilities)
  - [Transforms (PoC)](#transforms-poc)
  - [Shared types](#shared-types)

## Key concepts

Here are some key concepts that are used to define custom fields and plugins that extend base schemas from the CommonGrants protocol.

| Concept               | Description                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Custom field**      | A key-value pair attached to a resource's `customFields` property. Each field has a `name`, `fieldType`, `value`, and optional `description`.                                         |
| **`CustomFieldSpec`** | A TypeScript object that _describes_ a custom field: its `fieldType`, optional `value` (a Zod schema for validating the custom field's value), and optional `name` and `description`. |
| **`Plugin`**          | An object returned by `definePlugin()` with `.schemas` (per-object compiled output: `.commonSchema` Zod schema, `.sourceSchema`, `.toCommon`, `.fromCommon`) and optional `.meta`.    |

## Extending base models with custom fields

There are two ways to register custom fields on a base schema: at runtime (ad hoc) or at build-time (with plugins). Both produce Zod schemas with fully typed `customFields`.

### Option 1: Ad hoc with `withCustomFields()`

Use `withCustomFields()` when you want to extend a single schema directly, without creating a reusable plugin. This is useful for one-off scripts, tests, or quick prototyping.

```typescript
import { z } from "zod";
import { OpportunityBaseSchema } from "@common-grants/sdk/schemas";
import { withCustomFields } from "@common-grants/sdk/extensions";

// Define a Zod schema for a complex custom field value
const LegacyIdValueSchema = z.object({
  system: z.string(),
  id: z.number().int(),
});

// Extend the base schema with typed custom fields
const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
  legacyId: {
    fieldType: "object",
    value: LegacyIdValueSchema,
    description: "Maps to the opportunity_id in the legacy system",
  },
  category: {
    fieldType: "string",
    description: "Grant category",
  },
} as const);

// Parse data: customFields are now fully typed
const opportunity = OpportunitySchema.parse(data);

opportunity.customFields?.legacyId?.value.id; // number
opportunity.customFields?.category?.value; // string
```

**Key points:**

- `as const` on the specs is only needed when you assign them to a variable before the call; inline specs are inferred correctly without it. Forgetting it on a hoisted variable is a compile error. See [When you need `as const`](#when-you-need-as-const) for details.
- If a `value` Zod schema is provided in the spec, the custom field's `value` property is typed according to that schema. Otherwise, a default type is inferred from `fieldType` (e.g. `"string"` -> `string`, `"integer"` -> `number`).
- Unregistered custom fields still pass through validation but are typed as the base `CustomField` type (with `value: unknown`).

### Option 2: Build-time with plugins

Use `definePlugin()` when you want to create a **reusable, shareable** set of custom field definitions. Plugins are the recommended approach for any extensions that will be used across multiple files, projects, or teams.

```typescript
import { definePlugin } from "@common-grants/sdk/extensions";

const legacyPlugin = definePlugin({
  schemas: {
    Opportunity: {
      customFields: {
        legacyId: {
          fieldType: "object",
          value: LegacyIdValueSchema,
          description: "Maps to the opportunity_id in the legacy system",
        },
      },
    },
  },
} as const);

// The plugin exposes typed schemas for every extensible model
const opportunity = legacyPlugin.schemas.Opportunity.commonSchema.parse(data);
opportunity.customFields?.legacyId?.value.id; // number
```

See the [Plugins](#plugins) section below for full details on defining, composing, and publishing plugins.

## Extracting custom field values

There are two ways to access custom field values: direct dot notation and the `getCustomFieldValue()` helper.

### Direct dot notation

When data has been parsed through an extended schema (via `withCustomFields()` or a plugin), custom field values are fully typed and can be accessed directly:

```typescript
const opp = OpportunitySchema.parse(data);

// Typed access — no helper needed
opp.customFields?.legacyId?.value.id; // number
opp.customFields?.category?.value; // string
```

This is the simplest approach when you've already validated the data through the extended schema.

### Using `getCustomFieldValue()`

Use `getCustomFieldValue()` when you need to validate a custom field value against a Zod schema at runtime. This is useful in three main situations:

1. **Unregistered fields**: you didn't use `withCustomFields()` or a plugin to register a custom field, and want to validate its value at runtime.
2. **External data**: the data came from an external source and may not have been parsed through the extended schema.
3. **Programmatic access**: you need to access fields by variable name, such as in a loop.

The helper returns `undefined` if the key is absent (no `try`/`catch` needed) and throws a `ZodError` if the value is present but doesn't match the schema.

```typescript
import { getCustomFieldValue } from "@common-grants/sdk/extensions";

const opp = OpportunitySchema.parse(data);

// Returns { system: string; id: number } | undefined
const legacyId = getCustomFieldValue(opp, "legacyId", LegacyIdValueSchema);
if (legacyId) {
  console.log(legacyId.id); // typed as number
}

// Returns string | undefined
const category = getCustomFieldValue(opp, "category", z.string());

// Returns undefined — no error thrown
const missing = getCustomFieldValue(opp, "nonexistent", z.string());
```

`getCustomFieldValue()` works with both ad hoc (unregistered) and plugin-based (registered) custom fields.

## Plugins

### What is a plugin?

A plugin is any object that satisfies the `Plugin` interface:

```typescript
interface Plugin<T extends PluginSchemasInput = PluginSchemasInput> {
  schemas: PluginSchemas<T>;
  meta?: PluginMeta;
}
```

The `Plugin` interface uses [structural typing](https://www.typescriptlang.org/docs/handbook/type-compatibility.html), so any object with the right shape qualifies as a plugin, whether it comes from a local file, a monorepo package, or an installed npm package. There is no base class to extend or registry to sign up for. In practice, you'll almost always create plugins with `definePlugin()`, which builds `.schemas` (including the `.commonSchema` Zod schema) from your `schemas` input automatically.

For the full interface definition, see [define-plugin.ts](./define-plugin.ts).

### Defining a plugin

```typescript
import { z } from "zod";
import { definePlugin } from "@common-grants/sdk/extensions";

const LegacyIdValueSchema = z.object({
  system: z.string(),
  id: z.number().int(),
});

const myPlugin = definePlugin({
  schemas: {
    Opportunity: {
      customFields: {
        legacyId: {
          fieldType: "object",
          value: LegacyIdValueSchema,
          description: "Maps to the opportunity_id in the legacy system",
        },
        category: {
          fieldType: "string",
          description: "Grant category",
        },
        priority: {
          fieldType: "integer",
          description: "Processing priority (1 = highest)",
        },
      },
    },
  },
} as const);
```

> [!IMPORTANT]
> Always pass `as const` to the options object for `definePlugin()` (and the specs object for `withCustomFields()`) as a safe default. Without it, TypeScript can widen literal types like `"string"` to `string`, which prevents the type system from inferring the correct `value` type for each custom field. It is strictly required only when you assign the specs to a variable before the call; see [When you need `as const`](#when-you-need-as-const) for the details.

The returned `Plugin` object has two properties:

- **`myPlugin.schemas`**: a record of per-object compiled output, one entry per extensible model. Each entry has:
  - `.commonSchema` — the Zod schema with typed `customFields` applied (use this to parse data).
  - `.sourceSchema`, `.toCommon`, `.fromCommon` — populated when transforms are configured.
- **`myPlugin.meta`**: optional plugin identity (`name`, `version`, `sourceSystem`, `capabilities`).

### Publishing a plugin

#### Package structure

A minimal plugin package has one source file and two config files:

```
my-plugin/
  src/
    index.ts        # Plugin definition and package entry point
  tsconfig.json     # Must emit declaration files for type inference
  package.json      # Declares @common-grants/sdk as a peer dependency
```

**`src/index.ts`** defines and exports the plugin:

```typescript
import { z } from "zod";
import { definePlugin } from "@common-grants/sdk/extensions";

export const ProgramAreaValueSchema = z.object({
  code: z.string(),
  name: z.string(),
});

const plugin = definePlugin({
  schemas: {
    Opportunity: {
      customFields: {
        programArea: {
          fieldType: "object",
          value: ProgramAreaValueSchema,
          description: "The HHS program area for this opportunity",
        },
        cfda: {
          fieldType: "string",
          description: "CFDA number",
        },
      },
    },
  },
} as const);

export default plugin;
```

**`tsconfig.json`** must emit declaration files so consumers get type inference:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**`package.json`**:

```json
{
  "name": "@commongrants/hhs-plugin",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "peerDependencies": {
    "@common-grants/sdk": "^0.3.0"
  },
  "devDependencies": {
    "@common-grants/sdk": "^0.3.0",
    "typescript": "^5.0.0",
    "zod": "^3.25.0"
  }
}
```

#### Pre-publish checklist

1. **Build** the package to generate `.js` and `.d.ts` files in `dist/`.
2. **Verify type inference**: import your plugin in a test file and confirm that `.schemas` parse types resolve correctly. Hover over the types in your editor to confirm they are not `any`:

   ```typescript
   import plugin from "./";

   plugin.schemas.Opportunity.commonSchema.parse({} as any); // fully typed result
   ```

3. **Publish** with `npm publish` (or your preferred registry workflow).

#### Consumer usage

After installing the plugin (e.g. `npm install @commongrants/hhs-plugin`):

```typescript
import hhs from "@commongrants/hhs-plugin";

const opp = hhs.schemas.Opportunity.commonSchema.parse(data);
opp.customFields?.programArea?.value.code; // string
opp.customFields?.cfda?.value; // string
```

## Using plugins with the API client

Pass a plugin's extended schema to the API client via the `schema` option. The client uses it to parse API responses into fully typed objects:

```typescript
import { Client, Auth } from "@common-grants/sdk/client";
import { definePlugin } from "@common-grants/sdk/extensions";

const myPlugin = definePlugin({
  schemas: {
    Opportunity: {
      customFields: {
        legacyId: { fieldType: "integer", description: "Legacy system ID" },
        category: { fieldType: "string", description: "Grant category" },
      },
    },
  },
} as const);

const client = new Client({
  baseUrl: "https://api.example.gov",
  auth: Auth.apiKey("your-api-key"),
});

// Get a single opportunity with typed custom fields
const opp = await client.opportunities.get(oppId, {
  schema: myPlugin.schemas.Opportunity.commonSchema,
});
opp.customFields?.legacyId?.value; // typed as number
opp.customFields?.category?.value; // typed as string

// List with the same schema
const response = await client.opportunities.list({
  schema: myPlugin.schemas.Opportunity.commonSchema,
});
for (const opp of response.items) {
  console.log(opp.customFields?.category?.value);
}

// Search with the same schema
const results = await client.opportunities.search({
  query: "health",
  statuses: ["open"],
  schema: myPlugin.schemas.Opportunity.commonSchema,
});
```

The `schema` option is accepted by `get()`, `list()`, and `search()`. When omitted, the client falls back to `OpportunityBaseSchema` (with untyped `customFields`).

## Plugin transformations (PoC)

> **Status:** Proof-of-concept (issue [#798](https://github.com/HHS/simpler-grants-protocol/issues/798)). Mirrors the Python PoC in [PR #810](https://github.com/HHS/simpler-grants-protocol/pull/810). Contract follows [ADR-0022](https://commongrants.org/governance/adr/0022-plugin-framework/) and [ADR-0017](https://commongrants.org/governance/adr/0017-mapping-format/).

Plugins can declare bidirectional transforms that convert between a source system's native shape and the CommonGrants protocol. `toCommon` maps `native → CommonGrants`; `fromCommon` reverses it. Both directions are author-provided — the SDK does not invert one into the other, because many-to-one handlers (like `match`) are not reversible.

### Defining bidirectional transforms

Use `buildTransforms()` to compile a pair of mapping objects into typed callables:

```typescript
import { buildTransforms } from "@common-grants/sdk/extensions";

const { toCommon, fromCommon } = buildTransforms(
  // toCommonMapping: native → CommonGrants
  {
    id: { field: "data.opportunity_uuid" },
    title: { field: "data.opportunity_title" },
    description: { field: "data.opportunity_description" },
    createdAt: { field: "data.created_at" },
    lastModifiedAt: { field: "data.last_modified_at" },
    status: {
      value: {
        match: {
          field: "data.opportunity_status",
          case: { posted: "open", archived: "closed", forecasted: "forecasted" },
          default: "custom",
        },
      },
    },
  },
  // fromCommonMapping: CommonGrants → native
  {
    data: {
      opportunity_uuid: { field: "id" },
      opportunity_title: { field: "title" },
    },
  }
);

const result = toCommon(sourceData);
if (result.errors.length === 0) {
  use(result.result);
}
```

Each callable returns a `TransformResult<T>` of `{ result, errors }` unconditionally. Partial failures surface as `TransformError[]` rather than thrown exceptions — consumers choose their own strict-vs-lenient rule.

### Built-in mapping handlers

Mapping objects are nested literals where keys are either output field names or registered handler names. The handler-keyed node dispatches the handler with `(data, handlerArg)`. Bare primitives are treated as literals.

| Handler          | Spec shape                                      | Behavior                                                                                                                                                            |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field`          | `{ field: "dot.notation.path" }`                | Plucks a value from the source via dot-notation. Terminal `null` is preserved; absent / intermediate-null returns `undefined`. See [Null handling](#null-handling). |
| `const`          | `{ const: <literal> }`                          | Returns the literal value, ignoring source data.                                                                                                                    |
| `match`          | `{ match: { field, case: { ... }, default? } }` | Case-based lookup on a source field value. `null` source passes through unchanged; opt-in target-side translation via `case: { "null": ... }`.                      |
| `switch`         | Same as `match`                                 | Convenience alias for `match` — both point at the same handler function.                                                                                            |
| `numberToString` | `{ numberToString: "dot.notation.path" }`       | Plucks a value and coerces to string via `String()`. Returns `null` on `null` source ("doesn't apply"); `undefined` on absent.                                      |
| `stringToNumber` | `{ stringToNumber: "dot.notation.path" }`       | Plucks a value, parses as int when possible, falls back to float. Returns `null` on `null` source; `undefined` on absent. Throws on non-numeric input.              |

### Null handling

The transforms layer respects [ADR-0024](https://commongrants.org/governance/adr/0024-optional-field-nullability/)'s three-state contract for optional fields. Optional values carry three distinct states on the wire, each preserved through the transform:

| State      | Meaning                                                                                  | Handler output |
| ---------- | ---------------------------------------------------------------------------------------- | -------------- |
| **absent** | "Not provided" — the publisher did not supply this data                                  | `undefined`    |
| **`null`** | "Doesn't apply" — the publisher actively asserts the field is irrelevant for this record | `null`         |
| **value**  | "Has a value"                                                                            | coerced value  |

The built-in coercing handlers (`numberToString`, `stringToNumber`) pass `null` through unchanged instead of collapsing it to `undefined`. `field` defers to `getFromPath`, which preserves terminal `null` and treats an intermediate `null` as a propagating absence (`{ a: null }` at path `"a.b"` → `undefined`).

`match` / `switch` adds an opt-in for target-side translation. By default a `null` source passes through:

```typescript
// status = null on input → status = null on output (publisher's "doesn't apply" survives)
{ match: { field: "status", case: { posted: "open", archived: "closed" }, default: "custom" } }
```

To translate "doesn't apply" into a target-side sentinel (e.g. an `n_a` status token), opt in via a `"null"` case key:

```typescript
// status = null on input → status = "n_a" on output (author-chosen translation)
{ match: { field: "status", case: { posted: "open", "null": "n_a" }, default: "custom" } }
```

`default` is **not** consulted for `null` source values — `default` belongs to "unrecognized value," not to "publisher asserts irrelevant." The opt-in `"null"` case key is the only path from `null` source to a non-`null` target.

**For custom-handler authors:** preserve the three-state contract when you write your own handlers. Return `undefined` for "not provided," return `null` for "doesn't apply," return a value otherwise. The walker omits keys whose handler returned `undefined` and writes `null` returns as a real, present `null` — so the output object distinguishes the three states the same way the wire does: absent → key omitted, `null` → present `null`, value → present value. Consumers can check for key presence to tell "not provided" from "doesn't apply."

> **Cross-SDK note.** The TS PoC leads on [ADR-0024](https://commongrants.org/governance/adr/0024-optional-field-nullability/) alignment: it preserves the three-state distinction (absent / `null` / value) at the transform layer. The Python PoC ([#810](https://github.com/HHS/simpler-grants-protocol/pull/810)) predates ADR-0024 and still collapses `None` source into the "not provided" path for the coercing handlers — bringing the Python handlers to parity is a pending follow-up.

### Custom handlers

Register additional handlers per `buildTransforms()` call. Name collisions with built-ins raise at call time. Custom handlers should follow the three-state contract from [Null handling](#null-handling) above:

```typescript
import { buildTransforms, getFromPath } from "@common-grants/sdk/extensions";

// `join` is a special case: string concatenation has no meaningful null
// behavior, so the filter below drops both `undefined` and `null` source
// values. This is appropriate for `join` specifically — most coercing
// handlers should follow `numberToString` / `stringToNumber` and preserve
// the three-state contract (return `null` on null source, `undefined` on
// absent) instead.
const join = (data: unknown, spec: unknown) => {
  const s = spec as { fields?: string[]; sep?: string };
  const parts = (s.fields ?? [])
    .map(p => getFromPath(data, p))
    .filter(v => v !== undefined && v !== null)
    .map(String);
  return parts.length > 0 ? parts.join(s.sep ?? " ") : undefined;
};

const { toCommon } = buildTransforms(
  { label: { join: { fields: ["a.b", "c.d"], sep: " — " } } },
  {},
  new Map([["join", join]])
);
```

### Validating against the extended schema

Pass an optional `commonSchema` to validate `toCommon` output. **Use the fully extended schema** (the result of `withCustomFields()`), not the base schema — passing the base silently weakens validation of typed custom fields:

```typescript
import { buildTransforms, withCustomFields } from "@common-grants/sdk/extensions";
import { OpportunityBaseSchema } from "@common-grants/sdk/schemas";

const ExtendedOpportunity = withCustomFields(OpportunityBaseSchema, {
  legacyId: { fieldType: "integer", value: z.number().int() },
});

const { toCommon } = buildTransforms(
  {
    /* toCommonMapping ... */
  },
  {},
  undefined,
  ExtendedOpportunity
);

const out = toCommon(sourceData);
// On validation failure, `out.result` holds the raw transformed object so
// callers can inspect malformed data alongside `out.errors`.
```

### Wiring transforms into a plugin

There are two ways to wire transforms into a plugin entry. These are mutually exclusive — you cannot provide both `mappings` and explicit callables on the same entry.

**Option A: Declarative mappings** — pass a `mappings` object and `definePlugin()` compiles `toCommon` / `fromCommon` for you:

```typescript
const plugin = definePlugin({
  meta: {
    name: "grants.gov",
    sourceSystem: "grants.gov",
    capabilities: ["customFields", "transforms"],
  },
  schemas: {
    Opportunity: {
      sourceSchema: GrantsGovOpportunity,
      customFields: { /* customFieldSpecs */ },
      mappings: {
        toCommon: {
          id:    { field: "data.opportunity_uuid" },
          title: { field: "data.opportunity_title" },
          status: {
            value: {
              match: {
                field: "data.opportunity_status",
                case: { posted: "open", archived: "closed" },
                default: "custom",
              },
            },
          },
        },
        fromCommon: {
          data: {
            opportunity_uuid:  { field: "id" },
            opportunity_title: { field: "title" },
          },
        },
      },
    },
  },
} as const);
```

**Option B: Hand-written callables** — pass `toCommon` / `fromCommon` directly for logic that declarative mappings cannot express:

```typescript
const plugin = definePlugin({
  meta: {
    name: "grants.gov",
    sourceSystem: "grants.gov",
    capabilities: ["customFields", "transforms"],
  },
  schemas: {
    Opportunity: {
      sourceSchema: GrantsGovOpportunity,
      customFields: { /* customFieldSpecs */ },
      toCommon,
      fromCommon,
    },
  },
} as const);
```

Both options expose the same runtime surface:

```typescript
const { result, errors } = plugin.schemas.Opportunity.toCommon(sourceData);
```

For a complete runnable round-trip covering both options, custom handlers, and `commonSchema` validation, see [`examples/transforms.ts`](../../examples/transforms.ts) (`pnpm example:transforms`).

### Error handling

`TransformError` carries structured context — `path`, `handler`, `sourceValue`, `cause` — so consumers can reason about failures programmatically without parsing error text:

```typescript
const out = toCommon(sourceData);
for (const err of out.errors) {
  // Build a redacted projection — err.sourceValue / err.cause carry input data
  // by design; the projection enumerates only safe
  // fields. On the Zod-validation path err.message is also data-bearing —
  // see the PII warning below for the full picture and tracking issue.
  const safe = { name: err.name, message: err.message, path: err.path, handler: err.handler };
  console.warn(safe);
}
```

> **PII warning (ADR-0022 Decision #9):** The SDK does **not** redact by default. `TransformError.sourceValue` and `cause` are plain enumerable fields and flow through `JSON.stringify(err)`, `util.inspect(err)`, `console.log(err)`, and any logger that enumerates own properties. `sourceValue` is populated with the entire input record passed to `toCommon` / `fromCommon` — not just the value at the failing field. Log a redacted projection instead — e.g. `{ name: err.name, message: err.message, path: err.path, handler: err.handler }`. On the Zod-validation path (when `commonSchema` is passed to `buildTransforms()`), `TransformError.message` is also data-bearing — Zod's default error map embeds the rejected value into `issue.message`, which flows verbatim into `TransformError.message`. Redact `message` alongside `sourceValue` and `cause`. Full-message sanitization is tracked under [#744](https://github.com/HHS/simpler-grants-protocol/issues/744).

## Best practices

### When you need `as const`

**Shortcut:** if you write `fieldType` using the `CustomFieldType` enum (e.g. `CustomFieldType.integer`), you never need `as const`. Enum values are already fixed literals and don't widen. The rest of this section only matters if you type `fieldType` as a raw string literal like `"integer"`.

For raw string literals, `as const` is only required when you assign the specs (or the whole options object) to a **variable** before passing them to `definePlugin()` or `withCustomFields()`. Written **inline** in the call, you don't need it.

**Why:** each spec's `fieldType` needs to stay a literal (`"integer"`, `"string"`) for the type system to work. A raw string literal passed inline is kept literal for you by the function. But stored in a variable first, TypeScript infers the variable's type on its own and widens the raw literal `"integer"` to `string`. A widened `fieldType` can no longer determine the field's `value` type, so `value` falls back to `unknown`. (This only affects fields that rely on the default value type. Fields that pass an explicit `value` schema keep their type either way, but it's simplest to apply `as const` whenever you hoist raw-literal specs. Enum values, as noted above, never widen.)

You typically hoist specs into a variable to reuse them, for example to feed `typeof customFields` into the `ToCommon` / `FromCommon` transform helper types.

```ts
// OK (inline, no `as const` needed):
definePlugin({
  schemas: { Opportunity: { customFields: { legacyId: { fieldType: "integer" } } } },
});

// Needs `as const` (specs hoisted into a variable):
const customFields = { legacyId: { fieldType: "integer" } } as const;
definePlugin({ schemas: { Opportunity: { customFields } } });
```

If you hoist the specs and forget `as const`, the call still fails to compile. The message is TypeScript's built-in one: the widened `fieldType` (now `string`) is no longer a valid `CustomFieldType`. Adding `as const` resolves it.

```ts
const customFields = { legacyId: { fieldType: "integer" } }; // no `as const`
definePlugin({ schemas: { Opportunity: { customFields } } });
// Error: Type '{ fieldType: string; ... }' is not assignable to type 'CustomFieldSpec'.
//        Type 'string' is not assignable to type '"string" | "number" | "integer" | ...'.
```

(Adding `as const` to an inline call is harmless, just unnecessary.)

### Export value schemas alongside your plugin

When you define Zod schemas for complex `value` fields, export them as named exports from your package. Downstream consumers may need these schemas for use with utilities like `getCustomFieldValue()`:

```typescript
// index.ts of a plugin package
import { z } from "zod";
import { definePlugin } from "@common-grants/sdk/extensions";

// Export value schemas so consumers can reference them directly
export const ProgramAreaValueSchema = z.object({
  code: z.string(),
  name: z.string(),
});

const plugin = definePlugin({
  schemas: {
    Opportunity: {
      customFields: {
        programArea: {
          fieldType: "object",
          value: ProgramAreaValueSchema,
          description: "The HHS program area for this opportunity",
        },
      },
    },
  },
} as const);

export default plugin;
```

This allows consumers to use `getCustomFieldValue()` with the same schema the plugin uses for validation:

```typescript
import hhs, { ProgramAreaValueSchema } from "@commongrants/hhs-plugin";
import { getCustomFieldValue } from "@common-grants/sdk/extensions";

const opp = hhs.schemas.Opportunity.commonSchema.parse(data);

// Extract the value with full type safety using the exported schema
const area = getCustomFieldValue(opp, "programArea", ProgramAreaValueSchema);
area?.code; // string
```

### Use `peerDependencies` for `@common-grants/sdk`

Declare `@common-grants/sdk` as a `peerDependency` in your plugin's `package.json` rather than a direct `dependency`. This ensures that consumers who install multiple plugins all share a single copy of the SDK, avoiding version conflicts and duplicate type definitions. See [Publishing a plugin](#publishing-a-plugin) for a full `package.json` example.

### Keep plugins focused

A plugin should represent a single logical concern (one agency's fields, one integration's needs, or one domain concept). If you need fields from multiple concerns, define a combined plugin with all fields declared under a single `definePlugin({ schemas: { ... } })` call rather than splitting them across separate plugins.

## API reference

The tables below list everything exported from `@common-grants/sdk/extensions`, grouped by how they're used. Each entry links to the source definition and (where applicable) the section of this guide where it's demonstrated.

### Plugin creation

| Export                                      | Kind      | Description                                                                                                                                                                              | Demonstrated in                         |
| ------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [`definePlugin()`](./define-plugin.ts)      | function  | Creates a `Plugin` from `DefinePluginOptions`. Returns an object with `.schemas` (per-object output: `.commonSchema`, `.sourceSchema`, `.toCommon`, `.fromCommon`) and optional `.meta`. | [Defining a plugin](#defining-a-plugin) |
| [`Plugin`](./define-plugin.ts)              | interface | The object returned by `definePlugin()`.                                                                                                                                                 | [What is a plugin?](#what-is-a-plugin)  |
| [`DefinePluginOptions`](./define-plugin.ts) | interface | Options for `definePlugin()`. `schemas` carries all per-object input (custom fields, native schema, declarative mappings, transforms); `meta` is plugin identity.                        | [Defining a plugin](#defining-a-plugin) |

### Schema utilities

| Export                                                 | Kind     | Description                                                                                                                                                    | Demonstrated in                                                            |
| ------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`withCustomFields()`](./with-custom-fields.ts)        | function | Extends a single Zod object schema with typed custom fields. Unregistered fields pass through but are typed as the base `CustomField`.                         | [Ad hoc with `withCustomFields()`](#option-1-ad-hoc-with-withcustomfields) |
| [`WithCustomFieldsResult`](./with-custom-fields.ts)    | type     | The return type of `withCustomFields()`. A Zod object schema where `customFields` is replaced with a typed version.                                            |                                                                            |
| [`getCustomFieldValue()`](./get-custom-field-value.ts) | function | Safely extracts and parses a custom field value from an `ExtensibleObject`. Returns the parsed value, `undefined` if missing, or throws `ZodError` if invalid. | [Extracting custom field values](#extracting-custom-field-values)          |

### Transforms (PoC)

| Export                                               | Kind      | Description                                                                                                                                                                                                                                       | Demonstrated in                                                         |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`buildTransforms()`](./transforms.ts)               | function  | Compiles a pair of mapping objects into typed `(toCommon, fromCommon)` callables. Positional params: `(toCommonMapping, fromCommonMapping, handlers?, commonSchema?, sourceSchema?)`. Validates mapping structure at call time; collisions with built-ins throw. | [Defining bidirectional transforms](#defining-bidirectional-transforms) |
| [`BuiltTransforms`](./transforms.ts)                 | interface | Return shape of `buildTransforms()` — `{ toCommon, fromCommon }`.                                                                                                                                                                                 |                                                                         |
| [`transformFromMapping()`](./transformation.ts)      | function  | Low-level mapping walker used by `buildTransforms()`. Useful if you want to drive a single mapping pass without the call-time validation or error-wrapping layer.                                                                                 |                                                                         |
| [`TransformFromMappingOptions`](./transformation.ts) | interface | Options for `transformFromMapping()`: optional `handlers` registry (`Map<string, Handler>`).                                                                                                                                                      |                                                                         |
| [`DEFAULT_HANDLERS`](./transformation.ts)            | const     | `Map<string, Handler>` of built-in handlers: `const`, `field`, `match`, `numberToString`, `stringToNumber`, `switch`.                                                                                                                             | [Built-in mapping handlers](#built-in-mapping-handlers)                 |
| [`getFromPath()`](./transformation.ts)               | function  | Walks an object via dot-notation; returns `undefined` (or a provided default) when the path is missing or traverses a non-object.                                                                                                                 |                                                                         |
| [`TransformResult`](./types.ts)                      | interface | Unconditional return shape `{ result, errors }` for `toCommon` / `fromCommon`.                                                                                                                                                                    | [Defining bidirectional transforms](#defining-bidirectional-transforms) |
| [`TransformError`](./types.ts)                       | class     | Structured transformation error carrying `path`, `handler`, `sourceValue`, `cause`. Extends `Error`.                                                                                                                                              | [Error handling](#error-handling)                                       |
| [`Handler`](./types.ts)                              | type      | Signature for mapping handler functions: `(data, arg) => unknown`.                                                                                                                                                                                | [Custom handlers](#custom-handlers)                                     |
| [`PluginMeta`](./types.ts)                           | interface | Plugin identity: `name` (required), `sourceSystem` (required), optional `version` and `capabilities`.                                                                                                                                             | [Wiring transforms into a plugin](#wiring-transforms-into-a-plugin)     |
| [`PluginCapability`](./types.ts)                     | type      | Literal union of capability names: `"customFields" \| "customFilters" \| "transforms"`.                                                                                                                                                           |                                                                         |
| [`PluginSchemasInput`](./define-plugin.ts)           | type      | Map from extensible model name to `SchemaInput`. The shape of `DefinePluginOptions.schemas`.                                                                                                                                                      | [Wiring transforms into a plugin](#wiring-transforms-into-a-plugin)     |
| [`SchemaInput`](./types.ts)                          | type      | Author-provided input per object: `{ sourceSchema?, customFields?, mappings? }` or `{ sourceSchema?, customFields?, toCommon?, fromCommon? }`. XOR: `mappings` and explicit callables cannot both be present.                                     | [Wiring transforms into a plugin](#wiring-transforms-into-a-plugin)     |
| [`SchemaOnly`](./types.ts)                           | interface | Compiled output for schema-only entries: `{ commonSchema, sourceSchema? }`. Produced when no transforms are configured.                                                                                                                           |                                                                         |
| [`SchemaWithTransforms`](./types.ts)                 | interface | Compiled output for entries with transforms: `{ commonSchema, sourceSchema?, toCommon, fromCommon }`. Produced when `mappings` or explicit callables are provided.                                                                                |                                                                         |
| [`SchemaMappings`](./types.ts)                       | interface | Declarative `{ toCommon?, fromCommon? }` mapping dicts. Stored inside `SchemaInput.mappings`.                                                                                                                                                     |                                                                         |
| [`TransformTypes`](./transform-helpers.ts)           | interface | Named argument for `ToCommon` / `FromCommon`: `{ model, sourceSchema, customFields? }`. `model` selects the base schema; the common type is resolved from `customFields`.                                                                         |                                                                         |
| [`ToCommon`](./transform-helpers.ts)                 | type      | Helper type for a hand-written `toCommon`. Takes a `TransformTypes` arg; `source` is typed from `sourceSchema`, the return checked against the resolved common **input** type.                                                                    |                                                                         |
| [`FromCommon`](./transform-helpers.ts)               | type      | Helper type for a hand-written `fromCommon`. Takes a `TransformTypes` arg; `common` is the resolved common **output** type, the return the source type.                                                                                           |                                                                         |

### Shared types

| Export                               | Kind      | Description                                                                                                                 | Demonstrated in               |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [`CustomFieldSpec`](./types.ts)      | interface | Describes a single custom field: its `fieldType`, optional `value`, and optional `name`/`description`.                      | [Key concepts](#key-concepts) |
| [`ExtensibleSchemaName`](./types.ts) | type      | Union of model names that support `customFields` extensions. Currently: `"Opportunity"`.                                    |                               |
| [`HasCustomFields`](./types.ts)      | type      | A Zod object schema whose shape includes a `customFields` property. Constrains `withCustomFields()` inputs at compile time. |                               |
| [`ExtensibleObject`](./types.ts)     | interface | An object with an optional `customFields` property. Constrains `getCustomFieldValue()` inputs at compile time.              |                               |
