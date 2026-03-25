# Extensions

The CommonGrants protocol defines a standard set of fields for grants data, but agencies and systems often need to track additional information beyond that core set. **Extensions** are the mechanism for adding these agency- or system-specific fields to CommonGrants resources without modifying the base specification.

For background, see:

- [Custom Fields catalog](https://commongrants.org/custom-fields/): The published set of recommended custom fields
- [Extensions section of the CommonGrants specification](https://commongrants.org/protocol/specification/#extensions): How extensions fit into the protocol


The `common-grants/sdk/extensions` module contains the utilities for working with extensions: registering custom fields on base schemas, bundling them into reusable plugins and composing plugins together.

## Table of contents <!-- omit in toc -->

- [Key Concepts](#key-concepts)
- [Extending base models using Custom Fields](#extending-base-models-using-custom-fields)
  - [Option 1: Ad hoc with `with_custom_fields()`](#option-1-ad-hoc-with-with_custom_fields)
  - [Option 2: Build-time with plugins](#option-2-build-time-with-plugins)
- [Extracting Custom Field Values](#extracting-custom-field-values)
- [Plugins](#plugins)
  - [What is a plugin?](#what-is-a-plugin)
  - [Defining a plugin](#defining-a-plugin)
  - [Publishing a plugin](#publishing-a-plugin)
  - [Combining Plugins](#combining-plugins)
- [Using plugins with the API client](#using-plugins-with-the-api-client)
- [Best practices](#best-practices)
  - [Field naming](#field-naming)
  - [Keep plugins focused](#keep-plugins-focused)
  - [Type safety](#type-safety)
  - [Export value types alongside your plugin](#export-value-types-alongside-your-plugin)
  - [Declare `common-grants-sdk` as a dependency](#declare-common-grants-sdk-as-a-dependency)
  - [Avoid `"first_wins"` / `"last_wins"` in published plugins](#avoid-first_wins--last_wins-in-published-plugins)


## Key Concepts

Here are some key concepts that are used to define custom fields and plugins that extend base schemas from the CommonGrants protocol.

| Concept | Description |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Custom field**       | A key-value pair attached to a resource's `customFields` property. Each field has a `name`, `fieldType`, `value`, and optional `description`.                                                               |
| **`CustomFieldSpec`**  | A Python dataclass that _describes_ a custom field: its `field_type`, optional `value` (a Python type for the `value` property), and optional `name` and `description`.                                     |
| **`SchemaExtensions`** | A mapping of extensible model names (e.g. `"Opportunity"`) to dicts of `CustomFieldSpec` objects. This is the shape that `define_plugin()` and `with_custom_fields()` accept.                               |
| **`Plugin`**           | A dataclass with `.extensions` (the raw `SchemaExtensions`) and `.schemas` (Pydantic models with typed `customFields` applied). Created by `define_plugin()`.                                               |



## Extending base models using Custom Fields

There are two ways to register custom fields on a base schema: at runtime (ad hoc) or at build-time (with plugins)

### Option 1: Ad hoc with `with_custom_fields()`
Use `with_custom_fields()` when you want to extend a single schema directly, without creating a reusable plugin. This is useful for one-off scripts, tests, or quick prototyping.

```python
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4
from common_grants_sdk.schemas.pydantic import (
    OpportunityBase,
    CustomFieldType,
    OppStatus,
    OppStatusOptions,
)
from common_grants_sdk.extensions.specs import CustomFieldSpec


# Define a Pydantic schema for complex custom field values
class LegacyIdValue(BaseModel):
    system: str
    id: int

# Add 2 custom fields to extend the base schema
fields = {
    "legacyId": CustomFieldSpec(field_type=CustomFieldType.OBJECT, value=LegacyIdValue),
    "groupName": CustomFieldSpec(field_type=CustomFieldType.STRING, value=str),
}
Opportunity = OpportunityBase.with_custom_fields(
    custom_fields=fields, model_name="Opportunity"
)

opp_data = {
    "id": uuid4(),
    "title": "Foo bar",
    "status": OppStatus(value=OppStatusOptions.OPEN),
    "description": "Example opportunity",
    "createdAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
    "lastModifiedAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
    "customFields": {
        "legacyId": {
            "name": "legacyId",
            "fieldType": "object",
            "value": {"system": "legacy", "id": 12345},
        },
        "groupName": {
            "name": "groupName",
            "fieldType": "string",
            "value": "TEST_GROUP",
        },
        "ignoredForNow": {"type": "string", "value": "noop"},
    },
}

# Validate the fields to make them retrievable
opp = Opportunity.model_validate(opp_data)
print(opp.custom_fields["legacyId"])
```


### Option 2: Build-time with plugins

Use `define_plugin()` when you want to create a **reusable, shareable** set of custom field definitions. Plugins are the recommended approach for any extensions that will be used across multiple files, projects, or teams.

The following is an example `cg_config.py` file, which you pass to the build step.


```python
from common_grants_sdk import define_plugin, merge_extensions
from common_grants_sdk.extensions import CustomFieldSpec, SchemaExtensions

# Extensions that might come from a shared HHS package
hhs_extensions: SchemaExtensions = {
    "Opportunity": {
        "program_area": CustomFieldSpec(
            field_type="string",
            description="HHS program area code (e.g. 'CFDA-93.243')",
        ),
        "legacy_grant_id": CustomFieldSpec(
            field_type="integer",
            description="Numeric ID from the legacy grants management system",
        ),
    },
}

# Extensions specific to this project
local_extensions: SchemaExtensions = {
    "Opportunity": {
        "eligibility_types": CustomFieldSpec(
            field_type="array",
            description="Types of organizations eligible to apply (e.g. 'nonprofit', 'tribal')",
        ),
        "award_ceiling": CustomFieldSpec(
            field_type="number",
            description="Maximum award amount in USD",
        ),
    },
}

config = define_plugin(
    merge_extensions([hhs_extensions, local_extensions], on_conflict="error"),
)
```

After defining your plugins in `cg_config.py`, run the following command from the repo root (or the directory containing your plugin) to generate the plugin code:

```bash
poetry run python -m common_grants_sdk.extensions.generate --plugin examples/plugins/opportunity_extensions
```

This generates the plugin and writes the output into a `generated/` subdirectory inside the named plugin directory. You can then import the plugin via its directory name.


```python
import sys
from pathlib import Path

# Make the examples/ directory importable so that
# plugins.opportunity_extensions resolves correctly.
sys.path.insert(0, str(Path(__file__).parent))

from plugins.opportunity_extensions import opportunity_extensions  # noqa: E402


# ---------------------------------------------------------------------------
# Sample API payload containing our four custom fields
# ---------------------------------------------------------------------------

api_response = {
    "id": "573525f2-8e15-4405-83fb-e6523511d893",
    "title": "Community Health Innovation Grant",
    "status": {"value": "open"},
    "description": "Funding for community-led health initiatives",
    "createdAt": "2025-03-01T00:00:00Z",
    "lastModifiedAt": "2025-03-15T00:00:00Z",
    "customFields": {
        "program_area": {
            "fieldType": "string",
            "value": "CFDA-93.243",
        },
        "legacy_grant_id": {
            "fieldType": "integer",
            "value": 98765,
        },
        "eligibility_types": {
            "fieldType": "array",
            "value": ["nonprofit", "tribal", "city_government"],
        },
        "award_ceiling": {
            "fieldType": "number",
            "value": 250000.00,
        },
    },
}

# ---------------------------------------------------------------------------
# Use the model returned via opportunity_extensions
# ---------------------------------------------------------------------------

opp = opportunity_extensions.schemas.Opportunity.model_validate(api_response)

```

## Extracting Custom Field Values

Use `get_custom_field_value()` to safely retrieve typed values from `custom_fields`. It is useful in three main situations:

1. **Unregistered fields** — you didn't use `with_custom_fields()` or a plugin to register a custom field and want to validate its value at runtime.
2. **Ad hoc fields** — you registered a field with `with_custom_fields()` for initial validation, but want type inference on the value after accessing it.
3. **Programmatic access** — you registered a field via a plugin (which provides type inference through dot-delimited access like `opp.custom_fields.foo.value`), but need to access fields by variable name, such as in a loop.

The helper returns `None` if the key is absent (no `try/except` needed) and raises `ValueError` if the value is present but cannot be converted to the requested type.

The idiomatic form is the instance method on any `OpportunityBase` subclass:

```python
from pydantic import BaseModel
from common_grants_sdk.schemas.pydantic import OpportunityBase, CustomFieldType

class LegacyIdValue(BaseModel):
    system: str
    id: int

opp = OpportunityBase.model_validate(opp_data)

# Returns Optional[LegacyIdValue], or None if key is absent
legacy = opp.get_custom_field_value("legacyId", LegacyIdValue)
if legacy is not None:
    print(legacy.id)  # typed as int

# Returns Optional[str]
group = opp.get_custom_field_value("groupName", str)

# Returns None — no KeyError
missing = opp.get_custom_field_value("missing", str)
```

`get_custom_field_value()` works with both ad hoc (unregistered) and plugin-based (registered) custom fields.


## Plugins

### What is a plugin?

A plugin is a Python package that adds domain-specific custom fields to CommonGrants models. For example, a government agency might add a `legacy_grant_id` field to `Opportunity` to preserve backward compatibility with an existing system.

Plugins are built from a `cg_config.py` spec file. The SDK's code generator reads that file and emits fully typed Pydantic models into a `generated/` subdirectory. Consumers import the generated schemas and get complete type safety without running the generator themselves.

### Defining a plugin

A plugin is a Python class that contains extension specs and generated schemas


```python
@dataclass(frozen=True)
class Plugin:
    """Runtime plugin container with both extension specs and generated schemas."""

    extensions: SchemaExtensions
    schemas: Any
```


```python
from common_grants_sdk.extensions import CustomFieldSpec, SchemaExtensions
from common_grants_sdk.schemas.pydantic import CustomFieldType
# Extensions specific to this project
local_extensions: SchemaExtensions = {
    "Opportunity": {
        "eligibilityTypes": CustomFieldSpec(
            field_type=CustomFieldType.ARRAY,
            description="Types of organizations eligible to apply (e.g. 'nonprofit', 'tribal')",
        ),
        "awardCeiling": CustomFieldSpec(
            field_type="number",
            description="Maximum award amount in USD",
        ),
    },
}

config = define_plugin(local_extensions)

```

After running the build step the imported extension object will have 2 fields to use.
1. The `schemas` property used to access the properties on the model that was extended.
2. The `extensions` property to access information about the extensions added and their specific pydantic properties.


### Publishing a plugin

#### Package structure

A minimal plugin package has 2 user-defined files `cg_config.py` and `pyproject.toml` for export.

For Poetry (and most `pyproject.toml`-based build systems), `pyproject.toml` lives at the **project root**, while `cg_config.py` and the generated files live inside the **Python package subdirectory**:

```
opportunity-extensions/        # Project root (outer folder — name it anything)
├── pyproject.toml             # Package metadata (you write this)
└── opportunity_extensions/    # Python package (inner folder — must match packages config)
    ├── __init__.py            # Emitted by the generator — commit to the repo
    ├── cg_config.py           # Field specs (source of truth — you write this)
    └── generated/             # Emitted by the generator — commit to the repo
        ├── __init__.py
        └── schemas.py
```

The generator writes `generated/` and the package-level `__init__.py`. Only `cg_config.py` and `pyproject.toml` are hand-authored.

> [!IMPORTANT]
> `cg_config.py` must be **inside** the Python package directory (alongside `__init__.py`), not at the project root next to `pyproject.toml`. Placing it at the project root will cause import errors when Poetry resolves the package.

Run the generator from the **project root**, pointing `--plugin` at the inner package directory:

```bash
poetry run python -m common_grants_sdk.extensions.generate --plugin opportunity_extensions
```

`pyproject.toml` (at the project root) defines the package metadata for export.

```toml
  [tool.poetry]
  name = "opportunity-extensions"
  version = "0.1.0"
  description = "CommonGrants opportunity custom field extensions"
  authors = ["Your Name <you@example.com>"]
  packages = [{include = "opportunity_extensions"}]

  [tool.poetry.dependencies]
  python = "^3.11"
  common-grants-sdk = "^0.5.1"

  [tool.poetry.group.dev.dependencies]
  pyright = "^1.1"
  pytest = "^8.0"

  [build-system]
  requires = ["poetry-core"]
  build-backend = "poetry.core.masonry.api"

```

#### Shipping pre-built schemas

Publishing steps:
1. Add an empty `py.typed` file so Pyright and mypy recognize your package as typed:

```
my_plugin/
└── py.typed
```

2. Declare it in `pyproject.toml`:

```toml
[tool.poetry]
include = ["my_plugin/py.typed"]
```

3. Build and verify the distribution:

```bash
poetry build
poetry publish
```

#### Consumer usage

After installing the plugin (e.g. `poetry add commongrants-hhs-plugin`):

```python
from commongrants_hhs_plugin import hhs_plugin

opp = hhs_plugin.schemas.Opportunity.model_validate(api_response)
print(opp.custom_fields.program_area.value)    # typed as str
print(opp.custom_fields.legacy_grant_id.value) # typed as int
```

#### Pre-publish checklist

Before publishing a new version of your plugin:

- [ ] `cg_config.py` field specs are up to date
- [ ] Generator has been re-run and the output is committed (`generated/schemas.py`, `generated/__init__.py`, `__init__.py`)
- [ ] All custom fields have the intended types (no unintended `Any` annotations in `generated/schemas.py`)
- [ ] `py.typed` marker is present and included in the package
- [ ] Package installs cleanly in a fresh virtual environment: `pip install dist/commongrants_my_plugin-*.whl`
- [ ] Imports resolve without errors: `from my_plugin import my_plugin`
- [ ] Custom field attributes are accessible and typed in the IDE after install
- [ ] A type checker passes with no errors: `pyright my_plugin` or `mypy my_plugin`
- [ ] A [changeset](../../lib/README.md) has been created with the correct revision type

### Combining Plugins

Use `merge_extensions()` to combine field specs from multiple sources before passing them to `define_plugin()`:

```python
from common_grants_sdk import define_plugin, merge_extensions

config = define_plugin(
    merge_extensions([shared_extensions, local_extensions], on_conflict="error"),
)
```

`on_conflict` controls what happens when two sources declare the same field key on the same model:

| Strategy | Behaviour |
|---|---|
| `"error"` (default) | Raises `ValueError` — safest, forces explicit resolution |
| `"first_wins"` | Keeps the definition from the first source in the list |
| `"last_wins"` | Overwrites with the definition from the last source |

Prefer unique, namespaced field names so `"error"` is never triggered.

> [!Note]
>  The `"first_wins"` and `"last_wins"` strategies resolve conflicts at runtime but the merged result loses the specific field types of the overridden definitions. For full static type safety, use the default `"error"` strategy with non-overlapping, namespaced field names.

#### Verify type inference before publishing

After building your package, import the plugin in a test file and confirm that `.extensions` keys and `.schemas` parse types resolve correctly. Hover over the types in your editor to confirm they are not `any`.

## Using plugins with the API client

Pass a plugin's extended schema to the API client via the `schema` parameter. The client uses it to hydrate API responses into fully typed models. The `schema` parameter accepts any `Type[OpportunityBase]` subclass.

```python
from common_grants_sdk import Client
from plugins.opportunity_extensions import opportunity_extensions

client = Client(base_url="https://api.example.gov")

# Get a single opportunity with typed custom fields
opp = client.opportunities.get(opp_id, schema=opportunity_extensions.schemas.Opportunity)
print(opp.custom_fields.program_area.value)  # typed as str

# List with the same schema
response = client.opportunities.list(schema=opportunity_extensions.schemas.Opportunity)
for opp in response.items:
    print(opp.custom_fields.legacy_grant_id.value)  # typed as int

# Search with the same schema
results = client.opportunities.search(
    search="health",
    status=["open"],
    schema=opportunity_extensions.schemas.Opportunity,
)
```


## Best practices

### Field naming

> [!IMPORTANT]
> The field key you define in `cg_config.py` **must match the key in the JSON data** you're parsing in order to validate your custom fields correctly. Because the CommonGrants standard uses `camelCase` for core attributes, you **should** use `camelCase` for custom field keys.

The generator converts `camelCase` keys to `snake_case` Python attribute names automatically, using a Pydantic `alias` under the hood. For example, a field key of `"legacyGrantId"` becomes `opp.custom_fields.legacy_grant_id` in Python, while still mapping to `"legacyGrantId"` in JSON:

```python
# cg_config.py
extensions: SchemaExtensions = {
    "Opportunity": {
        "legacyGrantId": CustomFieldSpec(   # camelCase key — matches the JSON
            field_type="integer",
            description="Numeric ID from the legacy grants management system",
        ),
    },
}
```

```python
# JSON parsed correctly because the alias matches
api_response = {
    "customFields": {
        "legacyGrantId": {"fieldType": "integer", "value": 98765},
    },
}

opp = my_plugin.schemas.Opportunity.model_validate(api_response)
opp.custom_fields.legacy_grant_id.value  # 98765, typed as int
```

Additional field naming guidelines:

- Use descriptive, stable names. Renaming a published field is a breaking change.
- Prefix ambiguous names with your organization or system context (e.g. `hhsProgramArea` rather than `programArea`) when there is risk of collision with other plugins.

### Keep plugins focused

A plugin should represent a single logical concern (one agency's fields, one integration's needs, or one domain concept). If you need fields from multiple concerns, use `merge_extensions()` to compose separate plugins rather than bundling everything into one.

### Type safety

- Omitting `value` in `CustomFieldSpec` falls back to a sensible default (`str`, `int`, `float`, `bool`, `list[str]`, or `dict[str, Any]`). Specify it explicitly when you need a more precise type.
- For complex object types, define a Pydantic `BaseModel` subclass and pass it as `value`:

  ```python
  from pydantic import BaseModel
  from common_grants_sdk.extensions import CustomFieldSpec

  class LegacyRef(BaseModel):
      system: str
      id: int

  extensions: SchemaExtensions = {
      "Opportunity": {
          "legacy_ref": CustomFieldSpec(
              field_type="object",
              value=LegacyRef,
              description="Reference to the opportunity in the legacy system",
          ),
      },
  }
  ```

> [!NOTE]
> The generator only embeds the class name for builtins and SDK types. If a type lives in a third-party package **or your plugin's own module**, the generator falls back to `Any`. Define such types inside `common_grants_sdk` and use `from common_grants_sdk...` imports.

### Export value types alongside your plugin

When you define Pydantic models for complex `value` fields, export them as named exports from your package. Downstream consumers may need these types for use with `get_custom_field_value()`:

```python
# __init__.py of a plugin package
from pydantic import BaseModel
from common_grants_sdk.extensions import CustomFieldSpec, SchemaExtensions

# Export value types so consumers can reference them directly
class ProgramAreaValue(BaseModel):
    code: str
    name: str

extensions: SchemaExtensions = {
    "Opportunity": {
        "program_area": CustomFieldSpec(
            field_type="object",
            value=ProgramAreaValue,
            description="The HHS program area for this opportunity",
        ),
    },
}
```

This allows consumers to use `get_custom_field_value()` with the same type the plugin uses for validation:

```python
from commongrants_hhs_plugin import hhs_plugin, ProgramAreaValue

opp = hhs_plugin.schemas.Opportunity.model_validate(api_response)

# Extract the value with full type safety using the exported type
area = opp.get_custom_field_value("program_area", ProgramAreaValue)
print(area.code)  # typed as str
```

### Declare `common-grants-sdk` as a dependency

Declare `common-grants-sdk` as a dependency in your plugin's `pyproject.toml` rather than expecting consumers to install it separately. This ensures the correct version of the SDK is always present when your plugin is installed. See [Publishing a plugin](#publishing-a-plugin) for a full `pyproject.toml` example.

### Avoid `"first_wins"` / `"last_wins"` in published plugins

When calling `merge_extensions()` with `"first_wins"` or `"last_wins"`, conflicts are resolved at runtime but the overridden field definitions are silently dropped. This is fine for local or ad hoc usage, but if you publish a package that uses one of these strategies internally, consumers have no indication that fields may have been overridden.

Prefer the default `"error"` strategy in published plugins. If your extensions genuinely overlap with another plugin, resolve the conflicts explicitly before publishing rather than deferring to a lossy merge strategy.

