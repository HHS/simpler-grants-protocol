# CommonGrants Python SDK

A Python SDK for interacting with the CommonGrants protocol, providing a type-safe interface for managing grant opportunities.

## Table of contents <!-- omit in toc -->

- [Installation](#installation)
- [Usage](#usage)
  - [Quick start](#quick-start)
  - [Kitchen sink example](#kitchen-sink-example)
- [Modules](#modules)
  - [API Client](#api-client)
  - [Schemas and Validation](#schemas-and-validation)
  - [Extensions and Plugins](#extensions-and-plugins)
- [License](#license)

## Installation

```bash
# Using pip
pip install common-grants-sdk

# Using Poetry
poetry add common-grants-sdk
```

## Usage

### Quick start

```python
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

# 1. Create a client
config = Config(base_url="https://api.example.org", api_key="YOUR_API_KEY")
client = Client(config=config, auth=Auth.api_key("YOUR_API_KEY"))

# 2. List opportunities
response = client.opportunities.list()
for opp in response.items:
    print(f"{opp.title} ({opp.status.value})")
```

### Kitchen sink example

This example shows how the SDK's modules work together: declaring a plugin with typed custom fields and a custom filter, getting a pre-bound client from it, searching with both standard and custom filters, and validating standalone data with schemas.

```python
from typing import Optional

from pydantic import Field

from common_grants_sdk.client import Config
from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    PluginMeta,
    PluginRoutes,
    PluginSchemas,
    ResourceRoutes,
    define_plugin,
    f,
    schema,
)
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    OpportunityFilters,
    StringArray,
)
from common_grants_sdk.schemas.pydantic.models import OpportunityBase


# Custom fields attach to schemas. The value type on CustomField[V] flows through
# to opp.custom_fields.<field>.value on every parsed response row.
class OppFields(CustomFieldSet):
    program_area: Optional[CustomField[str]] = Field(
        default=None, description="Grant program area"
    )
    legacy_id: Optional[CustomField[int]] = Field(
        default=None, description="Legacy system ID"
    )


# Custom filters attach to routes. This one subclass both registers the filter
# and types the consumer's search(filters=...) call site.
class OppSearchFilters(OpportunityFilters, total=False):
    agency: StringArray


plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=OpportunityBase[OppFields])),
    routes=PluginRoutes(opportunities=ResourceRoutes(search=OppSearchFilters)),
    meta=PluginMeta(name="my-system", source_system="my-system.example.gov"),
)

# A plugin-bound client parses responses with the plugin's schemas and types
# search(filters=...) by the filters it registered — no per-call schema argument.
client = plugin.get_client(
    Config(base_url="https://api.example.org", api_key="YOUR_API_KEY")
)

result = client.opportunities.search(
    search="education",
    filters={
        "status": f.in_(["open"]),  # standard filter → top-level request field
        "agency": f.in_(["HHS"]),   # registered custom filter → customFilters
    },
)

for opp in result.items:
    print(f"{opp.title} ({opp.status.value})")

    # Custom fields are fully typed
    fields = opp.custom_fields
    if fields is not None and fields.program_area is not None:
        print(f"  Program area: {fields.program_area.value}")  # typed as str

# Rows that failed to parse are partitioned out rather than raising
for err in result.errors:
    print(f"  parse error at row {err.index}: {err.message}")

# Validate standalone data directly against the schema
raw = {
    "id": "ac201443-5480-4e36-9799-a39765225153",
    "title": "Community Health Grant",
    "description": "A grant supporting community health initiatives.",
    "status": {"value": "open"},
    "createdAt": "2025-01-01T00:00:00Z",
    "lastModifiedAt": "2025-01-01T00:00:00Z",
}
validated_opp = OpportunityBase.model_validate(raw)
print(validated_opp.title)
```

## Modules

The SDK is organized into modules, each with its own documentation:

| Module | Description |
|---|---|
| [Client](https://github.com/HHS/simpler-grants-protocol/blob/main/lib/python-sdk/common_grants_sdk/client/README.md) | HTTP client with auth, pagination, and low-level HTTP methods |
| [Schemas](https://github.com/HHS/simpler-grants-protocol/blob/main/lib/python-sdk/common_grants_sdk/schemas/README.md) | Pydantic models, validation, and generic response schemas |
| [Extensions](https://github.com/HHS/simpler-grants-protocol/blob/main/lib/python-sdk/common_grants_sdk/extensions/README.md) | Custom fields and plugin framework |

### API Client

HTTP client with built-in authentication, auto-pagination, and environment variable configuration. See the [Client guide](https://github.com/HHS/simpler-grants-protocol/blob/main/lib/python-sdk/common_grants_sdk/client/README.md) for setup, authentication, and usage examples.

### Schemas and Validation

[Pydantic v2](https://docs.pydantic.dev/) models for validating and parsing CommonGrants data, along with type-safe enum constants. See the [Schemas guide](https://github.com/HHS/simpler-grants-protocol/blob/main/lib/python-sdk/common_grants_sdk/schemas/README.md) for validation examples, type safety patterns, and the full API reference.

### Extensions and Plugins

Extension framework for adding typed custom fields to CommonGrants schemas, either ad hoc or as reusable plugins. See the [Extensions guide](https://github.com/HHS/simpler-grants-protocol/blob/main/lib/python-sdk/common_grants_sdk/extensions/README.md) for the full guide.

## License

See [LICENSE](https://github.com/HHS/simpler-grants-protocol/blob/main/LICENSE.md)
