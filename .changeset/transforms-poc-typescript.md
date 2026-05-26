---
"@common-grants/sdk": minor
---

Add a TypeScript proof-of-concept for the plugin transformation framework (issue #798), mirroring the Python PoC in PR #810. Plugin authors can now compile declarative ADR-0017 mapping objects into typed `(toCommon, fromCommon)` callables, validate `toCommon` output against an extended Zod schema, and attach those callables to a plugin via `definePlugin({ transformSchemas })`.

**New public surface (under `@common-grants/sdk/extensions`):**
- `buildTransforms()` — compiles a pair of mapping objects into typed `(toCommon, fromCommon)` callables with call-time structural validation. Optional `commonModel` Zod schema turns parse failures into `PluginError[]` instead of thrown exceptions.
- `TransformResult<T>` — unconditional `{ result, errors }` return shape per ADR-0022 Decision #7.
- `PluginError` — structured error class carrying `path`, `handler`, `sourceValue`, `cause` (ADR-0022 Decision #9).
- `transformFromMapping()`, `getFromPath()`, `DEFAULT_HANDLERS` — lower-level mapping runtime pieces; six built-in handlers (`const`, `field`, `match` / `switch` alias, `numberToString`, `stringToNumber`).
- `definePlugin()` accepts optional `meta: PluginMeta` and `transformSchemas: Partial<Record<ExtensibleSchemaName, ObjectSchemasInput>>`. Existing callers passing only `extensions` are unaffected.
- New supporting types: `Handler`, `ObjectSchemasInput`, `ObjectSchemas`, `PluginMeta`, `PluginCapability`, `ObjectMappings`, `PluginExtensionsObjectConfig`, `PluginExtensions`, `TransformSchemasInput`.

**Transforms-layer alignment with ADR-0024** (three-state contract for optional fields):
- `numberToString` and `stringToNumber` now preserve `null` source values as `null` (the publisher's "doesn't apply" assertion) instead of collapsing to `undefined`. Return types widen from `string | undefined` / `number | undefined` to `string | null | undefined` / `number | null | undefined`.
- `match` / `switch` passes `null` source through by default; opt in to target-side translation via a `"null"` key in the `case` map. `default` is not consulted for `null` source values.
- `field` / `getFromPath` already preserve terminal `null`; intermediate-null short-circuits the path (documented as propagating "doesn't apply").
- The walker places handler-returned `null` onto the output object as a real `null`, distinct from an absent key — so consumers can read the three states (absent / `null` / value) end-to-end through `toCommon` and `fromCommon`.
- Cross-SDK: TS leads on ADR-0024 alignment; Python PoC (#810) parity follow-up tracked there.

**Out of scope** (matches Python PoC; deferred to full SDK):
- Auto-generation of transforms from declarative `extensions.schemas[obj].mappings` inside `definePlugin()` (ADR-0022 Decision #6 TODO).
- Always-on `commonModel` validation inside `definePlugin()` — opt-in at `buildTransforms()` for now (ADR-0022 Decision #7).

Runnable example: `pnpm --filter @common-grants/sdk example:transforms` (round-trips a synthetic grants.gov record through `toCommon` and `fromCommon` with custom `join` / `split` handlers, extended-schema validation, and the ADR-0024 three-state preservation on `source_url: null`).
