"""Tests for the base field types."""

from datetime import date, datetime, time, timezone

import pytest
from common_grants_sdk.schemas.fields import (
    CustomField,
    CustomFieldType,
    EventType,
    Money,
    SingleDateEvent,
    SystemMetadata,
)
from pydantic import ValidationError


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
        "eventType": EventType.SINGLE_DATE,
        "date": date(2024, 12, 31),
        "time": None,
        "description": None,
    }
    event = SingleDateEvent.model_validate(event_data)
    assert event.name == "Application Deadline"
    assert event.date == date(2024, 12, 31)
    assert event.time is None
    assert event.description is None

    # Test all fields
    event_data = {
        "name": "Application Deadline",
        "eventType": EventType.SINGLE_DATE,
        "date": date(2024, 12, 31),
        "time": time(23, 59, 59),
        "description": "Final deadline for all applications",
    }
    event = SingleDateEvent.model_validate(event_data)
    assert event.time == time(23, 59, 59)
    assert event.description == "Final deadline for all applications"


def test_custom_field_model():
    """Test the CustomField model."""
    # Test string field
    field_data = {
        "name": "program_area",
        "fieldType": CustomFieldType.STRING,
        "schema": None,
        "value": "Healthcare",
        "description": "Primary program area for the grant",
    }
    field = CustomField.model_validate(field_data)
    assert field.name == "program_area"
    assert field.field_type == CustomFieldType.STRING
    assert field.value == "Healthcare"
    assert field.description == "Primary program area for the grant"

    # Test number field
    field_data = {
        "name": "years_of_operation",
        "fieldType": CustomFieldType.NUMBER,
        "schema": None,
        "value": 5,
        "description": None,
    }
    field = CustomField.model_validate(field_data)
    assert field.field_type == CustomFieldType.NUMBER
    assert field.value == 5
