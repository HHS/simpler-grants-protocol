# Extensions

The CommonGrants protocol defines a standard set of fields for grants data, but agencies and systems often need to track additional information beyond that core set. **Extensions** are the mechanism for adding these agency- or system-specific fields to CommonGrants resources without modifying the base specification.

For background, see:

- [Custom Fields catalog](https://commongrants.org/custom-fields/): The published set of recommended custom fields
- [Extensions section of the CommonGrants specification](https://commongrants.org/protocol/specification/#extensions): How extensions fit into the protocol

The `common_grants_sdk.extensions` module contains the utilities for working with extensions: declaring custom fields on base schemas, bundling them into typed plugins, and transforming between a source system's format and the CommonGrants format.

There is no build step. Plugins are plain Python: you declare custom fields as a `CustomFieldSet`, build each schema extension with the `schema(...)` factory, and assemble a `Plugin` with `define_plugin(...)`. Consumers import the plugin and get fully typed, non-optional access to every registered schema.

## Table of contents <!-- omit in toc -->

- [Key concepts](#key-concepts)
- [Declaring custom fields](#declaring-custom-fields)
  - [Option 1: Ad hoc with `with_custom_fields()`](#option-1-ad-hoc-with-with_custom_fields)
  - [Option 2: A reusable plugin](#option-2-a-reusable-plugin)
- [Extracting custom field values](#extracting-custom-field-values)
- [Plugins](#plugins)
  - [The `schema(...)` factory](#the-schema-factory)
  - [Assembling a plugin](#assembling-a-plugin)
  - [Consuming a plugin](#consuming-a-plugin)
  - [Publishing a plugin](#publishing-a-plugin)
- [Bidirectional transforms](#bidirectional-transforms)
  - [Declarative mappings](#declarative-mappings)
  - [Hand-written functions](#hand-written-functions)
  - [Mapping format](#mapping-format)
- [Using plugins with the API client](#using-plugins-with-the-api-client)
- [Best practices](#best-practices)

## Key concepts

| Concept | Description |
| --- | --- |
| **Custom field** | A key-value pair on a resource's `customFields` property. Each field has a `name`, `fieldType`, `value`, and optional `description`. |
| **`CustomField[V]`** | A Pydantic generic that is the single source of truth for a custom field. The static value type `V` anchors the typing; `fieldType` and the inspectable value type are *derived* from `V`, so they cannot drift. |
| **`CustomFieldSet`** | The base class an author subclasses to declare a schema's custom fields, each as `Optional[CustomField[V]] = Field(default=None, description=...)`. |
| **`Opportunity[CF]`** | The common Opportunity model, a Pydantic generic over its custom-fields container `CF`. `Opportunity[OpportunityFields]` is a fully concrete type; `Opportunity[NoCustomFields]` is the unextended form. |
| **`schema(...)`** | The factory that builds a schema extension. Overloads enforce, statically: mappings XOR hand-written functions XOR schema-only, and a `source` whenever transforms are present. Returns a `SchemaWithTransforms` or a `SchemaOnly`. |
| **`PluginSchemas`** | Maps your extensions to the registered extensible schemas, keyed by name (`PluginSchemas(Opportunity=...)`). Schemas you omit fall back to the base schema, never `None`. |
| **`define_plugin(...)`** | Assembles a `Plugin` from a `PluginSchemas` and a `PluginMeta`. |
| **`Plugin`** | The value consumers import. `plugin.schemas.Opportunity` is fully typed dot access. |
| **`build_transforms()`** | Compiles a pair of mapping dicts into `(to_common, from_common)` callables. Used by `schema(..., mappings=...)` under the hood; also callable directly when you need custom handlers. |
| **`TransformResult`** | The return shape `(result, errors)` of every transform. Errors are non-fatal: a partial result is always returned alongside any errors. |
| **`PluginCustomFieldSpec`** | The resolved, inspection-only view of a custom field (`field_type`, `value`, `name`, `description`), exposed on `extension.custom_fields`. Derived from `CustomField[V]`; authors never construct it. |
| **`CustomFieldSpec`** | The runtime declaration consumed by `with_custom_fields()` (Option 1). `field_type` is a required input there. |

## Declaring custom fields

There are two ways to add custom fields to a base schema: ad hoc at runtime, or as a reusable plugin.

### Option 1: Ad hoc with `with_custom_fields()`

Use `with_custom_fields()` to extend a single schema directly, without creating a plugin. Useful for one-off scripts, tests, or quick prototyping.

```python
from pydantic import BaseModel
from common_grants_sdk.schemas.pydantic import OpportunityBase, CustomFieldType
from common_grants_sdk.extensions.specs import CustomFieldSpec


class LegacyIdValue(BaseModel):
    system: str
    id: int


fields = {
    "legacyId": CustomFieldSpec(field_type=CustomFieldType.OBJECT, value=LegacyIdValue),
    "groupName": CustomFieldSpec(field_type=CustomFieldType.STRING, value=str),
}
Opportunity = OpportunityBase.with_custom_fields(custom_fields=fields, model_name="Opportunity")

opp = Opportunity.model_validate(opp_data)
print(opp.custom_fields["legacyId"])
```

### Option 2: A reusable plugin

Declare custom fields as a `CustomFieldSet` and build a schema-only extension. `CustomField[V]` is the single source of truth: `fieldType` is derived from `V`, so the only per-field metadata is a description.

```python
from typing import Optional

from pydantic import Field

from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    PluginMeta,
    PluginSchemas,
    define_plugin,
    schema,
)
from common_grants_sdk.schemas.pydantic.models import Opportunity


class OpportunityFields(CustomFieldSet):
    program_area: Optional[CustomField[str]] = Field(
        default=None, description="HHS program area code (e.g. 'CFDA-93.243')"
    )
    legacy_grant_id: Optional[CustomField[int]] = Field(
        default=None, description="Numeric ID from the legacy grants management system"
    )
    eligibility_types: Optional[CustomField[list[str]]] = Field(
        default=None, description="Types of organizations eligible to apply"
    )
    award_ceiling: Optional[CustomField[float]] = Field(
        default=None, description="Maximum award amount in USD"
    )


opportunity_extensions = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=Opportunity[OpportunityFields])),
    meta=PluginMeta(name="opportunity extensions", source_system="hhs"),
)
```

Custom-field keys are camelCase on the wire and snake_case in Python: a `CustomField[V]` named `legacy_grant_id` serializes to `legacyGrantId`. This is handled by an alias generator on the `CustomFieldSet` base, so authors and consumers use snake_case while JSON I/O stays camelCase.

## Extracting custom field values

Use `get_custom_field_value()` to safely retrieve typed values from `custom_fields`, e.g. for unregistered fields or programmatic (by-name) access. It returns `None` if the key is absent and raises `ValueError` if a present value cannot be converted.

```python
from pydantic import BaseModel
from common_grants_sdk.schemas.pydantic import OpportunityBase


class LegacyIdValue(BaseModel):
    system: str
    id: int


opp = OpportunityBase.model_validate(opp_data)
legacy = opp.get_custom_field_value("legacyId", LegacyIdValue)  # Optional[LegacyIdValue]
group = opp.get_custom_field_value("groupName", str)            # Optional[str]
```

## Plugins

A plugin bundles custom fields and transforms for the CommonGrants schemas a source system extends. It is a `Plugin` value, built with no codegen.

### The `schema(...)` factory

`schema(...)` builds one schema extension. Its overloads enforce the valid shapes statically and it validates registry membership, custom-field consistency, and mapping output keys at call (import) time:

- **Schema-only** — custom fields, no transforms: `schema(common_schema=Opportunity[Fields])` returns a `SchemaOnly`. It has `parse(...)` but no `to_common`, so consumers cannot transform it.
- **Mappings** — declarative transforms: `schema(source_schema=Src, common_schema=Opportunity[Fields], mappings={...})` returns a `SchemaWithTransforms`.
- **Functions** — hand-written transforms: `schema(source_schema=Src, common_schema=Opportunity[Fields], to_common=fn, from_common=fn)` returns a `SchemaWithTransforms`.

`common` must be a registered extensible schema (`Opportunity[...]`); an unregistered base raises `PluginDefinitionError`.

### Assembling a plugin

`PluginSchemas` maps each extension to a registered schema name; `define_plugin` returns the `Plugin`. Schemas you omit fall back to the base schema (a `SchemaOnly` over `Opportunity[NoCustomFields]`), never `None`.

```python
plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=Opportunity[OpportunityFields])),
    meta=PluginMeta(name="my-system", source_system="my-system.example.gov"),
)
```

### Consuming a plugin

Every registered schema is always present and fully typed:

```python
opp = plugin.schemas.Opportunity.parse(api_response)
print(opp.custom_fields.program_area.value)     # typed as str
print(opp.custom_fields.legacy_grant_id.value)  # typed as int

# Inspect the resolved specs (field_type/value derived from CustomField[V]):
for name, spec in plugin.schemas.Opportunity.custom_fields.items():
    print(name, spec.field_type, spec.description)
```

### Publishing a plugin

A plugin is a normal Python module that exports the `Plugin` value, so publishing is standard packaging — no generated files to commit and no generate step. Add a `py.typed` marker so type checkers see your package as typed, declare `common-grants-sdk` as a dependency, and `poetry build` / `poetry publish`.

```toml
[tool.poetry]
name = "opportunity-extensions"
version = "0.1.0"
packages = [{include = "opportunity_extensions"}]
include = ["opportunity_extensions/py.typed"]

[tool.poetry.dependencies]
python = "^3.11"
common-grants-sdk = "^0.6.2"
```

```python
from opportunity_extensions import opportunity_extensions

opp = opportunity_extensions.schemas.Opportunity.parse(api_response)
print(opp.custom_fields.program_area.value)  # typed as str
```

## Bidirectional transforms

A `SchemaWithTransforms` maps between a source system's native format and the CommonGrants format. Both directions are always author-provided: `build_transforms()` does not invert one mapping from the other, because many-to-one handlers like `match` are not reversible.

### Declarative mappings

Pass `mappings` to `schema(...)` and the SDK compiles them into typed, validated `to_common` / `from_common` callables:

```python
from common_grants_sdk.extensions import PassthroughModel, schema
from common_grants_sdk.schemas.pydantic.models import Opportunity

ext = schema(
    source_schema=PassthroughModel,
    common_schema=Opportunity[OpportunityFields],
    mappings={
        "to_common": {
            "id": {"field": "opportunity_uuid"},
            "title": {"field": "opportunity_title"},
            "createdAt": {"field": "created_at"},
            "lastModifiedAt": {"field": "last_modified_at"},
            "status": {
                "value": {
                    "match": {
                        "field": "opportunity_status",
                        "case": {"posted": "open", "archived": "closed"},
                        "default": "custom",
                    }
                }
            },
            "customFields": {
                "agencyCode": {
                    "value": {"field": "agency_code"},
                    "name": {"const": "agencyCode"},
                    "fieldType": {"const": "string"},
                }
            },
        },
        "from_common": {
            "opportunity_uuid": {"field": "id"},
            "opportunity_title": {"field": "title"},
            "agency_code": {"field": "customFields.agencyCode.value"},
        },
    },
)
```

`PassthroughModel` is a permissive source schema (`extra="allow"`) for when you do not want to model the source shape. Because it accepts arbitrary keys, output-path validation is skipped for it.

### Hand-written functions

When the transform is more than a mapping (e.g. it needs a custom handler or arbitrary Python), write the callables yourself and pass them via the functions overload. Use `validate_into` so the result is validated into the target model and any failure is routed to `TransformResult.errors`:

```python
from common_grants_sdk.extensions import TransformResult, schema, validate_into
from common_grants_sdk.schemas.pydantic.models import Opportunity


def to_common(source: GrantsGovOpportunity) -> TransformResult[Opportunity[OpportunityFields]]:
    return validate_into(Opportunity[OpportunityFields], {
        "id": source.opportunity_uuid,
        "title": source.opportunity_title,
        # ...
    })


def from_common(common: Opportunity[OpportunityFields]) -> TransformResult[GrantsGovOpportunity]:
    # `common` is fully typed: common.custom_fields.agency_code.value -> str
    return validate_into(GrantsGovOpportunity, {...})


ext = schema(
    source_schema=GrantsGovOpportunity,
    common_schema=Opportunity[OpportunityFields],
    to_common=to_common,
    from_common=from_common,
)
```

Hand-written functions own their own validation. In Python, returning a `TransformResult[Model]` means returning an actual Pydantic instance, which is validated on construction (and `validate_into` makes that ergonomic and routes errors). The SDK does not re-wrap them.

When you need custom handlers, compile with `build_transforms()` directly and pass the callables to the functions overload:

```python
from common_grants_sdk.extensions import build_transforms

to_common, from_common = build_transforms(
    handlers={"join": _join_fields},
    common_schema=Opportunity[OpportunityFields],
    source_schema=PassthroughModel,
    to_common_mapping={...},
    from_common_mapping={...},
)
```

### Mapping format

A mapping dict describes how to build an output object from a source object. Each leaf node is either a literal value or a single-key dict that invokes a named handler.

| Handler | Syntax | Description |
| --- | --- | --- |
| `const` | `{"const": "USD"}` | A fixed literal, ignoring source data |
| `field` | `{"field": "data.summary.award_floor"}` | Extract a value via a dot-notation path |
| `match` | `{"match": {"field": "...", "case": {...}, "default": "..."}}` | Case-based lookup on a field value |
| `switch` | `{"switch": {...}}` | Alias for `match` |
| `numberToString` | `{"numberToString": "data.opportunity_id"}` | Extract a number and coerce to a string |
| `stringToNumber` | `{"stringToNumber": "data.priority_score_str"}` | Extract a string and coerce to `int`/`float` |

Bare non-dict values are treated as literals. Register custom handlers by passing a `handlers` dict to `build_transforms()`; they are scoped to that call and cannot override built-in handler names.

When the source is a real (non-passthrough) model, mapping output keys may use either the model's field names or their camelCase aliases (e.g. `createdAt`). Field paths in `from_common` read from the common model, so they use its camelCase alias names (e.g. `status.value`, `customFields.agencyCode.value`).

## Using plugins with the API client

Pass an extension's `common_schema` to the client via the `schema` parameter to hydrate responses into fully typed models:

```python
from common_grants_sdk import Client

client = Client(base_url="https://api.example.gov")
schema_cls = opportunity_extensions.schemas.Opportunity.common_schema

opp = client.opportunities.get(opp_id, schema=schema_cls)
print(opp.custom_fields.program_area.value)  # typed as str

response = client.opportunities.list(schema=schema_cls)
results = client.opportunities.search(search="health", status=["open"], schema=schema_cls)
```

## Best practices

### Field naming

Custom-field keys are camelCase on the wire. Declare a `CustomField[V]` with a snake_case attribute name (`legacy_grant_id`); it serializes to and parses from `legacyGrantId` automatically. Use descriptive, stable names; renaming a published field is a breaking change. Prefix ambiguous names with your organization (e.g. `hhs_program_area`) when collisions with other plugins are likely.

### Keep plugins focused

A plugin should represent a single logical concern (one agency's fields, one integration). Declare all of a schema's custom fields on one `CustomFieldSet`.

### Type safety

- The value type `V` on `CustomField[V]` is the single source of truth. `fieldType` and the inspectable value type are derived from it, so they cannot drift.
- For complex object values, use a Pydantic model as `V`: `Optional[CustomField[LegacyRef]]` derives `fieldType="object"` and gives consumers `value.system` / `value.id` typing.
- Run a type checker (`mypy` or `pyright`) over your plugin module; consumer typing is verified by `assert_type` lines in the SDK's tests.
