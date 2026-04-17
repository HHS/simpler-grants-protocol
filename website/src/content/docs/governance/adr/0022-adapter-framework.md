---
title: Adapter framework
description: ADR documenting the decision to use an Adapter pattern for the expanded plugin framework that supports both custom fields and data mappings across the Python/Pydantic and TypeScript/Zod SDKs.
---

The existing plugin framework allows adopters to publish npm or PyPI packages that declare custom fields for CommonGrants schema objects. We want to expand this framework to also support declarative data mappings — JSON documents that describe how to transform platform-specific data into valid CommonGrants schema objects (see [ADR-0017](./0017-mapping-format.md)).

_How should the framework be named and structured to clearly accommodate both custom field declarations and data mappings, while remaining consistent across the Python and TypeScript SDKs?_

### Questions

- Should the framework still be called a "plugin", or does adding mappings warrant a new name?
- Should the JSON config be structured with features (fields, mappings) at the root, or with CommonGrants model names at the root?
- Should custom fields and mappings be coupled in the same package, or allowed independently?

### Decision drivers

- The framework must be implementable in both the Python and TypeScript SDKs with as consistent interface as possible.
- The JSON config format must be readable, serializable, and validatable.
- Existing plugin packages that declare only custom fields should remain valid without breaking changes.
- The SDK interface should map naturally to how Pydantic models and Zod schemas work — one model object at a time.

## Decision

We decided to:

1. **Keep "plugin" as the registry term** for published npm/PyPI packages displayed in the website catalog. No change to `PluginSourceEntry` or `src/content/plugins/index.json`.

2. **Introduce "Adapter" as the SDK term** for the runtime object that performs transformation and validation for a single CommonGrants model.

3. **Use an object-first structure** for the `AdapterConfig` JSON document, keyed by `CGSchemaName` (CommonGrants model name), with `custom_fields` and `mappings` as optional sub-keys under each model.

4. **Use `custom_fields`** to match the `customFields` key already used in the CommonGrants output schema and avoid ambiguity.

5. **Allow either or both** `custom_fields` and `mappings` per model — both are optional.

The `AdapterConfig` shape:

```ts
type AdapterConfig = {
  [schema in CGSchemaName]?: {
    custom_fields?: Record<string, CustomFieldSpec>
    mappings?: MappingNode
  }
}

```

Example:

```json
{
  "Opportunity": {
    "custom_fields": {
      "programArea": {
        "name": "programArea",
        "field_type": "string",
        "description": "HHS program area code (e.g. 'CFDA-93.243')"
      },
      "legacyGrantId": {
        "name": "legacyGrantId",
        "field_type": "integer",
        "description": "Numeric ID from the legacy grants management system"
      }
    },
    "mappings": {
      "data": {
        "title": "data.opportunity_title",
        "status": {
          "value": {
            "match": {
              "field": "data.opportunity_status",
              "case": { "posted": "open", "archived": "closed" },
              "default": "custom"
            }
          }
        }
      }
    }
  }
}
```

The SDK interface is symmetric across both languages. The model name is derived automatically — no explicit schema name argument is needed:

```ts
// TypeScript: schema name derived from schema.description
const adapter = createAdapter(opportunitySchema, adapterConfig)
const result = adapter.transform(sourceData)
```

```python
# Python: schema name derived from model.__name__
adapter = Adapter(model=Opportunity, config=adapter_config)
result = adapter.transform(source_data)
```

- **Positive consequences**
  - "Plugin" (distribution) and "Adapter" (runtime) are distinct, well-defined concepts that don't conflict
  - Object-first structure lets the SDK pass a single cohesive config slice per model to the transformer
  - Both `custom_fields` and `mappings` being optional ensures full backward compatibility
  - Consistent interface across Python and TypeScript reduces cognitive overhead for adopters working in both SDKs
- **Negative consequences**
  - Introduces two terms ("plugin" and "adapter") where previously only "plugin" existed
  - Existing plugin packages must author a new `AdapterConfig` JSON file to use the SDK — it is not automatically derived from `index.json`

### Criteria

- **Backward compatible:** Existing custom-fields-only plugins remain valid without changes
- **SDK-friendly:** Config shape maps naturally to Pydantic/Zod one-model-at-a-time usage
- **Language-agnostic config:** The JSON document is the same regardless of SDK language
- **Clear naming:** Registry and runtime concepts are distinct and unambiguous
- **Supports both capabilities:** Custom field declarations and data mappings can coexist or be used independently

### Options considered

- Feature-first structure with "Plugin" naming retained
- Feature-first structure renamed to "Adapter"
- Object-first structure with "Plugin" for registry, "Adapter" for SDK *(chosen)*

## Evaluation

### Side-by-side

| Criteria | Feature-first / Plugin | Feature-first / Adapter | Object-first / Plugin+Adapter |
| :--- | :---: | :---: | :---: |
| Backward compatible | ✅ | ❌ | ✅ |
| SDK-friendly | 🟡 | 🟡 | ✅ |
| Language-agnostic config | ✅ | ✅ | ✅ |
| Clear naming | 🟡 | ✅ | ✅ |
| Supports both capabilities | ✅ | ✅ | ✅ |

### Option 1: Feature-first structure, retain "Plugin" naming

Config keyed by capability at the root (`fields`, `mappings`), with the existing "plugin" term used throughout.

```json
{
  "fields": {
    "Opportunity": {
      "legacyId": { "field_type": "integer", "description": "Legacy numeric ID" }
    }
  },
  "mappings": { "Opportunity": { ... } }
}
```

:::note[Bottom line]
Feature-first / Plugin is best if:

- we want zero naming change from the current framework
- but we're willing to accept that the SDK must join across two top-level keys to process a single model
:::

- **Pros**
  - No naming change; fully familiar to current adopters
  - Backward compatible
- **Cons**
  - SDK must assemble per-model config from two separate keys
  - "Plugin" doesn't communicate the transformation/mapping purpose
  - `fields` and `mappings` for the same model are structurally separated

### Option 2: Feature-first structure, rename to "Adapter"

Same feature-first JSON shape, but SDK classes and types renamed from "plugin" to "adapter" throughout.

:::note[Bottom line]
Feature-first / Adapter is best if:

- we want clearer naming that communicates the transformation purpose
- but we're willing to accept the SDK join-across-keys problem and a breaking rename
:::

- **Pros**
  - "Adapter" clearly communicates bridging two systems
  - Well-understood software pattern name
- **Cons**
  - Breaking rename of existing SDK types
  - SDK still must join across two top-level keys per model
  - `fields` and `mappings` for the same model remain structurally separated

### Option 3: Object-first structure, "Plugin" for registry / "Adapter" for SDK *(chosen)*

Config keyed by CommonGrants model name at the root. "Plugin" is retained as the registry/catalog term; "Adapter" is introduced as the SDK/runtime term.

:::note[Bottom line]
Object-first / Plugin+Adapter is best if:

- we want the SDK interface to map naturally to one-model-at-a-time Pydantic/Zod usage
- and we want to distinguish the distribution concept (plugin package) from the runtime concept (adapter object)
:::

- **Pros**
  - Single cohesive config slice per model — clean SDK call site
  - Clear semantic split: "plugin" = what you install, "adapter" = what you construct in code
  - `custom_fields` and `mappings` for the same model are colocated
  - Backward compatible — both keys optional, `custom_fields`-only is valid
- **Cons**
  - Two terms in play where previously only "plugin" existed
  - Existing plugin packages must create a new `AdapterConfig` JSON file; it is not auto-derived from the website catalog (`index.json`)
