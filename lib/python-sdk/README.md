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
pip install common-grants-python-sdk

# Using Poetry
poetry add common-grants-python-sdk
```

## Quick Start

```python
from datetime import datetime, date, UTC
from uuid import uuid4

from common_grants.schemas.fields import Money, Event
from common_grants.schemas.models.opp_base import OpportunityBase
from common_grants.schemas.models.opp_funding import OppFunding
from common_grants.schemas.models.opp_status import OppStatus, OppStatusOptions
from common_grants.schemas.models.opp_timeline import OppTimeline

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

### Base Models

- `CommonGrantsBaseModel`: Base class for all models with common serialization methods
- `SystemMetadata`: Tracks creation and modification timestamps

### Field Types

- `Money`: Represents monetary amounts with currency
- `Event`: Represents scheduled events with date, time, and description
- `CustomField`: Flexible field type for custom data
- `DecimalString`: Validated decimal number strings

### Opportunity Models

- `OpportunityBase`: Core opportunity model
- `OppFunding`: Funding details and constraints
- `OppStatus`: Opportunity status tracking
- `OppTimeline`: Key dates and milestones

