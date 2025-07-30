"""Tests for filter schemas in the CommonGrants SDK."""

from datetime import date
import pytest

from common_grants_sdk.schemas.filters.base import (
    ArrayOperator,
    ComparisonOperator,
    DefaultFilter,
    EquivalenceOperator,
    RangeOperator,
    StringOperator,
)
from common_grants_sdk.schemas.filters.string import (
    StringArrayFilter,
    StringComparisonFilter,
)
from common_grants_sdk.schemas.filters.date import (
    DateRange,
    DateRangeFilter,
    DateComparisonFilter,
)
from common_grants_sdk.schemas.filters.money import (
    MoneyRange,
    MoneyRangeFilter,
    MoneyComparisonFilter,
)
from common_grants_sdk.schemas.fields import Money


def test_filter_operators():
    """Test the filter operator enums."""
    # Test array operators
    assert ArrayOperator.IN == "in"
    assert ArrayOperator.NOT_IN == "not_in"

    # Test comparison operators
    assert ComparisonOperator.GREATER_THAN == "gt"
    assert ComparisonOperator.GREATER_THAN_OR_EQUAL == "gte"
    assert ComparisonOperator.LESS_THAN == "lt"
    assert ComparisonOperator.LESS_THAN_OR_EQUAL == "lte"

    # Test string operators
    assert StringOperator.LIKE == "like"
    assert StringOperator.NOT_LIKE == "not_like"

    # Test range operators
    assert RangeOperator.BETWEEN == "between"
    assert RangeOperator.OUTSIDE == "outside"

    # Test equivalence operators
    assert EquivalenceOperator.EQUAL == "eq"
    assert EquivalenceOperator.NOT_EQUAL == "neq"


def test_default_filter():
    """Test the DefaultFilter model."""
    # Test with equivalence operator
    filter_obj = DefaultFilter(operator=EquivalenceOperator.EQUAL, value="test")
    assert filter_obj.operator == EquivalenceOperator.EQUAL
    assert filter_obj.value == "test"

    # Test with comparison operator
    filter_obj = DefaultFilter(operator=ComparisonOperator.GREATER_THAN, value=100)
    assert filter_obj.operator == ComparisonOperator.GREATER_THAN
    assert filter_obj.value == 100

    # Test with array operator
    filter_obj = DefaultFilter(operator=ArrayOperator.IN, value=["a", "b", "c"])
    assert filter_obj.operator == ArrayOperator.IN
    assert filter_obj.value == ["a", "b", "c"]


def test_string_array_filter():
    """Test the StringArrayFilter model."""
    # Test IN operator
    filter_obj = StringArrayFilter(operator=ArrayOperator.IN, value=["open", "closed"])
    assert filter_obj.operator == ArrayOperator.IN
    assert filter_obj.value == ["open", "closed"]

    # Test NOT_IN operator
    filter_obj = StringArrayFilter(operator=ArrayOperator.NOT_IN, value=["draft"])
    assert filter_obj.operator == ArrayOperator.NOT_IN
    assert filter_obj.value == ["draft"]


def test_string_comparison_filter():
    """Test the StringComparisonFilter model."""
    # Test equivalence operators
    filter_obj = StringComparisonFilter(
        operator=EquivalenceOperator.EQUAL, value="test"
    )
    assert filter_obj.operator == EquivalenceOperator.EQUAL
    assert filter_obj.value == "test"

    filter_obj = StringComparisonFilter(
        operator=EquivalenceOperator.NOT_EQUAL, value="test"
    )
    assert filter_obj.operator == EquivalenceOperator.NOT_EQUAL
    assert filter_obj.value == "test"

    # Test string operators
    filter_obj = StringComparisonFilter(operator=StringOperator.LIKE, value="test%")
    assert filter_obj.operator == StringOperator.LIKE
    assert filter_obj.value == "test%"

    filter_obj = StringComparisonFilter(operator=StringOperator.NOT_LIKE, value="test%")
    assert filter_obj.operator == StringOperator.NOT_LIKE
    assert filter_obj.value == "test%"


def test_date_range():
    """Test the DateRange model."""
    # Test with both min and max
    date_range = DateRange(
        min=date(2024, 1, 1),
        max=date(2024, 12, 31),
    )
    assert date_range.min == date(2024, 1, 1)
    assert date_range.max == date(2024, 12, 31)

    # Test with only min
    date_range = DateRange(min=date(2024, 1, 1))
    assert date_range.min == date(2024, 1, 1)
    assert date_range.max is None

    # Test with only max
    date_range = DateRange(max=date(2024, 12, 31))
    assert date_range.min is None
    assert date_range.max == date(2024, 12, 31)


def test_date_range_filter():
    """Test the DateRangeFilter model."""
    date_range = DateRange(
        min=date(2024, 1, 1),
        max=date(2024, 12, 31),
    )

    # Test BETWEEN operator
    filter_obj = DateRangeFilter(operator=RangeOperator.BETWEEN, value=date_range)
    assert filter_obj.operator == RangeOperator.BETWEEN
    assert filter_obj.value.min == date(2024, 1, 1)
    assert filter_obj.value.max == date(2024, 12, 31)

    # Test OUTSIDE operator
    filter_obj = DateRangeFilter(operator=RangeOperator.OUTSIDE, value=date_range)
    assert filter_obj.operator == RangeOperator.OUTSIDE


def test_date_comparison_filter():
    """Test the DateComparisonFilter model."""
    test_date = date(2024, 6, 15)

    # Test GREATER_THAN
    filter_obj = DateComparisonFilter(
        operator=ComparisonOperator.GREATER_THAN, value=test_date
    )
    assert filter_obj.operator == ComparisonOperator.GREATER_THAN
    assert filter_obj.value == test_date

    # Test LESS_THAN
    filter_obj = DateComparisonFilter(
        operator=ComparisonOperator.LESS_THAN, value=test_date
    )
    assert filter_obj.operator == ComparisonOperator.LESS_THAN
    assert filter_obj.value == test_date


def test_money_range():
    """Test the MoneyRange model."""
    min_money = Money(amount="1000.00", currency="USD")
    max_money = Money(amount="5000.00", currency="USD")

    # Test with Money objects
    money_range = MoneyRange(min=min_money, max=max_money)
    assert money_range.min.amount == "1000.00"
    assert money_range.min.currency == "USD"
    assert money_range.max.amount == "5000.00"
    assert money_range.max.currency == "USD"

    # Test with dict values
    money_range = MoneyRange(
        min={"amount": "1000.00", "currency": "USD"},
        max={"amount": "5000.00", "currency": "USD"},
    )
    assert money_range.min.amount == "1000.00"
    assert money_range.max.amount == "5000.00"

    # Test validation errors
    with pytest.raises(ValueError, match="min and max are required"):
        MoneyRange(min=None, max=None)

    with pytest.raises(
        ValueError, match="Value must be either a Money object or a dict"
    ):
        MoneyRange(min="invalid", max=max_money)


def test_money_range_filter():
    """Test the MoneyRangeFilter model."""
    min_money = Money(amount="1000.00", currency="USD")
    max_money = Money(amount="5000.00", currency="USD")
    money_range = MoneyRange(min=min_money, max=max_money)

    # Test BETWEEN operator
    filter_obj = MoneyRangeFilter(operator=RangeOperator.BETWEEN, value=money_range)
    assert filter_obj.operator == RangeOperator.BETWEEN
    assert filter_obj.value.min.amount == "1000.00"
    assert filter_obj.value.max.amount == "5000.00"

    # Test OUTSIDE operator
    filter_obj = MoneyRangeFilter(operator=RangeOperator.OUTSIDE, value=money_range)
    assert filter_obj.operator == RangeOperator.OUTSIDE

    # Test validation error for BETWEEN with None values
    with pytest.raises(ValueError, match="min and max are required"):
        invalid_range = MoneyRange(min=None, max=None)
        MoneyRangeFilter(operator=RangeOperator.BETWEEN, value=invalid_range)


def test_money_comparison_filter():
    """Test the MoneyComparisonFilter model."""
    money = Money(amount="1000.00", currency="USD")

    # Test GREATER_THAN
    filter_obj = MoneyComparisonFilter(
        operator=ComparisonOperator.GREATER_THAN, value=money
    )
    assert filter_obj.operator == ComparisonOperator.GREATER_THAN
    assert filter_obj.value.amount == "1000.00"
    assert filter_obj.value.currency == "USD"

    # Test LESS_THAN
    filter_obj = MoneyComparisonFilter(
        operator=ComparisonOperator.LESS_THAN, value=money
    )
    assert filter_obj.operator == ComparisonOperator.LESS_THAN
    assert filter_obj.value.amount == "1000.00"
