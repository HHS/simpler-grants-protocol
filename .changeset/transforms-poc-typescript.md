---
"@common-grants/sdk": minor
---

Add a TypeScript proof-of-concept for the plugin transformation framework (issue #798), mirroring the Python PoC in PR #810. Plugin authors can now compile declarative mapping objects into typed `(toCommon, fromCommon)` callables, validate `toCommon` output against an extended Zod schema, and attach those callables to a plugin via `definePlugin({ schemas })`.

**New public surface (under `@common-grants/sdk/extensions`):**

- `buildTransforms(toCommonMapping, fromCommonMapping, handlers?, commonModel?)` — compiles a pair of mapping objects into typed `(toCommon, fromCommon)` callables with call-time structural validation. `handlers` is a `Map<string, Handler>` for custom handler registration. Optional `commonModel` Zod schema turns parse failures into `PluginError[]` instead of thrown exceptions.
- `TransformResult<T>` — unconditional `{ result, errors }` return shape.
- `PluginError` — structured error class carrying `path`, `handler`, `sourceValue`, `cause`.
- `transformFromMapping()`, `getFromPath()`, `DEFAULT_HANDLERS` — lower-level mapping runtime pieces; `DEFAULT_HANDLERS` is a `Map<string, Handler>` of six built-in handlers (`const`, `field`, `match` / `switch` alias, `numberToString`, `stringToNumber`).
- `definePlugin()` accepts optional `meta: PluginMeta` and `schemas: SchemasInput`. All per-object declarations (custom fields, native schema, transforms) are co-located under `schemas[Object]` — `customFields` lives on `schemas[Object].customFields` rather than on the `extensions` key. The compiled `plugin.schemas[Object].common` holds the extended Zod schema.
- New supporting types: `Handler`, `SchemasInput`, `ObjectSchemasInput`, `ObjectSchemas`, `PluginMeta`, `PluginCapability`, `ObjectMappings`, `PluginExtensionsObjectConfig`, `PluginExtensions`.

**Three-state null handling (ADR-0024)** for optional fields:

- `numberToString` and `stringToNumber` now preserve `null` source values as `null` (the publisher's "doesn't apply" assertion) instead of collapsing to `undefined`. Return types widen from `string | undefined` / `number | undefined` to `string | null | undefined` / `number | null | undefined`.
- `match` / `switch` passes `null` source through by default; opt in to target-side translation via a `"null"` key in the `case` map. `default` is not consulted for `null` source values.
- `field` / `getFromPath` already preserve terminal `null`; intermediate-null short-circuits the path (documented as propagating "doesn't apply").
- The walker places handler-returned `null` onto the output object as a real `null`, distinct from an absent key — so consumers can read the three states (absent / `null` / value) end-to-end through `toCommon` and `fromCommon`.

**Out of scope** (deferred to full SDK):

- Auto-generation of transforms from declarative `extensions.schemas[obj].mappings` inside `definePlugin()`.
- Always-on `commonModel` validation inside `definePlugin()` — opt-in at `buildTransforms()` for now.

Runnable example: `pnpm --filter @common-grants/sdk example:transforms` (round-trips a synthetic grants.gov record through `toCommon` and `fromCommon` with custom `join` / `split` handlers, extended-schema validation, and three-state null preservation on `source_url: null`).
