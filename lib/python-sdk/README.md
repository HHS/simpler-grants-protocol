# CommonGrants Python SDK

A Python SDK for interacting with the CommonGrants protocol, providing a type-safe interface for managing grant opportunities.

## Features

- **Type-Safe Models**: Built with Pydantic v2 for robust data validation and serialization
- **Comprehensive Schema Support**: Full implementation of the CommonGrants protocol schemas
- **Modern Python**: Requires Python 3.11+ for optimal performance and type safety
- **Extensible**: Easy to extend with custom fields and validation

## Installation

```bash
# Using pip
pip install common-grants-sdk

# Using Poetry
poetry add common-grants-sdk
```

## Quick Start

```python
from datetime import datetime, date, UTC
from uuid import uuid4

from common_grants_sdk.schemas.fields import Money, Event
from common_grants_sdk.schemas.models import (
    OpportunityBase,
    OppFunding,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
)

# Create a new opportunity
opportunity = OpportunityBase(
    id=uuid4(),
    title="Research Grant 2024",
    description="Funding for innovative research projects",
    status=OppStatus(
        value=OppStatusOptions.OPEN,
        description="This opportunity is currently accepting applications"
    ),
    created_at=datetime.now(UTC),
    last_modified_at=datetime.now(UTC),
    funding=OppFunding(
        total_amount_available=Money(amount="100000.00", currency="USD"),
        min_award_amount=Money(amount="10000.00", currency="USD"),
        max_award_amount=Money(amount="50000.00", currency="USD"),
        estimated_award_count=5
    ),
    key_dates=OppTimeline(
        app_opens=Event(
            name="Application Opens",
            date=date(2024, 1, 1),
            description="Applications open"
        ),
        app_deadline=Event(
            name="Application Deadline",
            date=date(2024, 3, 31),
            description="Applications close"
        )
    )
)

# Serialize to JSON
json_data = opportunity.dump_json()

# Deserialize from JSON
loaded_opportunity = OpportunityBase.from_json(json_data)
```

## Core Components

### Base Model

- `CommonGrantsBaseModel`: Base class for all models, provides common serialization and validation methods
- `SystemMetadata`: Tracks creation and modification timestamps for records

### Opportunity Models

- `OpportunityBase`: Core opportunity model
- `OppFunding`: Funding details and constraints
- `OppStatus` & `OppStatusOptions`: Opportunity status tracking
- `OppTimeline`: Key dates and milestones

### Field Types

- `Money`: Represents monetary amounts with currency
- `DecimalString`: Validated string representing a decimal number
- `Event`: Union of event types
- `EventType`: Enum for event type discrimination
- `SingleDateEvent`: Event with a single date
- `DateRangeEvent`: Event with a start and end date
- `OtherEvent`: Event with a custom description or recurrence
- `CustomField`: Flexible field type for custom data
- `CustomFieldType`: Enum for custom field value types
- `ISODate`: Alias for `datetime.date` (ISO 8601 date)
- `ISOTime`: Alias for `datetime.time` (ISO 8601 time)
- `UTCDateTime`: Alias for `datetime.datetime` (UTC timestamp)

### Transformation Utilities

The SDK includes a utility for transforming data according to a mapping specification:

- `transform_from_mapping()` supports extracting fields, switching on values, and reshaping data dictionaries

## Example: Data Transformation

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
    "id": { "field": "opportunity_id" },
    "title": { "field": "opportunity_title" },
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
            "amount": { "field": "summary.award_floor" },
            "currency": "USD",
        },
        "maxAwardAmount": {
            "amount": { "field": "summary.award_ceiling" },
            "currency": "USD",
        },
    },
    "keyDates": {
        "appOpens": { "field": "summary.forecasted_post_date" },
        "appDeadline": { "field": "summary.forecasted_close_date" },
    },
}

transformed_data = transform_from_mapping(source_data, mapping)

assert transformed_data == {
    "id": uuid4(),
    "title": "Research into ABC",
    "status": "open",
    "funding": {
        "minAwardAmount": { "amount": 10000, "currency": "USD" },
        "maxAwardAmount": { "amount": 100000, "currency": "USD" },
    },
    "keyDates": {
        "appOpens": "2025-05-01",
        "appDeadline": "2025-07-15",
    },
}
```

## License

See [LICENSE](../../LICENSE) for details. 
