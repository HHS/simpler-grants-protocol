---
title: Adapter framework
description: ADR documenting the decision to use an Adapter pattern with functional top-level grouping and per-object schema grouping for the expanded plugin framework that supports both custom fields and data mappings across the Python/Pydantic and TypeScript/Zod SDKs.
---

The existing plugin framework allows adopters to publish npm or PyPI packages that declare custom fields for CommonGrants schema objects. We want to expand this framework to also support bidirectional data mappings — declarative transforms that the SDK compiles into type-safe `toCommon`/`fromCommon` functions at runtime (see [ADR-0017](./0017-mapping-format.md)). We also want to organize this framework to support other potential future features with minimal rework. 

_How should the Adapter object be structured to support both custom field declarations and data mappings, while enabling clean dependency injection and remaining stable as the protocol's object list grows?_

### Questions

- Should the framework still be called a "plugin", or does adding mappings warrant a new name?
- Should the top-level Adapter structure group by feature (`meta`, `client`, `schemas`, `extensions`) or by object (`Opportunity`, `Application`, …)?
- Should client configuration (auth, transport, rate-limiting) sit alongside per-object schemas, or be lifted to the top level as a system-level concern?
- Should custom fields and mappings be coupled in the same package, or allowed independently?

### Decision drivers

- The framework must be implementable in both the Python and TypeScript SDKs with as consistent an interface as possible.
- The `extensions` config must be serializable and validatable (JSON-safe), and must be combinable across multiple extension packages via `mergeExtensions()` (TypeScript) / `merge_extensions()` (Python).
- Existing plugin packages that declare only custom fields should remain valid with minimal changes.
- The SDK interface should support clean dependency injection — it must be possible to pass `client` or `schemas` as a coherent unit without reassembling them from per-object branches.
- Auth, transport, and rate-limiting are system-level concerns that belong to a single client, not distributed across per-object branches.
- The top-level Adapter surface should be short and stable — adding new protocol objects should not expand the top-level key set.

## Decision

We decided to:

1. **Keep "plugin" as the registry term** for published npm/PyPI packages displayed in the website catalog. No change to `PluginSourceEntry` or `src/content/plugins/index.json`.

2. **Introduce "Adapter" as the SDK term** for the runtime object that wires together meta, client, schemas, and extensions for a single source system.

3. **Use functional grouping at the top level** with four keys — `meta`, `client`, `schemas`, and `extensions` — rather than grouping by object name at the root.

4. **Use per-object grouping inside `schemas`** where it reflects real coupling: each object's native schema, CommonGrants schema, and bidirectional transforms are tightly coupled and change together.

5. **Make `extensions` the serializable root** — the input to `defineAdapter()` and the unit operated on by `mergeExtensions()`.

The resulting Adapter shape:

```
adapter.meta        // name, version, sourceSystem, capabilities
adapter.client      // auth, transport, resource methods, filters
adapter.extensions  // serializable input to defineAdapter(); used by mergeExtensions()
adapter.schemas.<ObjectName> = { native, common, toCommon, fromCommon }
```

**TypeScript interface (Zod-based):**

```ts
interface AdapterMeta {
  name: string
  version: string
  sourceSystem: string
  capabilities?: string[]
}

interface CustomFieldDef {
  name?: string    // optional; dict key is used as the display name fallback
  fieldType: string
  description?: string
}

interface ObjectSchemas<TNative, TCommon> {
  native: ZodType<TNative>
  common: ZodType<TCommon>
  toCommon: (native: TNative) => TCommon
  fromCommon: (common: TCommon) => TNative
}

// Per-object config shape inside extensions.schemas — mirrors Python's AdapterExtensionsSchema
interface AdapterExtensionsObjectConfig {
  customFields?: Record<string, CustomFieldDef>
  mappings?: Record<string, unknown>  // see ADR-0017 for mapping format
}

// Serializable input to defineAdapter() — safe to store as JSON
interface AdapterExtensions {
  meta?: Partial<AdapterMeta>
  schemas?: Record<string, AdapterExtensionsObjectConfig>
}

// Client is a placeholder for the SDK's runtime client type (not shown here)
interface Adapter {
  meta: AdapterMeta
  client: Client                                          // one per source system
  extensions: AdapterExtensions                          // serializable
  schemas: Record<string, ObjectSchemas<unknown, unknown>>
}

// Factory: takes serializable extensions and a runtime client.
//
// defineAdapter builds adapter.schemas from extensions.schemas by:
//   - extending the base CommonGrants schema with any declared customFields → common
//   - interpreting the declarative mappings (ADR-0017) into toCommon / fromCommon functions
//   - native defaults to Record<string, unknown> (extensions is JSON-safe; runtime
//     Zod schemas cannot be included)
//
// Client config (auth, base URL, rate-limiting) is not JSON-safe and must be
// provided separately at runtime — it is never part of extensions.
function defineAdapter(extensions: AdapterExtensions, client: Client): Adapter

// Combine multiple extension objects (e.g. from separate packages)
function mergeExtensions(...extensions: AdapterExtensions[]): AdapterExtensions
```

Usage:

```ts
// Client is configured separately — auth and transport are not JSON-safe
const client = createClient({ baseUrl: 'https://api.grants.gov', auth: { type: 'oauth2', /* ... */ } })

const adapter = defineAdapter(
  {
    meta: { name: 'grants-gov-adapter', version: '1.0.0', sourceSystem: 'grants.gov' },
    schemas: {
      Opportunity: {
        customFields: {
          programArea: { fieldType: 'string', description: 'HHS program area code (e.g. CFDA-93.243)' },
          legacyGrantId: { fieldType: 'integer', description: 'Numeric ID from the legacy grants system' },
        },
        mappings: {
          title: 'data.opportunity_title',
          status: {
            value: {
              match: {
                field: 'data.opportunity_status',
                case: { posted: 'open', archived: 'closed' },
                default: 'custom',
              },
            },
          },
        },
      },
    },
  },
  client,
)

// Combine extensions from multiple packages before constructing the adapter
const merged = mergeExtensions(baseExtensions, grantsGovExtensions)
const mergedAdapter = defineAdapter(merged, client)
```

**Python interface (Pydantic-based):**

```python
from dataclasses import dataclass
from typing import Any, Callable, Generic, TypeVar
from pydantic import BaseModel, ConfigDict, Field
# Client is a placeholder for the SDK's runtime client type (not shown here)

TNative = TypeVar('TNative')
TCommon = TypeVar('TCommon')

class CustomFieldDef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None  # optional; dict key is used as the display name fallback
    field_type: str = Field(alias='fieldType')
    description: str | None = None

@dataclass
class ObjectSchemas(Generic[TNative, TCommon]):
    native: type[TNative]   # expects a Pydantic BaseModel subclass
    common: type[TCommon]   # expects a Pydantic BaseModel subclass
    to_common: Callable[[TNative], TCommon]
    from_common: Callable[[TCommon], TNative]

class AdapterMeta(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    version: str
    source_system: str = Field(alias='sourceSystem')
    capabilities: list[str] | None = None

# Equivalent to TypeScript's Partial<AdapterMeta>. Defined as a separate model
# rather than reusing AdapterMeta because Pydantic does not have a built-in Partial.
# Note: if AdapterMeta gains new required fields, this class must be updated manually.
# Drift can be caught with: assert AdapterMeta.model_fields.keys() == AdapterExtensionsMeta.model_fields.keys()
class AdapterExtensionsMeta(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    version: str | None = None
    source_system: str | None = Field(default=None, alias='sourceSystem')
    capabilities: list[str] | None = None

class AdapterExtensionsSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    custom_fields: dict[str, CustomFieldDef] | None = Field(default=None, alias='customFields')
    mappings: dict[str, Any] | None = None  # see ADR-0017 for mapping format

class AdapterExtensions(BaseModel):
    meta: AdapterExtensionsMeta | None = None
    schemas: dict[str, AdapterExtensionsSchema] | None = None

@dataclass
class Adapter:
    meta: AdapterMeta
    client: Client
    extensions: AdapterExtensions
    schemas: dict[str, ObjectSchemas[Any, Any]]

# Client config (auth, base URL) is not JSON-safe — passed separately at runtime.
#
# define_adapter builds adapter.schemas from extensions.schemas by:
#   - extending the base CommonGrants model with any declared custom_fields → common
#   - interpreting declarative mappings (ADR-0017) into to_common / from_common callables
#   - native defaults to dict[str, Any] (extensions is JSON-safe; runtime
#     Pydantic models cannot be included)
def define_adapter(extensions: AdapterExtensions, client: Client) -> Adapter: ...
def merge_extensions(*extensions: AdapterExtensions) -> AdapterExtensions: ...
```

Usage:

```python
# Client is configured separately — auth and transport are not JSON-safe
client = create_client(base_url='https://api.grants.gov', auth=OAuth2Config(...))

adapter = define_adapter(
    AdapterExtensions(
        meta=AdapterExtensionsMeta(name='grants-gov-adapter', version='1.0.0', source_system='grants.gov'),  # source_system serializes as 'sourceSystem' in JSON
        schemas={
            'Opportunity': AdapterExtensionsSchema(
                custom_fields={
                    'programArea': CustomFieldDef(field_type='string', description='HHS program area code'),
                    'legacyGrantId': CustomFieldDef(field_type='integer', description='Numeric ID from legacy system'),
                },
                # Declarative mappings are interpreted into to_common / from_common at runtime.
                # Supports the same full ADR-0017 syntax as TypeScript (field paths, match/case, etc.)
                mappings={
                    'title': 'data.opportunity_title',
                    'status': {
                        'value': {
                            'match': {
                                'field': 'data.opportunity_status',
                                'case': {'posted': 'open', 'archived': 'closed'},
                                'default': 'custom',
                            },
                        },
                    },
                },
            ),
        },
    ),
    client,
)


# Combine extensions from multiple packages before constructing the adapter
merged = merge_extensions(base_extensions, grants_gov_extensions)
merged_adapter = define_adapter(merged, client)
```

- **Positive consequences**
  - Client stays singular — one source system has one auth config, one base URL, one rate limiter
  - Top-level surface (`meta`, `client`, `schemas`, `extensions`) is short, closed, and stable — adding protocol objects adds a key under `schemas` only
  - Dependency injection works along functional lines: pass a `Client`, pass `Schemas`, pass `Extensions` as coherent units without needing to reassemble from per-object branches
  - `mergeExtensions()` / `merge_extensions()` operates on flat, serializable data at the root, not on deeply nested per-object branches
  - Per-object grouping inside `schemas` preserves the real coupling between native schema, CommonGrants schema, and bidirectional transforms — they share type signatures and change together
  - Mirrors the SDK module structure (`client`, `schemas`, `extensions`), so Adapter reads as a system-specific version of the existing SDK rather than a different mental model
  - `customFields` and `mappings` for the same object are colocated inside `schemas.<ObjectName>`
  - Both `customFields` and `mappings` are optional — the `customFields`-only config structure remains valid; existing extension packages require only minimal code changes to adopt `defineAdapter()`
- **Negative consequences**
  - Introduces two terms ("plugin" and "adapter") where previously only "plugin" existed — "plugin" for the registry catalog, "adapter" for the runtime SDK object
  - `extensions` (serializable config) and `adapter` (runtime object including client) are distinct concepts that adopters must understand separately

### Criteria

- **Backward compatible:** Existing custom-fields-only plugins remain valid without changes
- **SDK-friendly:** Config shape maps naturally to Pydantic/Zod one-model-at-a-time usage inside `schemas`
- **Language-agnostic config:** The `extensions` JSON document uses camelCase keys (`customFields`, `fieldType`, `sourceSystem`) in both SDKs — Python source uses snake_case attributes with camelCase `alias` fields, matching the existing SDK convention
- **Clear naming:** Registry and runtime concepts are distinct and unambiguous
- **Supports both capabilities:** Custom field declarations and data mappings can coexist or be used independently
- **DI-friendly:** Functional top-level keys can be passed as coherent units without reassembly
- **Stable surface:** New protocol objects do not expand the top-level key set

### Options considered

- Object-first structure with adapted model/schema (no separate Adapter class)
- Pure object-first structure with "Plugin" for registry, "Adapter" for SDK
- Functional top-level with per-object schema grouping *(chosen)*

## Evaluation

### Side-by-side

| Criteria | Object-first / Adapted Schema | Pure object-first / Plugin+Adapter | Functional top-level / per-object schemas |
| :--- | :---: | :---: | :---: |
| Backward compatible | ✅ | ✅ | ✅ |
| SDK-friendly | ✅ | ✅ | ✅ |
| Language-agnostic config | ✅ | ✅ | ✅ |
| Clear naming | 🟡 | ✅ | ✅ |
| Supports both capabilities | ✅ | ✅ | ✅ |
| DI-friendly | 🟡 | 🔴 | ✅ |
| Stable surface | 🟡 | 🔴 | ✅ |

### Option 1: Object-first structure, adapted model/schema (no separate Adapter class)

Instead of constructing a separate `Adapter` object, the SDK returns an *extended version of the model/schema itself* with the transform baked in. Adopters call native parse/validate methods directly on the returned object.

```ts
// TypeScript: createAdapter returns an extended Zod schema (ZodEffects), not an Adapter object
const opportunityAdapter = createAdapter(opportunitySchema, adapterConfig)
const opportunity = opportunityAdapter.parse(grantsGovData)       // native Zod
const result = opportunityAdapter.safeParse(grantsGovData)        // native Zod non-throwing
```

```python
# Python: create_adapter returns a new Pydantic model class with a custom validator applied
OpportunityAdapter = create_adapter(Opportunity, adapter_config)
opportunity = OpportunityAdapter.model_validate(grants_gov_data)  # native Pydantic
```

:::note[Bottom line]
Object-first / Adapted Schema is best if:

- we want the SDK return type to feel like a first-class schema object, not a wrapper
- and we're willing to accept that the "Adapter" concept is implicit rather than a named class
:::

- **Pros**
  - Very idiomatic — `.parse()` / `safeParse()` in Zod and `.model_validate()` in Pydantic are the expected call sites
  - No new runtime class name to explain; the adapted schema is still recognizably a schema
  - Backward compatible — both keys optional, `custom_fields`-only is valid
- **Cons**
  - No named `Adapter` type to import, document, or type-hint against
  - Client, auth, and transport have no natural home in this model
  - DI requires passing each model's adapter separately rather than a unified `Schemas` object — callers must accept one adapted schema per object rather than a single `Schemas` unit (**DI-friendly: 🟡**)
  - Top-level surface tracks the object list indirectly via function calls (`createAdapter(opportunitySchema, ...)`, `createAdapter(applicationSchema, ...)`), but there is no stable type that enumerates supported objects (**Stable surface: 🟡**)
  - In Python, `create_adapter` must dynamically generate a new model class, which is less transparent

### Option 2: Pure object-first structure, "Plugin" for registry / "Adapter" for SDK

Config and runtime object both keyed by CommonGrants model name at the root. `meta` and `client` sit alongside object keys but are not themselves objects.

```ts
interface Adapter {
  meta?: AdapterMeta
  client?: Client
  Opportunity?: ObjectAdapterConfig
  Application?: ObjectAdapterConfig
  // ... one key per protocol object
}
```

```python
# Python equivalent — same object-keyed shape
@dataclass
class Adapter:
    meta: AdapterMeta | None = None
    client: Client | None = None
    Opportunity: ObjectAdapterConfig | None = None
    Application: ObjectAdapterConfig | None = None
    # ... one field per protocol object
```

:::note[Bottom line]
Pure object-first / Plugin+Adapter is best if:

- we want authoring a new object's support to feel self-contained during development
- but we're willing to accept a top-level key set that grows with the protocol and scattered client config
:::

- **Pros**
  - Co-location: all of an object's config is in one branch during authoring
  - Clear semantic split: "plugin" = what you install, "adapter" = what you construct in code — `Adapter` is a well-understood bridging pattern with a named, importable, type-hintable class
- **Cons**
  - Top-level keys track the protocol's object list, which is long and open-ended — surface grows as protocol grows and raises questions about which of 100+ schemas belongs at the top level
  - Client, auth, and transport are system-level but must either be duplicated per object or kept implicit alongside object keys, creating an awkward mix of concerns
  - Filters attach to resource methods rather than schemas, and resource methods aren't consistent across objects (e.g. `opportunities.list/get/search` vs `applications.start/submit`), creating a poor fit
  - DI requires reassembling a flat view across all object branches (e.g. an `allSchemas` helper) — working against the grain of the structure
  - `mergeExtensions()` must deeply merge nested per-object branches rather than operating on a flat serializable root

### Option 3: Functional top-level with per-object schema grouping *(chosen)*

Top-level keys are functional (`meta`, `client`, `schemas`, `extensions`). Per-object grouping is used only inside `schemas`, where it reflects real coupling between native schemas, CommonGrants schemas, and bidirectional transforms.

```ts
interface Adapter {
  meta: AdapterMeta
  client: Client
  extensions: AdapterExtensions
  schemas: Record<string, ObjectSchemas>  // per-object grouping only here
}
```

:::note[Bottom line]
Functional top-level / per-object schemas is best if:

- we want a stable, short top-level surface that doesn't grow with the protocol's object list
- and we want a singular client and clean DI while still co-locating the tightly-coupled schema/transform pairs per object
:::

- **Pros**
  - Short, stable top-level surface — `meta`, `client`, `schemas`, `extensions` tracks a closed list regardless of how many protocol objects exist
  - Client is singular — one source system has one OAuth config, one base URL, one rate limiter
  - DI works along functional lines: pass `Client`, pass `Schemas`, pass `Extensions` as units
  - `mergeExtensions()` operates on flat, serializable data at the root, not deeply nested per-object branches
  - Per-object grouping inside `schemas` preserves real coupling — native schema, CommonGrants schema, `toCommon`, and `fromCommon` share type signatures and change together
  - Mirrors the SDK module structure (`client`, `schemas`, `extensions`) — Adapter is a system-specific version of the existing SDK, not a different mental model
- **Cons**
  - `extensions` (serializable config) and `adapter` (runtime object including client) are distinct concepts that adopters must learn separately
