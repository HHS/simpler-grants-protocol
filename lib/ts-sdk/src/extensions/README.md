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
  - [Combining plugins](#combining-plugins)
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
  - [Export value schemas alongside your plugin](#export-value-schemas-alongside-your-plugin)
  - [Use `peerDependencies` for `@common-grants/sdk`](#use-peerdependencies-for-common-grantssdk)
  - [Keep plugins focused](#keep-plugins-focused)
  - [Avoid `"firstWins"` / `"lastWins"` in published plugins](#avoid-firstwins--lastwins-in-published-plugins)
- [API reference](#api-reference)
  - [Plugin creation](#plugin-creation)
  - [Schema utilities](#schema-utilities)
  - [Merging and composition](#merging-and-composition)
  - [Transforms (PoC)](#transforms-poc)
  - [Shared types](#shared-types)

## Key concepts

Here are some key concepts that are used to define custom fields and plugins that extend base schemas from the CommonGrants protocol.

| Concept                | Description                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Custom field**       | A key-value pair attached to a resource's `customFields` property. Each field has a `name`, `fieldType`, `value`, and optional `description`.                                         |
| **`CustomFieldSpec`**  | A TypeScript object that _describes_ a custom field: its `fieldType`, optional `value` (a Zod schema for validating the custom field's value), and optional `name` and `description`. |
| **`SchemaExtensions`** | A mapping of extensible model names (e.g. `"Opportunity"`) to records of `CustomFieldSpec` objects. This is the shape that `definePlugin()` and `withCustomFields()` accept.          |
| **`Plugin`**           | An object with `.extensions` (the raw `SchemaExtensions`) and `.schemas` (Zod schemas with typed `customFields` applied). Created by `definePlugin()`.                                |

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

- Pass `as const` to the specs object so TypeScript can infer literal `fieldType` values and preserve the specific keys.
- If a `value` Zod schema is provided in the spec, the custom field's `value` property is typed according to that schema. Otherwise, a default type is inferred from `fieldType` (e.g. `"string"` -> `string`, `"integer"` -> `number`).
- Unregistered custom fields still pass through validation but are typed as the base `CustomField` type (with `value: unknown`).

### Option 2: Build-time with plugins

Use `definePlugin()` when you want to create a **reusable, shareable** set of custom field definitions. Plugins are the recommended approach for any extensions that will be used across multiple files, projects, or teams.

```typescript
import { definePlugin } from "@common-grants/sdk/extensions";

const legacyPlugin = definePlugin({
  extensions: {
    Opportunity: {
      legacyId: {
        fieldType: "object",
        value: LegacyIdValueSchema,
        description: "Maps to the opportunity_id in the legacy system",
      },
    },
  },
} as const);

// The plugin exposes typed schemas for every extensible model
const opportunity = legacyPlugin.schemas.Opportunity.parse(data);
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
interface Plugin<T extends SchemaExtensions = SchemaExtensions> {
  extensions: T;
  schemas: PluginSchemas<T>;
}
```

The `Plugin` interface uses [structural typing](https://www.typescriptlang.org/docs/handbook/type-compatibility.html), so any object with the right shape qualifies as a plugin, whether it comes from a local file, a monorepo package, or an installed npm package. There is no base class to extend or registry to sign up for. In practice, you'll almost always create plugins with `definePlugin()`, which handles building the `.schemas` from your `.extensions` automatically.

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
  extensions: {
    Opportunity: {
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
} as const);
```

> [!IMPORTANT]
> Always pass `as const` to the options object for `definePlugin()` (and the specs object for `withCustomFields()`). Without it, TypeScript widens literal types like `"string"` to `string`, which prevents the type system from inferring the correct `value` type for each custom field.

The returned `Plugin` object has two main properties:

- **`myPlugin.extensions`**: the raw `SchemaExtensions` you passed in, preserved by reference. Useful for introspection or for passing to `mergeExtensions()`.
- **`myPlugin.schemas`**: a record of Zod schemas, one per extensible model. Each schema has typed `customFields` based on the specs you provided. Models without extensions pass through with their base schema.

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
  extensions: {
    Opportunity: {
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
2. **Verify type inference**: import your plugin in a test file and confirm that `.extensions` keys and `.schemas` parse types resolve correctly. Hover over the types in your editor to confirm they are not `any`:

   ```typescript
   import plugin from "./";

   plugin.extensions.Opportunity.programArea; // CustomFieldSpec
   plugin.schemas.Opportunity.parse({} as any); // fully typed result
   ```

3. **Publish** with `npm publish` (or your preferred registry workflow).

#### Consumer usage

After installing the plugin (e.g. `npm install @commongrants/hhs-plugin`):

```typescript
import hhs from "@commongrants/hhs-plugin";

const opp = hhs.schemas.Opportunity.parse(data);
opp.customFields?.programArea?.value.code; // string
opp.customFields?.cfda?.value; // string
```

### Combining plugins

Use `mergeExtensions()` to combine extensions from multiple plugins into a single set, then pass the result to `definePlugin()`:

```typescript
import { definePlugin, mergeExtensions } from "@common-grants/sdk/extensions";

const merged = mergeExtensions([legacyPlugin.extensions, classificationPlugin.extensions]);

const combinedPlugin = definePlugin({ extensions: merged });

// All custom fields from both plugins are available with full type safety
const opp = combinedPlugin.schemas.Opportunity.parse(data);
opp.customFields?.legacyId?.value.id; // number (from legacyPlugin)
opp.customFields?.category?.value; // string (from classificationPlugin)
```

**Conflict resolution:** By default, `mergeExtensions()` throws an error if two sources define the same field name on the same model. You can change this behavior with the `onConflict` option:

```typescript
// Keep the first definition encountered
mergeExtensions([a.extensions, b.extensions], { onConflict: "firstWins" });

// Keep the last definition encountered
mergeExtensions([a.extensions, b.extensions], { onConflict: "lastWins" });
```

> [!WARNING]
> When using `"firstWins"` or `"lastWins"`, the return type falls back to the base `SchemaExtensions` type because conflict resolution makes static typing unreliable for overlapping field names. The default `"error"` strategy preserves full type inference via intersection types.

## Using plugins with the API client

Pass a plugin's extended schema to the API client via the `schema` option. The client uses it to parse API responses into fully typed objects:

```typescript
import { Client, Auth } from "@common-grants/sdk/client";
import { definePlugin } from "@common-grants/sdk/extensions";

const myPlugin = definePlugin({
  extensions: {
    Opportunity: {
      legacyId: { fieldType: "integer", description: "Legacy system ID" },
      category: { fieldType: "string", description: "Grant category" },
    },
  },
} as const);

const client = new Client({
  baseUrl: "https://api.example.gov",
  auth: Auth.apiKey("your-api-key"),
});

// Get a single opportunity with typed custom fields
const opp = await client.opportunities.get(oppId, {
  schema: myPlugin.schemas.Opportunity,
});
opp.customFields?.legacyId?.value; // typed as number
opp.customFields?.category?.value; // typed as string

// List with the same schema
const response = await client.opportunities.list({
  schema: myPlugin.schemas.Opportunity,
});
for (const opp of response.items) {
  console.log(opp.customFields?.category?.value);
}

// Search with the same schema
const results = await client.opportunities.search({
  query: "health",
  statuses: ["open"],
  schema: myPlugin.schemas.Opportunity,
});
```

The `schema` option is accepted by `get()`, `list()`, and `search()`. When omitted, the client falls back to `OpportunityBaseSchema` (with untyped `customFields`).

## Plugin transformations (PoC)

> **Status:** Proof-of-concept (issue [#798](https://github.com/HHS/simpler-grants-protocol/issues/798)). Mirrors the Python PoC in [PR #810](https://github.com/HHS/simpler-grants-protocol/pull/810). Contract follows [ADR-0022](https://commongrants.org/governance/adr/0022-plugin-framework/) and [ADR-0017](https://commongrants.org/governance/adr/0017-mapping-format/).

Plugins can declare bidirectional transforms that convert between a source system's native shape and the CommonGrants protocol. `toCommon` maps `native → CommonGrants`; `fromCommon` reverses it. Both directions are author-provided — the SDK does not invert one into the other, because many-to-one handlers (like `match`) are not reversible.

### Defining bidirectional transforms

Use `buildTransforms()` to compile a pair of ADR-0017 mapping objects into typed callables:

```typescript
import { buildTransforms } from "@common-grants/sdk/extensions";

const { toCommon, fromCommon } = buildTransforms({
  toCommonMapping: {
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
  fromCommonMapping: {
    data: {
      opportunity_uuid: { field: "id" },
      opportunity_title: { field: "title" },
    },
  },
});

const result = toCommon(sourceData);
if (result.errors.length === 0) {
  use(result.result);
}
```

Each callable returns a `TransformResult<T>` of `{ result, errors }` unconditionally. Partial failures surface as `PluginError[]` rather than thrown exceptions — consumers choose their own strict-vs-lenient rule.

### Built-in mapping handlers

Mapping objects are nested literals where keys are either output field names or registered handler names. The handler-keyed node dispatches the handler with `(data, handlerArg)`. Bare primitives are treated as literals.

| Handler          | Spec shape                                      | Behavior                                                                                                                                                               |
| ---------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field`          | `{ field: "dot.notation.path" }`                | Plucks a value from the source via dot-notation. Terminal `null` is preserved; absent / intermediate-null returns `undefined`. See [Null handling](#null-handling).    |
| `const`          | `{ const: <literal> }`                          | Returns the literal value, ignoring source data.                                                                                                                       |
| `match`          | `{ match: { field, case: { ... }, default? } }` | Case-based lookup on a source field value. Canonical per ADR-0017. `null` source passes through unchanged; opt-in target-side translation via `case: { "null": ... }`. |
| `switch`         | Same as `match`                                 | Convenience alias for `match` — both point at the same handler function.                                                                                               |
| `numberToString` | `{ numberToString: "dot.notation.path" }`       | Plucks a value and coerces to string via `String()`. Returns `null` on `null` source ("doesn't apply"); `undefined` on absent.                                         |
| `stringToNumber` | `{ stringToNumber: "dot.notation.path" }`       | Plucks a value, parses as int when possible, falls back to float. Returns `null` on `null` source; `undefined` on absent. Throws on non-numeric input.                 |

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

**For custom-handler authors:** preserve the three-state contract when you write your own handlers. Return `undefined` for "not provided," return `null` for "doesn't apply," return a value otherwise. The walker omits keys whose handler returned `undefined` and writes `null` returns as a real, present `null` — so the output object distinguishes the three states the same way the wire does: absent → key omitted, `null` → present `null`, value → present value. Consumers can use key presence (`hasOwnProperty` / `in`) to tell "not provided" from "doesn't apply."

> **Cross-SDK note.** The TS PoC leads on ADR-0024 alignment; the Python PoC ([#810](https://github.com/HHS/simpler-grants-protocol/pull/810)) still collapses `None` source into the "not provided" path for the coercing handlers. Parity follow-up tracked there. ADR-0024 itself audited the Zod / Pydantic validation surface — these handler-level guarantees pin the parallel contract for the transforms surface.

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

const { toCommon } = buildTransforms({
  toCommonMapping: {
    label: { join: { fields: ["a.b", "c.d"], sep: " — " } },
  },
  fromCommonMapping: {},
  handlers: { join },
});
```

### Validating against the extended schema

Pass an optional `commonModel` to validate `toCommon` output. **Use the fully extended schema** (the result of `withCustomFields()`), not the base schema — passing the base silently weakens validation of typed custom fields:

```typescript
import { buildTransforms, withCustomFields } from "@common-grants/sdk/extensions";
import { OpportunityBaseSchema } from "@common-grants/sdk/schemas";

const ExtendedOpportunity = withCustomFields(OpportunityBaseSchema, {
  legacyId: { fieldType: "integer", value: z.number().int() },
});

const { toCommon } = buildTransforms({
  toCommonMapping: {
    /* ... */
  },
  fromCommonMapping: {},
  commonModel: ExtendedOpportunity,
});

const out = toCommon(sourceData);
// On validation failure, `out.result` holds the raw transformed object so
// callers can inspect malformed data alongside `out.errors`.
```

### Wiring transforms into a plugin

`definePlugin()` accepts optional `meta` and `transformSchemas`, both new in the PoC. Existing callers passing only `extensions` are unaffected:

```typescript
const plugin = definePlugin({
  extensions: {
    Opportunity: {
      /* customFieldSpecs */
    },
  },
  meta: {
    name: "grants.gov",
    version: "0.1.0",
    sourceSystem: "grants.gov",
    capabilities: ["customFields", "transforms"],
  },
  transformSchemas: {
    Opportunity: { toCommon, fromCommon },
  },
});

// Invoke at runtime:
const cg = plugin.transformSchemas?.Opportunity?.toCommon?.(sourceData);
```

For a complete runnable round-trip with custom handlers and `commonModel` validation, see [`examples/transforms.ts`](../../examples/transforms.ts) (`pnpm example:transforms`).

### Error handling

`PluginError` carries structured context — `path`, `handler`, `sourceValue`, `cause` — so consumers can reason about failures programmatically without parsing error text:

```typescript
const out = toCommon(sourceData);
for (const err of out.errors) {
  // Build a redacted projection — err.sourceValue / err.cause carry input data
  // by design (ADR-0022 Decision #9); the projection enumerates only safe
  // fields. On the Zod-validation path err.message is also data-bearing —
  // see the PII warning below for the full picture and tracking issue.
  const safe = { name: err.name, message: err.message, path: err.path, handler: err.handler };
  console.warn(safe);
}
```

> **PII warning (ADR-0022 Decision #9):** The SDK does **not** redact by default. `PluginError.sourceValue` and `cause` are plain enumerable fields and flow through `JSON.stringify(err)`, `util.inspect(err)`, `console.log(err)`, and any logger that enumerates own properties. `sourceValue` is populated with the entire input record passed to `toCommon` / `fromCommon` — not just the value at the failing field. Log a redacted projection instead — e.g. `{ name: err.name, message: err.message, path: err.path, handler: err.handler }`. On the Zod-validation path (`buildTransforms({ commonModel })`), `PluginError.message` is also data-bearing — Zod's default error map embeds the rejected value into `issue.message`, which flows verbatim into `PluginError.message`. Redact `message` alongside `sourceValue` and `cause`. Full-message sanitization is tracked under [#744](https://github.com/HHS/simpler-grants-protocol/issues/744).

## Best practices

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
  extensions: {
    Opportunity: {
      programArea: {
        fieldType: "object",
        value: ProgramAreaValueSchema,
        description: "The HHS program area for this opportunity",
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

const opp = hhs.schemas.Opportunity.parse(data);

// Extract the value with full type safety using the exported schema
const area = getCustomFieldValue(opp, "programArea", ProgramAreaValueSchema);
area?.code; // string
```

### Use `peerDependencies` for `@common-grants/sdk`

Declare `@common-grants/sdk` as a `peerDependency` in your plugin's `package.json` rather than a direct `dependency`. This ensures that consumers who install multiple plugins all share a single copy of the SDK, avoiding version conflicts and duplicate type definitions. See [Publishing a plugin](#publishing-a-plugin) for a full `package.json` example.

### Keep plugins focused

A plugin should represent a single logical concern (one agency's fields, one integration's needs, or one domain concept). If you need fields from multiple concerns, use `mergeExtensions()` to combine separate plugins rather than bundling everything into one.

### Avoid `"firstWins"` / `"lastWins"` in published plugins

When calling `mergeExtensions()` with `"firstWins"` or `"lastWins"`, the return type widens to `SchemaExtensions`, losing specific field-level type inference. This is fine for local or ad hoc usage, but if you publish a package that uses one of these strategies internally, the widened type propagates to your consumers. They'll see `SchemaExtensions` instead of the precise field types, with no indication of why.

Prefer the default `"error"` strategy in published plugins. If your extensions genuinely overlap with another plugin, resolve the conflicts explicitly before publishing rather than deferring the resolution to a lossy merge strategy.

## API reference

The tables below list everything exported from `@common-grants/sdk/extensions`, grouped by how they're used. Each entry links to the source definition and (where applicable) the section of this guide where it's demonstrated.

### Plugin creation

| Export                                      | Kind      | Description                                                                                                                                                       | Demonstrated in                         |
| ------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [`definePlugin()`](./define-plugin.ts)      | function  | Creates a `Plugin` from a `SchemaExtensions` config. Returns an object with `.extensions` (the raw input) and `.schemas` (Zod schemas with typed `customFields`). | [Defining a plugin](#defining-a-plugin) |
| [`Plugin`](./define-plugin.ts)              | interface | The object returned by `definePlugin()`.                                                                                                                          | [What is a plugin?](#what-is-a-plugin)  |
| [`DefinePluginOptions`](./define-plugin.ts) | interface | Options accepted by `definePlugin()`. Contains the `extensions` property.                                                                                         | [Defining a plugin](#defining-a-plugin) |

### Schema utilities

| Export                                                 | Kind     | Description                                                                                                                                                    | Demonstrated in                                                            |
| ------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`withCustomFields()`](./with-custom-fields.ts)        | function | Extends a single Zod object schema with typed custom fields. Unregistered fields pass through but are typed as the base `CustomField`.                         | [Ad hoc with `withCustomFields()`](#option-1-ad-hoc-with-withcustomfields) |
| [`WithCustomFieldsResult`](./with-custom-fields.ts)    | type     | The return type of `withCustomFields()`. A Zod object schema where `customFields` is replaced with a typed version.                                            |                                                                            |
| [`getCustomFieldValue()`](./get-custom-field-value.ts) | function | Safely extracts and parses a custom field value from an `ExtensibleObject`. Returns the parsed value, `undefined` if missing, or throws `ZodError` if invalid. | [Extracting custom field values](#extracting-custom-field-values)          |

### Merging and composition

| Export                                            | Kind      | Description                                                                                                                                           | Demonstrated in                         |
| ------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [`mergeExtensions()`](./merge-extensions.ts)      | function  | Combines multiple `SchemaExtensions` objects into one. Throws on field name conflicts by default; supports `"firstWins"` and `"lastWins"` strategies. | [Combining plugins](#combining-plugins) |
| [`MergeExtensionsOptions`](./merge-extensions.ts) | interface | Controls conflict resolution for `mergeExtensions()`.                                                                                                 | [Combining plugins](#combining-plugins) |
| [`MergedSchemaExtensions`](./merge-extensions.ts) | type      | The return type of `mergeExtensions()` with the default `"error"` strategy. Intersects field specs from each source.                                  |                                         |

### Transforms (PoC)

| Export                                               | Kind      | Description                                                                                                                                                           | Demonstrated in                                                         |
| ---------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`buildTransforms()`](./transforms.ts)               | function  | Compiles a pair of ADR-0017 mapping objects into typed `(toCommon, fromCommon)` callables. Validates mapping structure at call time; collisions with built-ins throw. | [Defining bidirectional transforms](#defining-bidirectional-transforms) |
| [`BuildTransformsOptions`](./transforms.ts)          | interface | Options for `buildTransforms()`: `handlers` for custom registrations, `commonModel` for opt-in Zod validation.                                                        |                                                                         |
| [`BuiltTransforms`](./transforms.ts)                 | interface | Return shape of `buildTransforms()` — `{ toCommon, fromCommon }`.                                                                                                     |                                                                         |
| [`transformFromMapping()`](./transformation.ts)      | function  | Low-level mapping walker used by `buildTransforms()`. Useful if you want to drive a single mapping pass without the call-time validation or error-wrapping layer.     |                                                                         |
| [`TransformFromMappingOptions`](./transformation.ts) | interface | Options for `transformFromMapping()`: `handlers` registry and `maxDepth` cap.                                                                                         |                                                                         |
| [`DEFAULT_HANDLERS`](./transformation.ts)            | const     | Frozen registry of built-in handlers: `const`, `field`, `match`, `numberToString`, `stringToNumber`, `switch`.                                                        | [Built-in mapping handlers](#built-in-mapping-handlers)                 |
| [`getFromPath()`](./transformation.ts)               | function  | Walks an object via dot-notation; returns `undefined` (or a provided default) when the path is missing or traverses a non-object.                                     |                                                                         |
| [`TransformResult`](./types.ts)                      | interface | Unconditional return shape `{ result, errors }` for `toCommon` / `fromCommon`.                                                                                        | [Defining bidirectional transforms](#defining-bidirectional-transforms) |
| [`PluginError`](./types.ts)                          | class     | Structured transformation error carrying `path`, `handler`, `sourceValue`, `cause`. Extends `Error`.                                                                  | [Error handling](#error-handling)                                       |
| [`Handler`](./types.ts)                              | type      | Signature for mapping handler functions: `(data, arg) => unknown`.                                                                                                    | [Custom handlers](#custom-handlers)                                     |
| [`PluginMeta`](./types.ts)                           | interface | Plugin identity (`name`, `version`, `sourceSystem`, `capabilities`).                                                                                                  | [Wiring transforms into a plugin](#wiring-transforms-into-a-plugin)     |
| [`PluginCapability`](./types.ts)                     | type      | Literal union of capability names: `"customFields" \| "customFilters" \| "transforms" \| "client"`.                                                                   |                                                                         |
| [`ObjectSchemasInput`](./types.ts)                   | interface | Author-provided input: `{ native?, customFields?, toCommon?, fromCommon? }` per object. Passed to `definePlugin({ transformSchemas })`.                               | [Wiring transforms into a plugin](#wiring-transforms-into-a-plugin)     |
| [`ObjectSchemas`](./types.ts)                        | interface | Compiled runtime shape (full SDK target): `{ native, common, toCommon, fromCommon }`. Not produced by the PoC's `definePlugin()`.                                     |                                                                         |
| [`TransformSchemasInput`](./define-plugin.ts)        | type      | Map from extensible model name to `ObjectSchemasInput`. The shape of `DefinePluginOptions.transformSchemas`.                                                          | [Wiring transforms into a plugin](#wiring-transforms-into-a-plugin)     |
| [`ObjectMappings`](./types.ts)                       | interface | Serializable `{ toCommon?, fromCommon? }` ADR-0017 mapping dicts. Stored inside `PluginExtensionsObjectConfig.mappings`.                                              |                                                                         |
| [`PluginExtensionsObjectConfig`](./types.ts)         | interface | Per-object slot inside `PluginExtensions.schemas`: `{ mappings? }`. (`customFields` moved to `ObjectSchemasInput` per the post-PoC consolidation — see its JSDoc.)    |                                                                         |
| [`PluginExtensions`](./types.ts)                     | interface | Serializable plugin config carrying `meta` and per-object `schemas`. Used by `mergeExtensions()` to combine declarations from multiple packages.                      |                                                                         |
| [`ClientConfig`](./types.ts)                         | type      | Mirrors Python's `ClientConfig = dict[str, Any]` — the per-plugin client configuration shape. Concrete shape is deferred to the full SDK.                             |                                                                         |

### Shared types

| Export                               | Kind      | Description                                                                                                                    | Demonstrated in               |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| [`CustomFieldSpec`](./types.ts)      | interface | Describes a single custom field: its `fieldType`, optional `value`, and optional `name`/`description`.                         | [Key concepts](#key-concepts) |
| [`SchemaExtensions`](./types.ts)     | type      | Maps extensible model names to records of `CustomFieldSpec` objects. Plugins only need to declare models they actually extend. | [Key concepts](#key-concepts) |
| [`ExtensibleSchemaName`](./types.ts) | type      | Union of model names that support `customFields` extensions. Currently: `"Opportunity"`.                                       |                               |
| [`HasCustomFields`](./types.ts)      | type      | A Zod object schema whose shape includes a `customFields` property. Constrains `withCustomFields()` inputs at compile time.    |                               |
| [`ExtensibleObject`](./types.ts)     | interface | An object with an optional `customFields` property. Constrains `getCustomFieldValue()` inputs at compile time.                 |                               |
