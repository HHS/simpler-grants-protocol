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
config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.api_key("YOUR_API_KEY"))

# 2. List opportunities
response = client.opportunities.list()
for opp in response.items:
    print(f"{opp.title} ({opp.status.value})")
```

### Kitchen sink example

This example shows how the SDK's modules work together: fetching data with the client, validating it with schemas, and accessing typed custom fields via extensions.

```python
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config
from common_grants_sdk.schemas.pydantic import (
    OpportunityBase,
    OppStatusOptions,
    CustomFieldType,
)
from common_grants_sdk.extensions.specs import CustomFieldSpec

# Extend the base schema with custom fields
CustomOpportunity = OpportunityBase.with_custom_fields(
    custom_fields={
        "programArea": CustomFieldSpec(
            field_type=CustomFieldType.STRING,
            description="Grant program area",
        ),
        "legacyId": CustomFieldSpec(
            field_type=CustomFieldType.INTEGER,
            description="Legacy system ID",
        ),
    },
    model_name="CustomOpportunity",
)

# Create a client
config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.api_key("YOUR_API_KEY"))

# Fetch opportunities using the extended schema
response = client.opportunities.list(schema=CustomOpportunity)
for opp in response.items:
    print(f"{opp.title} ({opp.status.value})")

    # Access typed custom fields
    if opp.status.value == OppStatusOptions.OPEN:
        program = opp.get_custom_field_value("programArea", str)
        print(f"  Program area: {program}")

# Validate standalone data directly against the schema
raw = {
    "id": "ac201443-5480-4e36-9799-a39765225153",
    "title": "Community Health Grant",
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
| [Client](common_grants_sdk/client/README.md) | HTTP client with auth, pagination, and low-level HTTP methods |
| [Schemas](common_grants_sdk/schemas/README.md) | Pydantic models, validation, and generic response schemas |
| [Extensions](common_grants_sdk/extensions/README.md) | Custom fields and plugin framework |

### API Client

HTTP client with built-in authentication, auto-pagination, and environment variable configuration. See the [Client guide](common_grants_sdk/client/README.md) for setup, authentication, and usage examples.

### Schemas and Validation

[Pydantic v2](https://docs.pydantic.dev/) models for validating and parsing CommonGrants data, along with type-safe enum constants. See the [Schemas guide](common_grants_sdk/schemas/README.md) for validation examples, type safety patterns, and the full API reference.

### Extensions and Plugins

Extension framework for adding typed custom fields to CommonGrants schemas, either ad hoc or as reusable plugins. See the [Extensions guide](common_grants_sdk/extensions/README.md) for the full guide.

## License

See [LICENSE](../../LICENSE.md)
