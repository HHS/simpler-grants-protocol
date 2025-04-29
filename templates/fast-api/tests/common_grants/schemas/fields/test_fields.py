"""Tests for the base field types."""

from datetime import date, datetime, time, timezone

import pytest
from common_grants_sdk.schemas.fields import (
    CustomField,
    CustomFieldType,
    Event,
    Money,
    SystemMetadata,
)
from pydantic import ValidationError


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
