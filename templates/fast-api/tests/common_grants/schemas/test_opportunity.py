"""Tests for the opportunity schemas."""

from datetime import date, datetime, time, timezone
from uuid import UUID, uuid4

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
    metadata = SystemMetadata(created_at=now, last_modified_at=now)
    assert metadata.created_at == now
    assert metadata.last_modified_at == now


def test_money_model():
    """Test the Money model."""
    # Test valid money
    money = Money(amount="100.50", currency="USD")
    assert money.amount == "100.50"
    assert money.currency == "USD"

    # Test invalid amount
    with pytest.raises(ValidationError):
        Money(amount="invalid", currency="USD")


def test_event_model():
    """Test the Event model."""
    # Test required fields only
    event = Event(
        name="Application Deadline",
        date=date(2024, 12, 31),
        time=None,
        description=None,
    )
    assert event.name == "Application Deadline"
    assert event.date == date(2024, 12, 31)
    assert event.time is None
    assert event.description is None

    # Test all fields
    event = Event(
        name="Application Deadline",
        date=date(2024, 12, 31),
        time=time(23, 59, 59),
        description="Final deadline for all applications",
    )
    assert event.time == time(23, 59, 59)
    assert event.description == "Final deadline for all applications"


def test_custom_field_model():
    """Test the CustomField model."""
    # Test string field
    field = CustomField(
        name="program_area",
        type=CustomFieldType.STRING,
        schema=None,
        value="Healthcare",
        description="Primary program area for the grant",
    )
    assert field.name == "program_area"
    assert field.type == CustomFieldType.STRING
    assert field.value == "Healthcare"
    assert field.description == "Primary program area for the grant"

    # Test number field
    field = CustomField(
        name="years_of_operation",
        type=CustomFieldType.NUMBER,
        schema=None,
        value=5,
        description=None,
    )
    assert field.type == CustomFieldType.NUMBER
    assert field.value == 5


def test_opp_status_model():
    """Test the OppStatus model."""
    # Test standard status
    status = OppStatus(
        value=OppStatusOptions.OPEN,
        custom_value=None,
        description="Opportunity is currently accepting applications",
    )
    assert status.value == OppStatusOptions.OPEN
    assert status.custom_value is None
    assert status.description == "Opportunity is currently accepting applications"

    # Test custom status
    status = OppStatus(
        value=OppStatusOptions.CUSTOM,
        custom_value="Under Review",
        description="Applications are being reviewed",
    )
    assert status.value == OppStatusOptions.CUSTOM
    assert status.custom_value == "Under Review"
    assert status.description == "Applications are being reviewed"


def test_opp_funding_model():
    """Test the OppFunding model."""
    funding = OppFunding(
        totalAmountAvailable=Money(amount="100000.00", currency="USD"),
        minAwardAmount=Money(amount="10000.00", currency="USD"),
        maxAwardAmount=Money(amount="50000.00", currency="USD"),
        estimatedAwardCount=5,
    )
    assert funding.totalAmountAvailable is not None
    assert funding.totalAmountAvailable.amount == "100000.00"
    assert funding.minAwardAmount is not None
    assert funding.minAwardAmount.amount == "10000.00"
    assert funding.maxAwardAmount is not None
    assert funding.maxAwardAmount.amount == "50000.00"
    assert funding.estimatedAwardCount == 5


def test_opp_timeline_model():
    """Test the OppTimeline model."""
    timeline = OppTimeline(
        app_opens=Event(
            name="Application Opens",
            date=date(2024, 1, 1),
            time=None,
            description="Start accepting applications",
        ),
        app_deadline=Event(
            name="Application Deadline",
            date=date(2024, 12, 31),
            time=time(23, 59, 59),
            description="Final deadline for submissions",
        ),
        other_dates={
            "review_start": Event(
                name="Review Start",
                date=date(2025, 1, 1),
                time=None,
                description="Start of application review process",
            ),
        },
    )
    assert timeline.app_opens is not None
    assert timeline.app_opens.date == date(2024, 1, 1)
    assert timeline.app_deadline is not None
    assert timeline.app_deadline.time == time(23, 59, 59)
    assert timeline.other_dates is not None
    assert "review_start" in timeline.other_dates


def test_opportunity_base_model():
    """Test the OpportunityBase model."""
    now = datetime.now(timezone.utc)
    opp = OpportunityBase(
        id=uuid4(),
        title="Research Grant 2024",
        status=OppStatus(
            value=OppStatusOptions.OPEN,
            custom_value=None,
            description="Opportunity is currently accepting applications",
        ),
        description="Funding for innovative research projects",
        funding=OppFunding(
            totalAmountAvailable=Money(amount="100000.00", currency="USD"),
            minAwardAmount=Money(amount="10000.00", currency="USD"),
            maxAwardAmount=Money(amount="50000.00", currency="USD"),
            estimatedAwardCount=5,
        ),
        key_dates=OppTimeline(
            app_opens=Event(
                name="Application Opens",
                date=date(2024, 1, 1),
                time=None,
                description=None,
            ),
            app_deadline=Event(
                name="Application Deadline",
                date=date(2024, 12, 31),
                time=None,
                description=None,
            ),
            other_dates=None,
        ),
        source=None,
        custom_fields=None,
        created_at=now,
        last_modified_at=now,
    )
    assert isinstance(opp.id, UUID)
    assert opp.title == "Research Grant 2024"
    assert opp.status.value == OppStatusOptions.OPEN
    assert opp.funding.totalAmountAvailable is not None
    assert opp.funding.totalAmountAvailable.amount == "100000.00"
    assert opp.key_dates.app_opens is not None
    assert opp.key_dates.app_opens.date == date(2024, 1, 1)
    assert opp.created_at == now
    assert opp.last_modified_at == now
