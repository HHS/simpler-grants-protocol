# Schemas

The `common_grants_sdk.schemas.pydantic` module provides [Pydantic v2](https://docs.pydantic.dev/) models for validating and parsing CommonGrants data. Use these models to validate API responses, construct grant opportunities, and convert data to/from external formats.

## Table of contents <!-- omit in toc -->

- [Quick start](#quick-start)
- [Usage](#usage)
  - [Validation](#validation)
  - [Type safety](#type-safety)
  - [Generic response schemas](#generic-response-schemas)
  - [Data transformation](#data-transformation)
- [API reference](#api-reference)
  - [Base model](#base-model)
  - [Field types](#field-types)
  - [Models](#models)
  - [Response schemas](#response-schemas)

## Quick start

```python
from common_grants_sdk.schemas.pydantic import OpportunityBase

opp = OpportunityBase.model_validate({
    "id": "ac201443-5480-4e36-9799-a39765225153",
    "title": "Research Grant 2024",
    "description": "Funding for innovative research projects",
    "status": {"value": "open"},
    "createdAt": "2024-01-01T00:00:00Z",
    "lastModifiedAt": "2024-01-01T00:00:00Z",
})

print(opp.title)         # "Research Grant 2024"
print(opp.status.value)  # "open"
```

## Usage

### Validation

#### Strict validation with `model_validate()` <!-- omit in toc -->

`model_validate()` returns a fully typed model instance on success or raises a `ValidationError` on failure:

```python
from common_grants_sdk.schemas.pydantic import OpportunityBase

opp = OpportunityBase.model_validate({
    "id": "ac201443-5480-4e36-9799-a39765225153",
    "title": "Research Grant",
    "description": "Funding for research projects",
    "status": {"value": "open"},
    "createdAt": "2024-01-01T00:00:00Z",
    "lastModifiedAt": "2024-01-01T00:00:00Z",
})
print(opp.title)
print(opp.status.value)
```

Which prints:

```
Research Grant
open
```

#### Graceful error handling <!-- omit in toc -->

Catch `ValidationError` to handle invalid data without letting exceptions propagate:

```python
from pydantic import ValidationError
from common_grants_sdk.schemas.pydantic import OpportunityBase

try:
    opp = OpportunityBase.model_validate({
        "id": "not-a-uuid",
        "title": "Research Grant",
        "status": {"value": "invalid-status"},
        "createdAt": "2024-01-01T00:00:00Z",
        "lastModifiedAt": "2024-01-01T00:00:00Z",
    })
except ValidationError as e:
    print(e)
```

Which prints:

```
id
  Value error, value is not a valid UUID [type=value_error, ...]
status.value
  Input should be 'forecasted', 'open', 'custom' or 'closed' [type=enum, ...]
```

#### Parsing from JSON or a dict <!-- omit in toc -->

Use `from_json()` and `from_dict()` as convenience alternatives to `model_validate()`:

```python
from common_grants_sdk.schemas.pydantic import OpportunityBase

# From a JSON string
opp = OpportunityBase.from_json('{"id": "ac201443-...", "title": "Grant", ...}')

# From a dict
opp = OpportunityBase.from_dict(data_dict)
```

### Type safety

Use `OppStatusOptions` enum constants for type-safe comparisons instead of magic strings:

```python
from common_grants_sdk.schemas.pydantic import OpportunityBase, OppStatusOptions

def describe_status(opp: OpportunityBase) -> str:
    if opp.status.value == OppStatusOptions.OPEN:
        return "Currently accepting applications"
    elif opp.status.value == OppStatusOptions.CLOSED:
        return "No longer accepting applications"
    elif opp.status.value == OppStatusOptions.FORECASTED:
        return "Coming soon"
    else:
        return "Custom status"
```

Which prints:

```
Currently accepting applications
```

### Generic response schemas

The SDK provides generic (parameterized) response schemas for validating common API response shapes. Pass any item type to create a typed response validator:

```python
from common_grants_sdk.schemas.pydantic import Paginated, OpportunityBase

response = Paginated[OpportunityBase].model_validate({
    "status": 200,
    "message": "Success",
    "items": [
        {
            "id": "ac201443-5480-4e36-9799-a39765225153",
            "title": "Test Opportunity",
            "status": {"value": "open"},
            "createdAt": "2025-01-01T00:00:00Z",
            "lastModifiedAt": "2025-01-01T00:00:00Z",
        }
    ],
    "paginationInfo": {
        "page": 1,
        "pageSize": 20,
        "totalItems": 100,
        "totalPages": 5,
    },
})

print(f"Page {response.pagination_info.page} of {response.pagination_info.total_pages}")
print(f"Found {len(response.items)} opportunities")
```

Which prints:

```
Page 1 of 5
Found 1 opportunities
```

Other generic response schemas include `Sorted[T]` and `Filtered[T, F]`. See the [API reference](#response-schemas) for the full list.

### Data transformation

The SDK provides utilities for transforming data between external formats and CommonGrants schemas.

#### Low-level utility: `transform_from_mapping()` <!-- omit in toc -->

Use `transform_from_mapping()` to reshape a data dictionary based on a mapping specification. It supports field extraction, value switching, and nested reshaping:

```python
from common_grants_sdk.utils.transformation import transform_from_mapping

source_data = {
    "opportunity_id": 12345,
    "opportunity_title": "Research into ABC",
    "opportunity_status": "posted",
    "summary": {
        "award_ceiling": 100000,
        "award_floor": 10000,
        "forecasted_close_date": "2025-07-15",
        "forecasted_post_date": "2025-05-01",
    },
}

mapping = {
    "id": {"field": "opportunity_id"},
    "title": {"field": "opportunity_title"},
    "status": {
        "switch": {
            "field": "opportunity_status",
            "case": {
                "posted": "open",
                "closed": "closed",
            },
            "default": "custom",
        }
    },
    "funding": {
        "minAwardAmount": {
            "amount": {"field": "summary.award_floor"},
            "currency": "USD",
        },
        "maxAwardAmount": {
            "amount": {"field": "summary.award_ceiling"},
            "currency": "USD",
        },
    },
    "keyDates": {
        "appOpens": {"field": "summary.forecasted_post_date"},
        "appDeadline": {"field": "summary.forecasted_close_date"},
    },
}

transformed = transform_from_mapping(source_data, mapping)
# {
#     "title": "Research into ABC",
#     "status": "open",
#     "funding": {
#         "minAwardAmount": {"amount": 10000, "currency": "USD"},
#         "maxAwardAmount": {"amount": 100000, "currency": "USD"},
#     },
#     "keyDates": {
#         "appOpens": "2025-05-01",
#         "appDeadline": "2025-07-15",
#     },
# }
```

#### Model wrappers <!-- omit in toc -->

`CommonGrantsBaseModel` exposes convenience methods that call `transform_from_mapping` internally:

```python
from common_grants_sdk.schemas.pydantic import OpportunityBase

# Parse from external format using a mapping
opp = OpportunityBase.validate_with_mapping(source_data, mapping)

# Serialize to an external format using a mapping
external = opp.dump_with_mapping(reverse_mapping)
```

## API reference

### Base model

| Class | Description |
|---|---|
| `CommonGrantsBaseModel` | Base class for all models. Provides `model_validate`, `from_json`, `from_dict`, `dump`, `dump_json`, `dump_with_mapping`, `validate_with_mapping`. |
| `SystemMetadata` | Tracks `created_at` and `last_modified_at` timestamps for records. |

### Field types

| Type | Description |
|---|---|
| `Money` | Monetary amount with `amount` (decimal string) and `currency` (ISO 4217 code) |
| `DecimalString` | Validated string representing a decimal number |
| `Event` | Union of `SingleDateEvent`, `DateRangeEvent`, and `OtherEvent` |
| `EventType` | Enum for event type discrimination |
| `SingleDateEvent` | Event with a single `date` |
| `DateRangeEvent` | Event with a `start_date` and `end_date` |
| `OtherEvent` | Event with a custom description or recurrence |
| `CustomField` | Flexible key-value field for custom data |
| `CustomFieldType` | Enum for custom field value types: `string`, `integer`, `number`, `boolean`, `array`, `object` |
| `ISODate` | Alias for `datetime.date` (ISO 8601 date) |
| `ISOTime` | Alias for `datetime.time` (ISO 8601 time) |
| `UTCDateTime` | Alias for `datetime.datetime` (UTC timestamp) |

### Models

| Class | Description |
|---|---|
| `OpportunityBase` | Core opportunity model |
| `OppFunding` | Funding details: total amount available, min/max award, estimated award count |
| `OppStatus` | Opportunity status with `value` and optional `description` |
| `OppStatusOptions` | Enum: `OPEN`, `CLOSED`, `FORECASTED`, `CUSTOM` |
| `OppTimeline` | Key dates: `app_opens`, `app_deadline`, and other milestones |

### Response schemas

| Class | Description |
|---|---|
| `DefaultResponse` | Base response with `status` (int) and `message` (str) |
| `Success` | Default success response (`status=200`, `message="Success"`) |
| `Paginated[T]` | Paginated list with `items` and `pagination_info` |
| `Sorted[T]` | Paginated list with additional `sort_info` |
| `Filtered[T, F]` | Sorted list with additional `filter_info` |
| `FilterInfo[T]` | Filter metadata: `filters` and optional `errors` list |
| `OpportunityResponse` | Typed success response wrapping a single `OpportunityBase` |
| `OpportunitiesListResponse` | Typed `Paginated` response for opportunity listings |
| `OpportunitiesSearchResponse` | Typed `Filtered` response for opportunity search results |
| `Error` | Error response schema |
