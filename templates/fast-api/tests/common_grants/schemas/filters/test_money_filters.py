"""Tests for money filter models."""

from common_grants_sdk.schemas.fields import Money

from common_grants.schemas.filters.base import RangeOperator
from common_grants.schemas.filters.money_filters import MoneyRange, MoneyRangeFilter


def test_money_range():
    """Test the MoneyRange model."""
    money_range = MoneyRange(
        min=Money(amount="1000.00", currency="USD"),
        max=Money(amount="5000.00", currency="USD"),
    )
    assert money_range.min is not None
    assert money_range.min.amount == "1000.00"
    assert money_range.max is not None
    assert money_range.max.amount == "5000.00"


def test_money_range_filter():
    """Test the MoneyRangeFilter model."""
    filter_obj = MoneyRangeFilter(
        operator=RangeOperator.BETWEEN,
        value=MoneyRange(
            min=Money(amount="1000.00", currency="USD"),
            max=Money(amount="5000.00", currency="USD"),
        ),
    )
    assert filter_obj.operator == "between"
    assert filter_obj.value.min is not None
    assert filter_obj.value.min.amount == "1000.00"
    assert filter_obj.value.max is not None
    assert filter_obj.value.max.amount == "5000.00"

    filter_obj = MoneyRangeFilter(
        operator=RangeOperator.OUTSIDE,
        value=MoneyRange(
            min=Money(amount="1000.00", currency="USD"),
            max=Money(amount="5000.00", currency="USD"),
        ),
    )
    assert filter_obj.operator == "outside"
