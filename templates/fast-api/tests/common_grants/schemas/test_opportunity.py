"""Tests for the opportunity schemas."""

from datetime import date, datetime, time, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from common_grants.schemas import (
    CustomField,
    CustomFieldType,
    Event,
    Money,
    OppFunding,
    OpportunityBase,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
    SystemMetadata,
)


def test_system_metadata_model():
    """Test the SystemMetadata model."""
    now = datetime.now(timezone.utc)
    metadata_data = {
        "createdAt": now,
        "lastModifiedAt": now,
    }
    metadata = SystemMetadata.model_validate(metadata_data)
    assert metadata.created_at == now
    assert metadata.last_modified_at == now


def test_money_model():
    """Test the Money model."""
    # Test valid money
    money_data = {
        "amount": "100.50",
        "currency": "USD",
    }
    money = Money.model_validate(money_data)
    assert money.amount == "100.50"
    assert money.currency == "USD"

    # Test invalid amount
    with pytest.raises(ValidationError):
        Money.model_validate({"amount": "invalid", "currency": "USD"})


def test_event_model():
    """Test the Event model."""
    # Test required fields only
    event_data = {
        "name": "Application Deadline",
        "date": date(2024, 12, 31),
        "time": None,
        "description": None,
    }
    event = Event.model_validate(event_data)
    assert event.name == "Application Deadline"
    assert event.date == date(2024, 12, 31)
    assert event.time is None
    assert event.description is None

    # Test all fields
    event_data = {
        "name": "Application Deadline",
        "date": date(2024, 12, 31),
        "time": time(23, 59, 59),
        "description": "Final deadline for all applications",
    }
    event = Event.model_validate(event_data)
    assert event.time == time(23, 59, 59)
    assert event.description == "Final deadline for all applications"


def test_custom_field_model():
    """Test the CustomField model."""
    # Test string field
    field_data = {
        "name": "program_area",
        "type": CustomFieldType.STRING,
        "schema": None,
        "value": "Healthcare",
        "description": "Primary program area for the grant",
    }
    field = CustomField.model_validate(field_data)
    assert field.name == "program_area"
    assert field.type == CustomFieldType.STRING
    assert field.value == "Healthcare"
    assert field.description == "Primary program area for the grant"

    # Test number field
    field_data = {
        "name": "years_of_operation",
        "type": CustomFieldType.NUMBER,
        "schema": None,
        "value": 5,
        "description": None,
    }
    field = CustomField.model_validate(field_data)
    assert field.type == CustomFieldType.NUMBER
    assert field.value == 5


def test_opp_status_model():
    """Test the OppStatus model."""
    # Test standard status
    status_data = {
        "value": OppStatusOptions.OPEN,
        "customValue": None,
        "description": "Opportunity is currently accepting applications",
    }
    status = OppStatus.model_validate(status_data)
    assert status.value == OppStatusOptions.OPEN
    assert status.custom_value is None
    assert status.description == "Opportunity is currently accepting applications"

    # Test custom status
    status_data = {
        "value": OppStatusOptions.CUSTOM,
        "customValue": "Under Review",
        "description": "Applications are being reviewed",
    }
    status = OppStatus.model_validate(status_data)
    assert status.value == OppStatusOptions.CUSTOM
    assert status.custom_value == "Under Review"
    assert status.description == "Applications are being reviewed"


def test_opp_funding_model():
    """Test the OppFunding model."""
    funding_data = {
        "totalAmountAvailable": {
            "amount": "100000.00",
            "currency": "USD",
        },
        "minAwardAmount": {
            "amount": "10000.00",
            "currency": "USD",
        },
        "maxAwardAmount": {
            "amount": "50000.00",
            "currency": "USD",
        },
        "estimatedAwardCount": 5,
    }
    funding = OppFunding.model_validate(funding_data)
    assert funding.total_amount_available is not None
    assert funding.total_amount_available.amount == "100000.00"
    assert funding.min_award_amount is not None
    assert funding.min_award_amount.amount == "10000.00"
    assert funding.max_award_amount is not None
    assert funding.max_award_amount.amount == "50000.00"
    assert funding.estimated_award_count == 5


def test_opp_timeline_model():
    """Test the OppTimeline model."""
    timeline_data = {
        "appOpens": {
            "name": "Application Opens",
            "date": date(2024, 1, 1),
            "time": None,
            "description": "Start accepting applications",
        },
        "appDeadline": {
            "name": "Application Deadline",
            "date": date(2024, 12, 31),
            "time": time(23, 59, 59),
            "description": "Final deadline for submissions",
        },
        "otherDates": {
            "review_start": {
                "name": "Review Start",
                "date": date(2025, 1, 1),
                "time": None,
                "description": "Start of application review process",
            },
        },
    }
    timeline = OppTimeline.model_validate(timeline_data)
    assert timeline.app_opens is not None
    assert timeline.app_opens.date == date(2024, 1, 1)
    assert timeline.app_deadline is not None
    assert timeline.app_deadline.time == time(23, 59, 59)
    assert timeline.other_dates is not None
    assert "review_start" in timeline.other_dates


def test_opportunity_base_model():
    """Test the OpportunityBase model."""
    now = datetime.now(timezone.utc)
    status = OppStatus(
        value=OppStatusOptions.OPEN,
        customValue=None,
        description="Currently accepting applications",
    )
    funding = OppFunding(
        totalAmountAvailable=Money(amount="100000.00", currency="USD"),
        minAwardAmount=Money(amount="10000.00", currency="USD"),
        maxAwardAmount=Money(amount="50000.00", currency="USD"),
        minAwardCount=None,
        maxAwardCount=None,
        estimatedAwardCount=5,
    )
    key_dates = OppTimeline(
        appOpens=Event(
            name="Application Opens",
            date=date(2024, 1, 1),
            time=None,
            description="Start accepting applications",
        ),
        appDeadline=Event(
            name="Application Deadline",
            date=date(2024, 12, 31),
            time=time(23, 59, 59),
            description="Final deadline for submissions",
        ),
        otherDates=None,
    )
    opp_dict = {
        "id": uuid4(),
        "title": "Research Grant 2024",
        "status": status.model_dump(by_alias=True),
        "description": "A research grant for 2024",
        "funding": funding.model_dump(by_alias=True),
        "keyDates": key_dates.model_dump(by_alias=True),
        "source": None,
        "customFields": None,
        "createdAt": now,
        "lastModifiedAt": now,
    }
    opp = OpportunityBase.model_validate(opp_dict)
    assert opp.title == "Research Grant 2024"
    assert opp.status.value == OppStatusOptions.OPEN
    assert opp.funding.total_amount_available.amount == "100000.00"
    assert opp.key_dates.app_opens.date == date(2024, 1, 1)
    assert opp.key_dates.app_deadline.time == time(23, 59, 59)
