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
- [Plugins](#plugins)
  - [What is a plugin?](#what-is-a-plugin)
  - [Defining a plugin](#defining-a-plugin)
  - [Publishing a plugin](#publishing-a-plugin)
  - [Combining plugins](#combining-plugins)
  - [Best practices](#best-practices)
- [API reference](#api-reference)
  - [Plugin creation](#plugin-creation)
  - [Schema utilities](#schema-utilities)
  - [Merging and composition](#merging-and-composition)
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

### Best practices

#### Export value schemas alongside your plugin

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

#### Use `peerDependencies` for `@common-grants/sdk`

Declare `@common-grants/sdk` as a `peerDependency` in your plugin's `package.json` rather than a direct `dependency`. This ensures that consumers who install multiple plugins all share a single copy of the SDK, avoiding version conflicts and duplicate type definitions. See [Publishing a plugin](#publishing-a-plugin) for a full `package.json` example.

#### Keep plugins focused

A plugin should represent a single logical concern (one agency's fields, one integration's needs, or one domain concept). If you need fields from multiple concerns, use `mergeExtensions()` to combine separate plugins rather than bundling everything into one.

#### Avoid `"firstWins"` / `"lastWins"` in published plugins

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
| [`getCustomFieldValue()`](./get-custom-field-value.ts) | function | Safely extracts and parses a custom field value from an `ExtensibleObject`. Returns the parsed value, `undefined` if missing, or throws `ZodError` if invalid. | [Export value schemas](#export-value-schemas-alongside-your-plugin)        |

### Merging and composition

| Export                                            | Kind      | Description                                                                                                                                           | Demonstrated in                         |
| ------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [`mergeExtensions()`](./merge-extensions.ts)      | function  | Combines multiple `SchemaExtensions` objects into one. Throws on field name conflicts by default; supports `"firstWins"` and `"lastWins"` strategies. | [Combining plugins](#combining-plugins) |
| [`MergeExtensionsOptions`](./merge-extensions.ts) | interface | Controls conflict resolution for `mergeExtensions()`.                                                                                                 | [Combining plugins](#combining-plugins) |
| [`MergedSchemaExtensions`](./merge-extensions.ts) | type      | The return type of `mergeExtensions()` with the default `"error"` strategy. Intersects field specs from each source.                                  |                                         |

### Shared types

| Export                               | Kind      | Description                                                                                                                    | Demonstrated in               |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| [`CustomFieldSpec`](./types.ts)      | interface | Describes a single custom field: its `fieldType`, optional `value`, and optional `name`/`description`.                         | [Key concepts](#key-concepts) |
| [`SchemaExtensions`](./types.ts)     | type      | Maps extensible model names to records of `CustomFieldSpec` objects. Plugins only need to declare models they actually extend. | [Key concepts](#key-concepts) |
| [`ExtensibleSchemaName`](./types.ts) | type      | Union of model names that support `customFields` extensions. Currently: `"Opportunity"`.                                       |                               |
| [`HasCustomFields`](./types.ts)      | type      | A Zod object schema whose shape includes a `customFields` property. Constrains `withCustomFields()` inputs at compile time.    |                               |
| [`ExtensibleObject`](./types.ts)     | interface | An object with an optional `customFields` property. Constrains `getCustomFieldValue()` inputs at compile time.                 |                               |
