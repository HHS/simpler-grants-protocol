"""Tests for string filter models."""

from common_grants.schemas.filters.base import ArrayOperator
from common_grants.schemas.filters.string_filters import StringArrayFilter


def test_string_array_filter():
    """Test the StringArrayFilter model."""
    filter_obj = StringArrayFilter(operator=ArrayOperator.IN, value=["open", "closed"])
    assert filter_obj.operator == "in"
    assert filter_obj.value == ["open", "closed"]

    filter_obj = StringArrayFilter(operator=ArrayOperator.NOT_IN, value=["draft"])
    assert filter_obj.operator == "not_in"
    assert filter_obj.value == ["draft"]
