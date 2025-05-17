# Development Guide

This document provides instructions for common development tasks in the CommonGrants Python SDK.

## Prerequisites

- Python 3.11 or higher
- Poetry for dependency management

## Dependencies

Install dependencies:
```bash
cd simpler-grants-protocol/lib/python-sdk
poetry install
```

## Code Quality & Testing

### Tests

Run all tests:
```bash
cd simpler-grants-protocol/lib/python-sdk
poetry run pytest tests/ -v
```

Run tests with coverage report:
```bash
cd simpler-grants-protocol/lib/python-sdk
poetry run pytest --cov=common_grants --cov-report=term-missing
```

### Formatting

Format code with Black:
```bash
cd simpler-grants-protocol/lib/python-sdk
poetry run black .
```

### Linting

Check code with Ruff:
```bash
cd simpler-grants-protocol/lib/python-sdk
poetry run ruff check .
```

### Type Checking

Verify types with MyPy:
```bash
cd simpler-grants-protocol/lib/python-sdk
poetry run mypy .
```

## Usage Examples

### Initialize Opportunity Model Instance

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
```

### Serialize / Deserialize

```python
# Create an opportunity instance
opportunity = OpportunityBase(
    ...
)

# Serialize to JSON
json_data = opportunity.dump_json()

# Deserialize from JSON
loaded_opportunity = OpportunityBase.from_json(json_data)
```

### Transform Data Sources and Models

When extending an existing system to adopt the CommonGrants protocol, a developer might need to transform existing data model implementations or data sources into canonical model instances. Such custom transformations can be easily implementing by leveraging the abstract base class `OpportunityTransformer`. 

The `OpportunityTransformer` base class defines a standard interface for transforming raw input data (from third-party feeds, legacy formats, custom JSON, etc.) into structured `OpportunityBase` instances. As an abstract base class, `OpportunityTransformer` itself does not contain any transformation logic; custom transformation logic must be implemented by subclassing the abstract base class (see following example).

#### Custom Transformer Example

```python
from uuid import UUID
from transformers.base import OpportunityTransformer
from common_grants_sdk.schemas.models.opp_funding import OppFunding
from common_grants_sdk.schemas.models.opp_status import OppStatus, OppStatusOptions
from common_grants_sdk.schemas.models.opp_timeline import OppTimeline
from common_grants_sdk.schemas.fields import Event, Money
from datetime import date

class LegacyGrantDataTransformer(OpportunityTransformer):

    def transform_opportunity_description(self) -> str:
        return self.data_source.get("grant_description", "Description")

    def transform_opportunity_funding(self) -> OppFunding:
        total_award = self.data_source.get("total_award", 0)
        min_award = self.data_source.get("min_award", 0)
        max_award = self.data_source.get("max_award", 0)
        currency = self.data_source.get("award_currency", "USD")
        return OppFunding(
            total_amount_available=Money(amount=total_award, currency=currency),
            min_award_amount=Money(amount=min_award, currency=currency),
            max_award_amount=Money(amount=max_award, currency=currency),
            estimated_award_count=10
        )

    def transform_opportunity_status(self) -> OppStatus:
        return OppStatus(
            value=OppStatusOptions.FORECASTED,
            description="Grant opportunity status"
        )

    def transform_opportunity_timeline(self) -> OppTimeline:
        start_date = self.data_source.get("start_date")
        end_date = self.data_source.get("end_date")
        return OppTimeline(
            app_opens=Event(
                name="Application Open",
                date=date.fromisoformat(start_date),
                description="Start date for application submission"
            ),
            app_deadline=Event(
                name="Application Deadline",
                date=date.fromisoformat(end_date),
                description="Deadline for submission"
            )
        )

    def transform_opportunity_title(self) -> str:
        return self.data_source.get("grant_name", "Title")
```

Usage of the custom transformer:

```python
# Define source data
source_data = {
    "grant_name": "Small Business Research Grant",
    "grant_description": "Funding for early-stage R&D.",
    "start_date": "2026-06-01",
    "end_date": "2026-08-31",
    "total_award": 2000000,
    "min_award": 10000,
    "max_award": 50000,
    "award_count" 10
}

# Instantiate transformer
transformer = LegacyGrantFeedTransformer(source_data=source_data)

# Execute transformation to instantiate an opportunity model instance
opportunity = transformer.transform_opportunity()

# Output the opportunity model instance as json
print(opportunity.model_dump_json(indent=2))
```
