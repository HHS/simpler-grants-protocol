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

**Out of scope** (matches Python PoC; deferred to full SDK):
- Auto-generation of transforms from declarative `extensions.schemas[obj].mappings` inside `definePlugin()` (ADR-0022 Decision #6 TODO).
- Always-on `commonModel` validation inside `definePlugin()` — opt-in at `buildTransforms()` for now (ADR-0022 Decision #7).

Runnable example: `pnpm --filter @common-grants/sdk example:transforms` (round-trips a synthetic grants.gov record through `toCommon` and `fromCommon` with custom `join` / `split` handlers and extended-schema validation).
