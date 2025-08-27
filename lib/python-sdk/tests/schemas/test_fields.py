"""Tests for field validation in the CommonGrants schema."""

import pytest
from datetime import date, time, datetime, timezone

from common_grants_sdk.schemas.pydantic.fields import (
    Money,
    EventType,
    SingleDateEvent,
    DateRangeEvent,
    OtherEvent,
    CustomField,
    CustomFieldType,
    SystemMetadata,
)
from common_grants_sdk.schemas.pydantic.types import validate_decimal_string


def test_money_validation():
    """Test Money model validation."""
    # Valid cases
    money = Money(amount="100.00", currency="USD")
    assert money.amount == "100.00"
    assert money.currency == "USD"

    money = Money(amount="-100.00", currency="EUR")
    assert money.amount == "-100.00"
    assert money.currency == "EUR"

    money = Money(amount="0.00", currency="GBP")
    assert money.amount == "0.00"
    assert money.currency == "GBP"

    # Invalid amounts
    with pytest.raises(ValueError):
        Money(amount="abc", currency="USD")

    with pytest.raises(ValueError):
        Money(amount="12.34.56", currency="USD")


def test_decimal_string_validation():
    """Test the DecimalString validation function."""
    # Valid cases
    assert validate_decimal_string("123.45") == "123.45"
    assert validate_decimal_string("-123.45") == "-123.45"
    assert validate_decimal_string("0") == "0"
    assert validate_decimal_string(".5") == ".5"
    assert validate_decimal_string("-0.5") == "-0.5"
    assert validate_decimal_string("1000000.00") == "1000000.00"

    # Invalid cases
    with pytest.raises(ValueError, match="Value must be a string"):
        validate_decimal_string(123)

    with pytest.raises(ValueError, match="Value must be a valid decimal number"):
        validate_decimal_string("abc")
        validate_decimal_string("12.34.56")
        validate_decimal_string("1,234.56")  # Commas not allowed
        validate_decimal_string("12.34.56")
        validate_decimal_string("12.34.56.78")


def test_single_date_event_validation():
    """Test SingleDateEvent model validation."""
    # Valid cases with all fields
    event = SingleDateEvent(
        name="Test Event",
        event_type=EventType.SINGLE_DATE,
        date=date(2024, 1, 1),
        time=time(14, 30),
        description="Test description",
    )
    assert event.name == "Test Event"
    assert event.event_type == EventType.SINGLE_DATE
    assert event.date == date(2024, 1, 1)
    assert event.time == time(14, 30)
    assert event.description == "Test description"

    # Valid cases with optional fields
    event = SingleDateEvent(
        name="Test Event", event_type=EventType.SINGLE_DATE, date=date(2024, 1, 1)
    )
    assert event.name == "Test Event"
    assert event.event_type == EventType.SINGLE_DATE
    assert event.date == date(2024, 1, 1)
    assert event.time is None
    assert event.description is None

    # Invalid cases
    with pytest.raises(ValueError):
        SingleDateEvent(
            name="", event_type=EventType.SINGLE_DATE, date=date(2024, 1, 1)
        )  # Empty name

    with pytest.raises(ValueError):
        SingleDateEvent(
            name="Test Event", event_type=EventType.SINGLE_DATE, date="2024-01-01"
        )  # String instead of date object


def test_date_range_event_validation():
    """Test DateRangeEvent model validation."""
    # Valid cases with all fields
    event = DateRangeEvent(
        name="Test Range Event",
        event_type=EventType.DATE_RANGE,
        startDate=date(2024, 1, 1),
        startTime=time(9, 0),
        endDate=date(2024, 1, 31),
        endTime=time(17, 0),
        description="Test range description",
    )
    assert event.name == "Test Range Event"
    assert event.event_type == EventType.DATE_RANGE
    assert event.start_date == date(2024, 1, 1)
    assert event.start_time == time(9, 0)
    assert event.end_date == date(2024, 1, 31)
    assert event.end_time == time(17, 0)
    assert event.description == "Test range description"

    # Valid cases with optional fields
    event = DateRangeEvent(
        name="Test Range Event",
        event_type=EventType.DATE_RANGE,
        startDate=date(2024, 1, 1),
        endDate=date(2024, 1, 31),
    )
    assert event.name == "Test Range Event"
    assert event.event_type == EventType.DATE_RANGE
    assert event.start_date == date(2024, 1, 1)
    assert event.start_time is None
    assert event.end_date == date(2024, 1, 31)
    assert event.end_time is None
    assert event.description is None


def test_other_event_validation():
    """Test OtherEvent model validation."""
    # Valid cases with all fields
    event = OtherEvent(
        name="Info Sessions",
        event_type=EventType.OTHER,
        details="Every other Tuesday at 10:00 AM",
        description="Info sessions for the opportunity",
    )
    assert event.name == "Info Sessions"
    assert event.event_type == EventType.OTHER
    assert event.details == "Every other Tuesday at 10:00 AM"
    assert event.description == "Info sessions for the opportunity"

    # Valid cases with optional fields
    event = OtherEvent(name="Info Sessions", event_type=EventType.OTHER)
    assert event.name == "Info Sessions"
    assert event.event_type == EventType.OTHER
    assert event.details is None
    assert event.description is None


def test_event_union_validation():
    """Test Event union type validation."""
    # Test SingleDateEvent
    single_event = SingleDateEvent(
        name="Test Event", event_type=EventType.SINGLE_DATE, date=date(2024, 1, 1)
    )
    assert isinstance(single_event, SingleDateEvent)

    # Test DateRangeEvent
    range_event = DateRangeEvent(
        name="Test Range",
        event_type=EventType.DATE_RANGE,
        startDate=date(2024, 1, 1),
        endDate=date(2024, 1, 31),
    )
    assert isinstance(range_event, DateRangeEvent)

    # Test OtherEvent
    other_event = OtherEvent(
        name="Test Other", event_type=EventType.OTHER, details="Test details"
    )
    assert isinstance(other_event, OtherEvent)


def test_custom_field_validation():
    """Test CustomField model validation."""
    # Valid cases for each type
    field = CustomField(
        name="string_field", fieldType=CustomFieldType.STRING, value="test"
    )
    assert field.name == "string_field"
    assert field.field_type == CustomFieldType.STRING
    assert field.value == "test"

    field = CustomField(
        name="number_field", fieldType=CustomFieldType.NUMBER, value=123
    )
    assert field.field_type == CustomFieldType.NUMBER
    assert field.value == 123

    field = CustomField(
        name="integer_field", fieldType=CustomFieldType.INTEGER, value=456
    )
    assert field.field_type == CustomFieldType.INTEGER
    assert field.value == 456

    field = CustomField(
        name="boolean_field", fieldType=CustomFieldType.BOOLEAN, value=True
    )
    assert field.field_type == CustomFieldType.BOOLEAN
    assert field.value is True

    # Valid case with schema URL
    field = CustomField(
        name="test",
        fieldType=CustomFieldType.STRING,
        value="test",
        schema="https://example.com/schema",
    )
    assert str(field.schema_url) == "https://example.com/schema"

    # Invalid cases
    with pytest.raises(ValueError):
        CustomField(
            name="", fieldType=CustomFieldType.STRING, value="test"
        )  # Empty name

    with pytest.raises(ValueError):
        CustomField(name="test", fieldType="invalid", value="test")

    with pytest.raises(ValueError):
        CustomField(
            name="test",
            fieldType=CustomFieldType.STRING,
            value="test",
            schema="not-a-url",
        )


def test_system_metadata_validation():
    """Test SystemMetadata model validation."""
    # Valid case - using aliases
    now = datetime.now(timezone.utc)
    metadata = SystemMetadata(
        createdAt=now,
        lastModifiedAt=now,
    )
    assert metadata.created_at == now
    assert metadata.last_modified_at == now

    # Test with model_validate
    metadata_data = {
        "createdAt": now,
        "lastModifiedAt": now,
    }
    metadata = SystemMetadata.model_validate(metadata_data)
    assert metadata.created_at == now
    assert metadata.last_modified_at == now

    # Test serialization with aliases
    data = metadata.model_dump(by_alias=True)
    assert "createdAt" in data
    assert "lastModifiedAt" in data
    assert data["createdAt"] == now
    assert data["lastModifiedAt"] == now
