"""Tests for the base filter models."""

from common_grants.schemas.filters.base import (
    ArrayOperator,
    ComparisonOperator,
    DefaultFilter,
    RangeOperator,
    StringOperator,
)


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


def test_default_filter():
    """Test the DefaultFilter model."""
    filter_obj = DefaultFilter()
    assert isinstance(filter_obj, DefaultFilter)
