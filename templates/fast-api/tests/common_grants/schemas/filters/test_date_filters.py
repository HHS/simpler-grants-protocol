"""Tests for date filter models."""

from datetime import date

from common_grants.schemas.filters.base import RangeOperator
from common_grants.schemas.filters.date_filters import DateRange, DateRangeFilter


def test_date_range():
    """Test the DateRange model."""
    date_range = DateRange(
        min=date(2024, 1, 1),
        max=date(2024, 12, 31),
    )
    assert date_range.min == date(2024, 1, 1)
    assert date_range.max == date(2024, 12, 31)


def test_date_range_filter():
    """Test the DateRangeFilter model."""
    filter_obj = DateRangeFilter(
        operator=RangeOperator.BETWEEN,
        value=DateRange(
            min=date(2024, 1, 1),
            max=date(2024, 12, 31),
        ),
    )
    assert filter_obj.operator == "between"
    assert filter_obj.value.min == date(2024, 1, 1)
    assert filter_obj.value.max == date(2024, 12, 31)

    filter_obj = DateRangeFilter(
        operator=RangeOperator.OUTSIDE,
        value=DateRange(
            min=date(2024, 1, 1),
            max=date(2024, 12, 31),
        ),
    )
    assert filter_obj.operator == "outside"
