---
"common-grants-sdk": minor
---

Add a Python proof-of-concept for the plugin transformation framework (issue #799), mirroring the TypeScript PoC. Plugin authors can now compile declarative mapping dicts into typed `(to_common, from_common)` callables, validate `to_common` output against an extended Pydantic schema, and attach those callables to a plugin via `define_plugin(schemas=...)`.

**New public surface (under `common_grants_sdk.extensions`):**

- `build_transforms(to_common_mapping, from_common_mapping, handlers?, common_schema?, source_schema?)` — compiles a pair of mapping dicts into `(to_common, from_common)` callables with call-time structural validation. `handlers` is a `dict[str, Handler]` for custom handler registration. Optional `common_schema` / `source_schema` Pydantic model classes turn `ValidationError`s into `TransformError` entries on `TransformResult.errors` instead of raising.
- `TransformResult[T]` — unconditional `dataclass(result, errors)` return shape.
- `TransformError` — structured error class carrying `path`, `handler`, `source_value`, `cause`.
- `PassthroughModel` — permissive Pydantic model (`extra="allow"`) for use as `source_schema` when the source-system shape is not yet modeled.
- `Handler`, `PluginCapability` — type aliases for handler callables and capability literals.
- `PluginMeta` — Pydantic model for plugin identity and capability declaration (`name`, `source_system`, `version`, `capabilities`).
- `schema(...)` factory — overloaded factory returning a discriminated `SchemaWithTransforms` or `SchemaOnly`. Enforces mappings XOR hand-written transforms, requires a source schema when transforms are present, and validates mapping output keys against the resolved model at call time.
- `define_plugin()` accepts optional `meta: PluginMeta` and `schemas` mapping. All per-object declarations (custom fields, native schema, transforms) are co-located under `schemas[Object]`. Auto-wires `to_common`/`from_common` from declarative `mappings` when no explicit callables are provided; runs `_validate_output_paths()` at `define_plugin()` call time so key-name mismatches are caught early.

**Three-state null handling for optional fields:**

- `number_to_string` and `string_to_number` preserve `None` source values as `None` (the publisher's "doesn't apply" assertion) rather than raising or coercing.
- `switch_on_value` passes `None` through by default; opt in to target-side translation via a `"null"` key in the case map.
- `get_from_path` already short-circuits on intermediate `None`; terminal `None` is preserved.
- The walker places handler-returned `None` onto the output dict as a real `None`, distinct from an absent key — so consumers can read the three states (absent / `None` / value) end-to-end through `to_common` and `from_common`.

**Removed:**

- `generate.py` and the old codegen-based plugin utilities have been removed. Consumers who relied on `generate_plugin` or similar codegen helpers should migrate to `define_plugin` with the `schema(...)` factory.

**Deferred to full SDK:**

- Always-on `common_schema` validation inside `define_plugin()` — opt-in at `build_transforms()` call site for now (pass the fully extended model as `common_schema` to enable Pydantic validation on `to_common` output).

Runnable example: `cd lib/python-sdk && poetry run python examples/plugins.py` (round-trips a synthetic grants.gov record through `to_common` and `from_common` with custom handlers, extended-schema validation, and three-state null preservation).
