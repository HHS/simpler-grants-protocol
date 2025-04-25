"""Tests for field validation in the CommonGrants schema."""

import pytest
from datetime import date, time
from pydantic import HttpUrl

from common_grants.schemas.fields import (
    validate_decimal_string,
    DecimalString,
    Money,
    Event,
    CustomField,
    CustomFieldType,
)


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
    
    # Invalid currency codes
    with pytest.raises(ValueError):
        Money(amount="100.00", currency="USDD")  # Too long
    
    with pytest.raises(ValueError):
        Money(amount="100.00", currency="usd")   # Lowercase
    
    with pytest.raises(ValueError):
        Money(amount="100.00", currency="12")    # Numbers
    
    with pytest.raises(ValueError):
        Money(amount="100.00", currency="")      # Empty
    
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


def test_event_validation():
    """Test Event model validation."""
    # Valid cases with all fields
    event = Event(
        name="Test Event",
        date=date(2024, 1, 1),
        time=time(14, 30),
        description="Test description"
    )
    assert event.name == "Test Event"
    assert event.date == date(2024, 1, 1)
    assert event.time == time(14, 30)
    assert event.description == "Test description"
    
    # Valid cases with optional fields
    event = Event(
        name="Test Event",
        date=date(2024, 1, 1)
    )
    assert event.name == "Test Event"
    assert event.date == date(2024, 1, 1)
    assert event.time is None
    assert event.description is None
    
    # Invalid cases
    with pytest.raises(ValueError):
        Event(
            name="",  # Empty name
            date=date(2024, 1, 1)
        )
    
    with pytest.raises(ValueError):
        Event(
            name="Test Event",
            date="2024-01-01"  # String instead of date object
        )


def test_custom_field_validation():
    """Test CustomField model validation."""
    # Valid cases for each type
    field = CustomField(
        name="string_field",
        type=CustomFieldType.STRING,
        value="test"
    )
    assert field.name == "string_field"
    assert field.type == CustomFieldType.STRING
    assert field.value == "test"
    
    field = CustomField(
        name="number_field",
        type=CustomFieldType.NUMBER,
        value=123
    )
    assert field.type == CustomFieldType.NUMBER
    assert field.value == 123
    
    field = CustomField(
        name="boolean_field",
        type=CustomFieldType.BOOLEAN,
        value=True
    )
    assert field.type == CustomFieldType.BOOLEAN
    assert field.value is True
    
    # Valid case with schema URL
    field = CustomField(
        name="test",
        type=CustomFieldType.STRING,
        value="test",
        schema="https://example.com/schema"
    )
    assert str(field.schema_url) == "https://example.com/schema"
    
    # Invalid cases
    with pytest.raises(ValueError):
        CustomField(
            name="",  # Empty name
            type=CustomFieldType.STRING,
            value="test"
        )
    
    with pytest.raises(ValueError):
        CustomField(
            name="test",
            type="invalid",
            value="test"
        )
    
    with pytest.raises(ValueError):
        CustomField(
            name="test",
            type=CustomFieldType.STRING,
            value="test",
            schema="not-a-url"
        ) 
