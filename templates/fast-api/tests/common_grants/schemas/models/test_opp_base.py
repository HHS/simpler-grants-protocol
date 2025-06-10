"""Tests for the OpportunityBase model."""

from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from common_grants_sdk.schemas.fields import Event, Money
from common_grants_sdk.schemas.models import (
    OppFunding,
    OpportunityBase,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
)


def test_opportunity_base_model():
    """Test the OpportunityBase model."""
    now = datetime.now(timezone.utc)
    opp_data = {
        "id": uuid4(),
        "title": "Research Grant 2024",
        "status": {
            "value": OppStatusOptions.OPEN,
            "customValue": None,
            "description": "Opportunity is currently accepting applications",
        },
        "description": "Funding for innovative research projects",
        "funding": {
            "totalAmountAvailable": {
                "amount": "1000000.00",
                "currency": "USD"
            },
            "minAwardAmount": {
                "amount": "50000.00",
                "currency": "USD"
            },
            "maxAwardAmount": {
                "amount": "100000.00",
                "currency": "USD"
            },
            "minAwardCount": None,
            "maxAwardCount": None,
            "estimatedAwardCount": None,
        },
        "keyDates": {
            "appOpens": {
                "name": "Application Opens",
                "date": date(2024, 1, 1),
                "time": None,
                "description": None,
            },
            "appDeadline": {
                "name": "Application Deadline",
                "date": date(2024, 12, 31),
                "time": None,
                "description": None,
            },
            "otherDates": None,
        },
        "source": None,
        "customFields": None,
        "createdAt": now,
        "lastModifiedAt": now,
    }
    opp = OpportunityBase.model_validate(opp_data, strict=False)
    
    assert isinstance(opp.id, UUID)
    assert opp.title == "Research Grant 2024"
    assert opp.status.value == OppStatusOptions.OPEN
    assert opp.funding.total_amount_available is not None
    assert opp.funding.total_amount_available.amount == "1000000.00"
    assert opp.key_dates.app_opens is not None
    assert opp.key_dates.app_opens.date == date(2024, 1, 1)
    assert opp.created_at == now
    assert opp.last_modified_at == now
