# Extensions

The CommonGrants protocol defines a standard set of fields for grants data, but agencies and systems often need to track additional information beyond that core set. **Extensions** are the mechanism for adding these agency- or system-specific fields to CommonGrants resources without modifying the base specification.

For background, see:

- [Custom Fields catalog](https://commongrants.org/custom-fields/): The published set of recommended custom fields
- [Extensions section of the CommonGrants specification](https://commongrants.org/protocol/specification/#extensions): How extensions fit into the protocol

The `common_grants_sdk.extensions` module contains the utilities for working with extensions: declaring custom fields on base schemas, registering custom filters on resource methods, bundling both into typed plugins, and transforming between a source system's format and the CommonGrants format.

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
  - [Defining bidirectional transforms](#defining-bidirectional-transforms)
  - [Built-in mapping handlers](#built-in-mapping-handlers)
  - [Null handling](#null-handling)
  - [Custom handlers](#custom-handlers)
  - [Validating against the extended schema](#validating-against-the-extended-schema)
  - [Wiring transforms into a plugin](#wiring-transforms-into-a-plugin)
  - [Error handling](#error-handling)
- [Plugin custom filters](#plugin-custom-filters)
  - [Routes vs. schemas — a critical distinction](#routes-vs-schemas--a-critical-distinction)
  - [Declaring custom filters on a route](#declaring-custom-filters-on-a-route)
  - [Filter-type catalog and the `f.*` helpers](#filter-type-catalog-and-the-f-helpers)
  - [Classifying consumer filters into the request body](#classifying-consumer-filters-into-the-request-body)
  - [Validation — registration time and call time](#validation--registration-time-and-call-time)
- [Using plugins with the API client](#using-plugins-with-the-api-client)
- [Best practices](#best-practices)

## Key concepts

| Concept | Description |
| --- | --- |
| **Custom field** | A key-value pair on a resource's `customFields` property. Each field has a `name`, `fieldType`, `value`, and optional `description`. |
| **`CustomField[V]`** | A Pydantic generic that is the single source of truth for a custom field. The static value type `V` anchors the typing; `fieldType` and the inspectable value type are *derived* from `V`, so they cannot drift. |
| **`CustomFieldSet`** | The base class an author subclasses to declare a schema's custom fields, each as `Optional[CustomField[V]] = Field(default=None, description=...)`. |
| **`OpportunityBase[CF]`** | The common Opportunity model, a Pydantic generic over its custom-fields container `CF`. `OpportunityBase[OpportunityFields]` is a fully concrete type; `OpportunityBase` is the unextended form. |
| **`schema(...)`** | The factory that builds a schema extension. Overloads enforce, statically: mappings XOR hand-written functions XOR schema-only, and a `source_schema` whenever transforms are present. Returns a `SchemaWithTransforms` or a `SchemaOnly`. |
| **`PluginSchemas`** | Maps your extensions to the registered extensible schemas, keyed by name (`PluginSchemas(Opportunity=...)`). Schemas you omit fall back to the base schema, never `None`. |
| **`define_plugin(...)`** | Assembles a `Plugin` from a `PluginSchemas` and a `PluginMeta`. |
| **`Plugin`** | The value consumers import. `plugin.schemas.Opportunity` is fully typed dot access. |
| **`build_transforms()`** | Compiles a pair of mapping dicts into `(to_common, from_common)` callables. Used by `schema(..., mappings=...)` under the hood; also callable directly when you need custom handlers. |
| **`TransformResult`** | The return shape `(result, errors)` of every transform. Errors are non-fatal: a partial result is always returned alongside any errors. |
| **`PluginCustomFieldSpec`** | The resolved, inspection-only view of a custom field (`field_type`, `value`, `name`, `description`), exposed on `extension.custom_fields`. Derived from `CustomField[V]`; authors never construct it. |
| **`CustomFieldSpec`** | The runtime declaration consumed by `with_custom_fields()` (Option 1). `field_type` is a required input there. |
| **Custom filter** | A filter a plugin registers for one resource *method*, beyond the protocol's standard filters. Declared as a typed key on an `OpportunityFilters` subclass; lands under `customFilters` on the search request body. |
| **`PluginRoutes` / `ResourceRoutes`** | The typed carriers passed to `define_plugin(routes=...)`. One slot per filter-capable resource and method, so a misspelled `resource` or `method` is a type error rather than a silently ignored registration. |
| **`f`** | The helper singleton for building filter values — `f.eq(...)`, `f.in_([...])`, `f.between(...)`. Overloaded so each builder's static return type is the precise filter model the value implies. |
| **`classify_filters()`** | The search-time step that sorts a consumer's flat `filters` dict into the ADR-0012 request body: standard filters as named fields, registered and ad-hoc keys under `customFilters`. Called for you by the client. |
| **`validate_routes()`** | Registration-time validator for a plugin's route declarations. Runs at `define_plugin` so authoring mistakes surface for the author. |
| **`FilterError`** | Structured error raised by filter validation, at registration time and call time. Carries `path`, `source_value`, and `cause`. |

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
from common_grants_sdk.schemas.pydantic.models import OpportunityBase


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
    PluginSchemas(Opportunity=schema(common_schema=OpportunityBase[OpportunityFields])),
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

- **Schema-only** — custom fields, no transforms: `schema(common_schema=OpportunityBase[Fields])` returns a `SchemaOnly`. It has `parse(...)` but no `to_common`, so consumers cannot transform it.
- **Mappings** — declarative transforms: `schema(source_schema=Src, common_schema=OpportunityBase[Fields], mappings={...})` returns a `SchemaWithTransforms`.
- **Functions** — hand-written transforms: `schema(source_schema=Src, common_schema=OpportunityBase[Fields], to_common=fn, from_common=fn)` returns a `SchemaWithTransforms`.

`common_schema` must be a registered extensible schema (`OpportunityBase[...]`); an unregistered base raises `PluginDefinitionError`.

### Assembling a plugin

`PluginSchemas` maps each extension to a registered schema name; `define_plugin` returns the `Plugin`. Schemas you omit fall back to the base schema (a `SchemaOnly` over `OpportunityBase`), never `None`.

```python
plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=OpportunityBase[OpportunityFields])),
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

Plugins can declare bidirectional transforms that convert between a source system's native format and the CommonGrants format. `to_common` maps native → CommonGrants; `from_common` reverses it. Both directions are always author-provided — `build_transforms()` does not invert one mapping from the other, because many-to-one handlers like `match` are not reversible.

### Defining bidirectional transforms

Use `build_transforms()` to compile a pair of mapping dicts into callables:

```python
from common_grants_sdk.extensions import build_transforms

to_common, from_common = build_transforms(
    # to_common_mapping: native → CommonGrants
    to_common_mapping={
        "id":             {"field": "opportunity_uuid"},
        "title":          {"field": "opportunity_title"},
        "createdAt":      {"field": "created_at"},
        "lastModifiedAt": {"field": "last_modified_at"},
        "status": {
            "value": {
                "match": {
                    "field": "opportunity_status",
                    "case": {"posted": "open", "archived": "closed", "forecasted": "forecasted"},
                    "default": "custom",
                }
            }
        },
    },
    # from_common_mapping: CommonGrants → native
    from_common_mapping={
        "opportunity_uuid":  {"field": "id"},
        "opportunity_title": {"field": "title"},
    },
)

result = to_common(source_data)
if not result.errors:
    use(result.result)
```

Each callable returns a `TransformResult` of `(result, errors)` unconditionally. Failures surface as `TransformError` entries in `errors` rather than being raised — callers choose their own strict-vs-lenient policy.

### Built-in mapping handlers

Mapping dicts are nested objects where keys are either output field names or registered handler names. A handler-keyed node dispatches the handler with `(data, handler_arg)`. Bare non-dict values are treated as literals.

| Handler          | Spec shape                                                          | Behavior                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `field`          | `{"field": "dot.notation.path"}`                                   | Extracts a value from the source via dot-notation. Terminal `None` is preserved; absent / intermediate-`None` returns `None`. See [Null handling](#null-handling). |
| `const`          | `{"const": <literal>}`                                             | Returns the literal value, ignoring source data.                                                                                               |
| `match`          | `{"match": {"field": "...", "case": {...}, "default": "..."}}`     | Case-based lookup on a source field value. `None` source passes through unchanged; opt-in target-side translation via `case: {"null": ...}`.   |
| `switch`         | Same as `match`                                                     | Convenience alias for `match` — both point at the same handler function.                                                                       |
| `numberToString` | `{"numberToString": "dot.notation.path"}`                          | Extracts a value and coerces to string. Returns `None` on `None` source ("doesn't apply"); absent → `None`.                                   |
| `stringToNumber` | `{"stringToNumber": "dot.notation.path"}`                          | Extracts a string and coerces to `int` when possible, falls back to `float`. Returns `None` on `None` source; absent → `None`. Raises on non-numeric input. |

When the source is a real (non-passthrough) model, mapping output keys may use either the model's field names or their camelCase aliases (e.g. `createdAt`). Field paths in `from_common` read from the common model using its camelCase alias names (e.g. `status.value`, `customFields.agencyCode.value`).

### Null handling

Optional values carry three distinct states, each of which should be preserved through the transform:

| State      | Meaning                                                                                  | Handler output      |
| ---------- | ---------------------------------------------------------------------------------------- | ------------------- |
| **absent** | "Not provided" — the publisher did not supply this data                                  | key omitted         |
| **`None`** | "Doesn't apply" — the publisher actively asserts the field is irrelevant for this record | key present, `None` |
| **value**  | "Has a value"                                                                            | coerced value       |

`match` / `switch` passes a `None` source through unchanged by default. To translate it to a target-side sentinel, add a `"null"` key to the `case` dict:

```python
# status=None on input → status=None on output  (publisher's "doesn't apply" survives)
{"match": {"field": "status", "case": {"posted": "open", "archived": "closed"}, "default": "custom"}}

# status=None on input → status="n_a" on output  (author-chosen translation)
{"match": {"field": "status", "case": {"posted": "open", "null": "n_a"}, "default": "custom"}}
```

`default` is **not** consulted for `None` source — `default` belongs to "unrecognized value," not to "publisher asserts irrelevant." The opt-in `"null"` case key is the only path from a `None` source to a non-`None` target.

**For custom-handler authors:** preserve the three-state contract when you write your own handlers. Return `None` for both "not provided" and "doesn't apply" as appropriate — the walker writes `None` returns as a present key, so the output object distinguishes the three states the same way the wire does.

> **Note:** The coercing handlers (`numberToString`, `stringToNumber`) currently collapse a `None` source into the "not provided" path rather than preserving it as `None`. This is a known divergence; bringing them to full parity is a pending follow-up.

### Custom handlers

Register additional handlers per `build_transforms()` call by passing a `handlers` dict. Name collisions with built-ins raise at call time. Custom handlers should follow the three-state contract from [Null handling](#null-handling) above:

```python
from common_grants_sdk.extensions import build_transforms

# `join` is a special case: string concatenation has no meaningful null
# behavior, so this drops both absent and None source values. This is
# appropriate for `join` specifically — most coercing handlers should
# preserve None on None source rather than collapsing it.
def join_fields(data: dict, spec: dict) -> str | None:
    parts = [
        str(v) for field in spec.get("fields", [])
        if (v := data.get(field)) is not None
    ]
    return spec.get("sep", " ").join(parts) if parts else None


to_common, from_common = build_transforms(
    to_common_mapping={"label": {"join": {"fields": ["first_name", "last_name"], "sep": " "}}},
    from_common_mapping={},
    handlers={"join": join_fields},
)
```

Custom handlers are scoped to their `build_transforms()` call and are not visible to any other call.

### Validating against the extended schema

Pass `common_schema` and/or `source_schema` to `build_transforms()` to validate transform output at runtime. Always pass the **fully parameterized schema** (e.g. `OpportunityBase[OpportunityFields]`), not the bare base — the bare base only validates `custom_fields` as a plain dict and silently weakens typed field checks:

```python
from common_grants_sdk.extensions import build_transforms

to_common, from_common = build_transforms(
    to_common_mapping={...},
    from_common_mapping={...},
    common_schema=OpportunityBase[OpportunityFields],  # validates to_common output
    source_schema=GrantsGovOpportunity,                # validates from_common output
)

out = to_common(source_data)
# On validation failure, out.result holds the raw transformed dict so
# callers can inspect malformed data alongside out.errors.
```

### Wiring transforms into a plugin

There are two ways to wire transforms into a plugin entry. These are mutually exclusive — you cannot provide both `mappings` and explicit callables on the same entry.

**Option A: Declarative mappings** — pass a `mappings` dict to `schema(...)` and the SDK compiles `to_common` / `from_common` for you:

```python
from common_grants_sdk.extensions import PassthroughModel, schema

ext = schema(
    source_schema=PassthroughModel,
    common_schema=OpportunityBase[OpportunityFields],
    mappings={
        "to_common": {
            "id":    {"field": "opportunity_uuid"},
            "title": {"field": "opportunity_title"},
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
                    "value":     {"field": "agency_code"},
                    "name":      {"const": "agencyCode"},
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

**Option B: Hand-written callables** — write the functions yourself and pass them via the functions overload for logic that declarative mappings cannot express. Use `validate_into` so the result is validated into the target model and any failure is routed to `TransformResult.errors`:

```python
from common_grants_sdk.extensions import TransformResult, schema, validate_into


def to_common(source: GrantsGovOpportunity) -> TransformResult[OpportunityBase[OpportunityFields]]:
    return validate_into(OpportunityBase[OpportunityFields], {
        "id":    source.opportunity_uuid,
        "title": source.opportunity_title,
        # ...
    })


def from_common(common: OpportunityBase[OpportunityFields]) -> TransformResult[GrantsGovOpportunity]:
    # `common` is fully typed: common.custom_fields.agency_code.value -> str
    return validate_into(GrantsGovOpportunity, {...})


ext = schema(
    source_schema=GrantsGovOpportunity,
    common_schema=OpportunityBase[OpportunityFields],
    to_common=to_common,
    from_common=from_common,
)
```

Hand-written functions own their own validation. `validate_into` constructs the target Pydantic model and routes any `ValidationError` into `TransformResult.errors` rather than raising. The SDK does not re-wrap them.

When you need custom handlers alongside hand-written functions, compile with `build_transforms()` directly and pass the callables to `schema(...)`:

```python
from common_grants_sdk.extensions import build_transforms

to_common, from_common = build_transforms(
    to_common_mapping={...},
    from_common_mapping={...},
    handlers={"join": join_fields},
    common_schema=OpportunityBase[OpportunityFields],
    source_schema=GrantsGovOpportunity,
)

ext = schema(
    source_schema=GrantsGovOpportunity,
    common_schema=OpportunityBase[OpportunityFields],
    to_common=to_common,
    from_common=from_common,
)
```

Both options expose the same runtime surface:

```python
result = plugin.schemas.Opportunity.to_common(source_data)
```

For a complete runnable round-trip covering both options and custom handlers, see [`examples/grants_gov_transforms.py`](../../examples/grants_gov_transforms.py).

### Error handling

`TransformError` carries structured context — `path`, `handler`, `source_value`, `cause` — so callers can reason about failures programmatically without parsing error text:

```python
result = to_common(source_data)
if result.errors:
    for err in result.errors:
        # Build a redacted projection — source_value carries input data by design.
        # See the PII warning below before logging the full error.
        safe = {"message": str(err), "path": err.path, "handler": err.handler}
        print(safe)
```

`TransformError` properties:

| Property       | Type                | Description                                                      |
| -------------- | ------------------- | ---------------------------------------------------------------- |
| `message`      | `str`               | Human-readable description of the failure.                       |
| `path`         | `str \| None`       | Dot-notation path to the failing field, when known.              |
| `handler`      | `str \| None`       | Handler name that threw, when applicable.                        |
| `source_value` | `Any`               | The full input record passed to the transform (see PII warning). |
| `cause`        | `Exception \| None` | The original exception.                                          |

> **PII warning:** The SDK does **not** redact by default. `TransformError.source_value` and `cause` are plain attributes and will appear in any logger that prints the error object. `source_value` is populated with the entire input record passed to `to_common` / `from_common` — not just the value at the failing field. Log a redacted projection instead — e.g. `{"message": str(err), "path": err.path, "handler": err.handler}`.

## Plugin custom filters

Plugins can register custom filters per route-method. At search time the consumer's single flat `filters` dict is classified into the body of the search request (the `OppFilters` shape from ADR-0012): standard filters land as named top-level fields, while registered and ad-hoc keys land under `customFilters`.

### Routes vs. schemas — a critical distinction

Custom **filters** attach to resource **methods** (routes). Custom **fields** attach to **schemas**. They are separate arguments on the same `define_plugin(...)` call:

```python
define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=OpportunityBase[OppFields])),  # custom fields
    routes=PluginRoutes(opportunities=ResourceRoutes(search=OppSearchFilters)),   # custom filters
    meta=PluginMeta(name="grants.gov", source_system="grants.gov"),
)
```

The reason for the split: filter declarations vary per route-method (`opportunities.search` may support different filters than a future `applications.list`), whereas custom fields are a schema-level concern shared by every operation that returns the model.

### Declaring custom filters on a route

Subclass `OpportunityFilters` and annotate each custom filter with its value model. That one subclass does double duty — it **registers** the filter (through the route carrier) and **types** the consumer's `search(filters=...)` call site, so there is no second declaration to drift:

```python
from common_grants_sdk.extensions import (
    PluginMeta,
    PluginRoutes,
    PluginSchemas,
    ResourceRoutes,
    define_plugin,
    schema,
)
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    OpportunityFilters,
    StringArray,
    StringComparison,
)
from common_grants_sdk.schemas.pydantic.models import OpportunityBase


class OppSearchFilters(OpportunityFilters, total=False):
    agency: StringArray               # funding agency code, e.g. "HHS", "DOE"
    fundingProgram: StringComparison  # funding program name


# `OpportunityFields` is the CustomFieldSet declared in "Option 2" above — a real
# plugin usually registers both axes, so this one carries custom fields too.
grants_gov_plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=OpportunityBase[OpportunityFields])),
    routes=PluginRoutes(opportunities=ResourceRoutes(search=OppSearchFilters)),
    meta=PluginMeta(
        name="grants.gov",
        source_system="grants.gov",
        capabilities=["customFields", "customFilters"],
    ),
)
```

Pass the **fully parameterized** `OpportunityBase[OpportunityFields]`, not the bare base — the same rule as for transforms. With the bare base, `custom_fields` parses as a plain dict and the typed access shown below silently degrades.

`OpportunityFilters` is open via PEP 728 `extra_items`, so keys you declare get exact typing through the subclass while an unregistered ad-hoc key still type-checks. `total=False` makes every key optional. Operators are never authored — they are implied by the value model you annotate with (`StringArray` accepts `in` / `notIn` and nothing else).

Filter keys are the names that go on the wire, so declare them in the same camelCase form a consumer will pass (`fundingProgram`). This is the opposite of custom *fields*, where you declare snake_case and an alias generator handles the wire form.

The route carriers are frozen dataclasses, so a misspelled resource or method is both a type-checker error and a runtime `TypeError` — `PluginRoutes(opportunites=...)` and `ResourceRoutes(serach=...)` each fail rather than silently registering nothing.

### Filter-type catalog and the `f.*` helpers

Ten value models can back a custom filter. Seven have a clean alias for the authoring surface; the three range filters are annotated with their explicit `*RangeFilter` names, because `NumberRange` / `DateRange` / `MoneyRange` are already the range *value* sub-models and would collide.

| Annotation          | Operators                             | Value shape             |
| ------------------- | ------------------------------------- | ----------------------- |
| `StringComparison`  | `eq`, `neq`, `like`, `notLike`        | `str`                   |
| `StringArray`       | `in`, `notIn`                         | `list[str]`             |
| `NumberComparison`  | `eq`, `neq`, `gt`, `gte`, `lt`, `lte` | `int` \| `float`        |
| `NumberArray`       | `in`, `notIn`                         | `list[int \| float]`    |
| `NumberRangeFilter` | `between`, `outside`                  | `NumberRange`           |
| `BooleanComparison` | `eq`, `neq`                           | `bool` (strict)         |
| `DateComparison`    | `gt`, `gte`, `lt`, `lte`              | `ISODate`               |
| `DateRangeFilter`   | `between`, `outside`                  | `DateRange`             |
| `MoneyComparison`   | `gt`, `gte`, `lt`, `lte`              | `Money`                 |
| `MoneyRangeFilter`  | `between`, `outside`                  | `MoneyRange`            |

Build filter values with the `f` singleton rather than constructing models by hand:

```python
from common_grants_sdk.extensions import f

f.eq("open")                            # {"operator": "eq",   "value": "open"}
f.in_(["HHS", "DOE"])                   # {"operator": "in",   "value": ["HHS", "DOE"]}
f.like("*Conservation*")                # {"operator": "like", "value": "*Conservation*"}
f.between("2025-01-01", "2025-12-31")   # {"operator": "between", "value": {"min": ..., "max": ...}}
# Full set: eq, neq, gt, gte, lt, lte, in_, not_in, like, not_like, between, outside
```

Each builder is overloaded so its *static* return type is the precise model the value implies: `f.eq("x")` is a `StringComparison`, `f.eq(5)` a `NumberComparison`, `f.eq(True)` a `BooleanComparison`. A typed filter dict therefore composes with `f.*` at the call site with no annotation.

Values that do not map to a precise model — a `Money` dict, an ISO date string — fall through to `DefaultFilter`. That is deliberate, not a gap: the registered filter's own value model still validates them at call time, so a `DateComparison`-typed filter is checked even though `f.gt("2025-01-01")` is statically a `DefaultFilter`.

> **Naming note.** `f.in_` and `f.not_in` carry trailing underscores because `in` and `not` are Python keywords; the wire operators they emit are still `in` and `notIn`. The TypeScript SDK spells the same helpers `F.in` / `F.notIn` (valid as JS object keys). This is a deliberate, documented naming divergence between the SDKs — the wire contract is identical.

### Classifying consumer filters into the request body

`define_plugin(...)` registers filter *declarations* — which names exist and what type each one is. `classify_filters(...)` is the separate **search-time** step that turns a consumer's actual filter values into the request body. The client calls it internally on every `search()`, so consumers normally never call it directly:

```python
from common_grants_sdk.client import Config
from common_grants_sdk.extensions import f

client = grants_gov_plugin.get_client(Config(base_url="https://api.example.gov", api_key="..."))

result = client.opportunities.search(
    filters={
        # Standard filters → named top-level fields on the request body
        "status": f.in_(["open", "forecasted"]),
        "closeDateRange": f.between("2025-01-01", "2025-12-31"),
        # Registered custom filters → customFilters, validated against the declared model
        "agency": f.in_(["HHS", "DOE"]),
        "fundingProgram": f.like("*Conservation*"),
        # Ad-hoc filter the plugin never registered → customFilters passthrough
        "legacyTag": f.eq("conservation-2024"),
    }
)

# The server echoes back the filters it received, so all three buckets are visible.
print(result.filter_info.filters)
```

The three-bucket classification rule (ADR-0012):

1. **Standard filters** (`status`, `closeDateRange`, …) → named top-level fields, validated against the real field type on `OppDefaultFilters` (`status` is checked as a `StringArray`, not as a permissive `DefaultFilter`). Either key form works — `closeDateRange` or `close_date_range` — but supplying both forms of the same filter is an error.
2. **Registered custom filters** (declared on the route's TypedDict) → the `customFilters` record, validated against the model the plugin declared.
3. **Ad-hoc filters** (anything else) → `customFilters` passthrough, validated against the union of the ten known models — so a value that does not fit its operator, such as `{"operator": "in", "value": "grant"}`, is still rejected rather than quietly forwarded.

To build a request body without a client, call `classify_filters` directly:

```python
from common_grants_sdk.extensions import classify_filters

body = classify_filters(
    grants_gov_plugin.routes, "opportunities", "search", {"agency": f.in_(["HHS"])}
)
body.model_dump(by_alias=True, exclude_none=True, mode="json")
```

`mode="json"` is required — coerced `date` objects are not JSON-serializable in Pydantic's default python mode.

Registered filters are looked up by the **exact** `(resource, method)` strings the plugin declared. A non-matching pair (a pluralization typo, say) yields no registered bucket at all, and every non-standard filter is then validated as if it were ad-hoc.

### Validation — registration time and call time

`validate_routes(...)` runs when the plugin is defined, and again when `plugin.get_client()` binds routes, so an authoring mistake surfaces for the author rather than for a consumer later. It raises `FilterError` if:

- a registered filter is annotated with something that is not one of the ten value models (`region: int`, or a non-filter model), or
- a route redeclares a standard `OpportunityFilters` key with a different type — authors get the standard keys for free, and re-typing one creates a static/runtime mismatch.

Call-time validation runs inside `classify_filters` for every key and is **fail-fast**: the first invalid value raises `FilterError` before any request body exists, so a malformed filter can never silently widen a consumer's search. This holds for standard, registered, and ad-hoc keys alike. `filter_info.errors` on a response carries server-reported filter feedback only.

`FilterError` carries the same structured context as `TransformError`:

| Property       | Type                | Description                                            |
| -------------- | ------------------- | ------------------------------------------------------ |
| `message`      | `str`               | Human-readable description of the failure.             |
| `path`         | `str \| None`       | Where the failure occurred, e.g. `filters.agency`.     |
| `source_value` | `Any`               | The offending filter value (see PII warning).           |
| `cause`        | `Exception \| None` | The underlying Pydantic `ValidationError`, when any.    |

(`FilterError` also carries a `handler` attribute for symmetry with `TransformError`; filter validation never populates it.)

> **PII warning:** as with transforms, the SDK does **not** redact. `FilterError.source_value` carries the consumer's raw filter value. The [PII warning](#error-handling) above applies equally — log a redacted projection such as `{"message": str(err), "path": err.path}`.

For runnable end-to-end coverage — happy path, authoring errors, and consumer errors — see [`examples/custom_filters.py`](../../examples/custom_filters.py). For the typed authoring and consuming experience with `assert_type` proofs, see [`examples/typed_custom_filters.py`](../../examples/typed_custom_filters.py).

## Using plugins with the API client

`plugin.get_client(...)` is the shortest path: the returned client parses responses with the plugin's schemas and types `search(filters=...)` by its registered filters, so no per-call `schema` argument is needed.

```python
from common_grants_sdk.client import Config
from common_grants_sdk.extensions import f

client = grants_gov_plugin.get_client(Config(base_url="https://api.example.gov", api_key="..."))

opp = client.opportunities.get(opp_id)
print(opp.custom_fields.program_area.value)  # typed as str

response = client.opportunities.list()
results = client.opportunities.search(
    search="health",
    filters={"status": f.in_(["open"]), "agency": f.in_(["HHS"])},
)
```

If you are working with a client you built yourself, pass an extension's `common_schema` per call instead. This parses custom fields but leaves filters untyped, since the client has no route registrations bound:

```python
from common_grants_sdk.client import Client, Config

client = Client(config=Config(base_url="https://api.example.gov", api_key="..."))
schema_cls = grants_gov_plugin.schemas.Opportunity.common_schema

opp = client.opportunities.get(opp_id, schema=schema_cls)
response = client.opportunities.list(schema=schema_cls)
results = client.opportunities.search(search="health", schema=schema_cls)
```

`Config` reads `CG_API_BASE_URL` and `CG_API_KEY` from the environment when you omit them, so `Config()` is enough in a configured deployment.

> The `status=[...]` shorthand on `search()` is deprecated and will be removed in a future release. Pass status through `filters` instead, as shown above.

## Best practices

### Field naming

Custom-field keys are camelCase on the wire. Declare a `CustomField[V]` with a snake_case attribute name (`legacy_grant_id`); it serializes to and parses from `legacyGrantId` automatically. Use descriptive, stable names; renaming a published field is a breaking change. Prefix ambiguous names with your organization (e.g. `hhs_program_area`) when collisions with other plugins are likely.

### Keep plugins focused

A plugin should represent a single logical concern (one agency's fields, one integration). Declare all of a schema's custom fields on one `CustomFieldSet`.

### Type safety

- The value type `V` on `CustomField[V]` is the single source of truth. `fieldType` and the inspectable value type are derived from it, so they cannot drift.
- For complex object values, use a Pydantic model as `V`: `Optional[CustomField[LegacyRef]]` derives `fieldType="object"` and gives consumers `value.system` / `value.id` typing.
- Run a type checker (`mypy` or `pyright`) over your plugin module; consumer typing is verified by `assert_type` lines in the SDK's tests.
