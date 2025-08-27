"""Tests for filter schemas in the CommonGrants SDK."""

from datetime import date
import pytest

from common_grants_sdk.schemas.pydantic.filters.base import (
    ArrayOperator,
    ComparisonOperator,
    DefaultFilter,
    EquivalenceOperator,
    RangeOperator,
    StringOperator,
)
from common_grants_sdk.schemas.pydantic.filters.string import (
    StringArrayFilter,
    StringComparisonFilter,
)
from common_grants_sdk.schemas.pydantic.filters.date import (
    DateRange,
    DateRangeFilter,
    DateComparisonFilter,
)
from common_grants_sdk.schemas.pydantic.filters.money import (
    MoneyRange,
    MoneyRangeFilter,
    MoneyComparisonFilter,
    InvalidMoneyValueError,
)
from common_grants_sdk.schemas.pydantic.filters.numeric import (
    NumberArrayFilter,
    NumberComparisonFilter,
    NumberRange,
    NumberRangeFilter,
)
from common_grants_sdk.schemas.pydantic.fields import Money


def test_filter_operators():
    """Test the filter operator enums."""
    # Test array operators
    assert ArrayOperator.IN == "in"
    assert ArrayOperator.NOT_IN == "notIn"

    # Test comparison operators
    assert ComparisonOperator.GREATER_THAN == "gt"
    assert ComparisonOperator.GREATER_THAN_OR_EQUAL == "gte"
    assert ComparisonOperator.LESS_THAN == "lt"
    assert ComparisonOperator.LESS_THAN_OR_EQUAL == "lte"

    # Test string operators
    assert StringOperator.LIKE == "like"
    assert StringOperator.NOT_LIKE == "notLike"

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


def test_default_filter_edge_cases():
    """Test DefaultFilter with various edge cases and value types."""
    # Test with dict value
    filter_obj = DefaultFilter(
        operator=EquivalenceOperator.EQUAL, value={"key": "value"}
    )
    assert filter_obj.operator == EquivalenceOperator.EQUAL
    assert filter_obj.value == {"key": "value"}

    # Test with empty list
    filter_obj = DefaultFilter(operator=ArrayOperator.IN, value=[])
    assert filter_obj.operator == ArrayOperator.IN
    assert filter_obj.value == []

    # Test with float value
    filter_obj = DefaultFilter(operator=ComparisonOperator.GREATER_THAN, value=3.14)
    assert filter_obj.operator == ComparisonOperator.GREATER_THAN
    assert filter_obj.value == 3.14

    # Test with boolean-like string
    filter_obj = DefaultFilter(operator=EquivalenceOperator.EQUAL, value="true")
    assert filter_obj.operator == EquivalenceOperator.EQUAL
    assert filter_obj.value == "true"


def test_default_filter_string_operators():
    """Test DefaultFilter with string operators."""
    # Test with string equivalence operator
    filter_obj = DefaultFilter(operator="eq", value="test")
    assert filter_obj.operator == EquivalenceOperator.EQUAL
    assert filter_obj.value == "test"

    # Test with string comparison operator
    filter_obj = DefaultFilter(operator="gt", value=100)
    assert filter_obj.operator == ComparisonOperator.GREATER_THAN
    assert filter_obj.value == 100

    # Test with string array operator
    filter_obj = DefaultFilter(operator="in", value=["a", "b", "c"])
    assert filter_obj.operator == ArrayOperator.IN
    assert filter_obj.value == ["a", "b", "c"]

    # Test with string range operator
    filter_obj = DefaultFilter(operator="between", value={"min": 1, "max": 10})
    assert filter_obj.operator == RangeOperator.BETWEEN
    assert filter_obj.value == {"min": 1, "max": 10}

    # Test with string string operator
    filter_obj = DefaultFilter(operator="like", value="pattern")
    assert filter_obj.operator == StringOperator.LIKE
    assert filter_obj.value == "pattern"


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


def test_string_filters_edge_cases():
    """Test StringArrayFilter and StringComparisonFilter edge cases."""
    # Test empty string array
    filter_obj = StringArrayFilter(operator=ArrayOperator.IN, value=[])
    assert filter_obj.operator == ArrayOperator.IN
    assert filter_obj.value == []

    # Test single item array
    filter_obj = StringArrayFilter(operator=ArrayOperator.NOT_IN, value=["single"])
    assert filter_obj.operator == ArrayOperator.NOT_IN
    assert filter_obj.value == ["single"]

    # Test empty string
    filter_obj = StringComparisonFilter(operator=EquivalenceOperator.EQUAL, value="")
    assert filter_obj.operator == EquivalenceOperator.EQUAL
    assert filter_obj.value == ""

    # Test whitespace string
    filter_obj = StringComparisonFilter(operator=StringOperator.LIKE, value="   ")
    assert filter_obj.operator == StringOperator.LIKE
    assert filter_obj.value == "   "


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


def test_date_range_string_dates():
    """Test the DateRange model with string dates."""
    # Test with string dates
    date_range = DateRange(
        min="2024-01-01",
        max="2024-12-31",
    )
    assert date_range.min == date(2024, 1, 1)
    assert date_range.max == date(2024, 12, 31)

    # Test with only string min
    date_range = DateRange(min="2024-01-01")
    assert date_range.min == date(2024, 1, 1)
    assert date_range.max is None

    # Test with only string max
    date_range = DateRange(max="2024-12-31")
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


def test_date_filters_edge_cases():
    """Test date filter edge cases."""
    # Test same min and max date
    same_date = date(2024, 6, 15)
    date_range = DateRange(min=same_date, max=same_date)
    assert date_range.min == same_date
    assert date_range.max == same_date

    # Test date comparison with edge dates
    edge_date = date(2024, 1, 1)
    filter_obj = DateComparisonFilter(
        operator=ComparisonOperator.GREATER_THAN_OR_EQUAL, value=edge_date
    )
    assert filter_obj.operator == ComparisonOperator.GREATER_THAN_OR_EQUAL
    assert filter_obj.value == edge_date

    # Test all comparison operators for dates
    operators = [
        ComparisonOperator.GREATER_THAN,
        ComparisonOperator.GREATER_THAN_OR_EQUAL,
        ComparisonOperator.LESS_THAN,
        ComparisonOperator.LESS_THAN_OR_EQUAL,
    ]

    test_date = date(2024, 6, 15)
    for operator in operators:
        filter_obj = DateComparisonFilter(operator=operator, value=test_date)
        assert filter_obj.operator == operator
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


def test_money_range_validation_errors():
    """Test MoneyRange validation error cases."""
    # Test with None values
    with pytest.raises(ValueError, match="min and max are required"):
        MoneyRange(min=None, max=None)

    with pytest.raises(ValueError, match="min and max are required"):
        MoneyRange(min=None, max=Money(amount="1000.00", currency="USD"))

    with pytest.raises(ValueError, match="min and max are required"):
        MoneyRange(min=Money(amount="1000.00", currency="USD"), max=None)

    # Test with invalid types - Pydantic wraps our custom error in ValidationError
    from pydantic import ValidationError

    with pytest.raises(ValidationError) as exc_info:
        MoneyRange(min="invalid", max=Money(amount="1000.00", currency="USD"))
    assert "Value must be either a Money object or a dict" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        MoneyRange(min=Money(amount="1000.00", currency="USD"), max=123)
    assert "Value must be either a Money object or a dict" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        MoneyRange(min=[], max=Money(amount="1000.00", currency="USD"))
    assert "Value must be either a Money object or a dict" in str(exc_info.value)


def test_money_range_filter_validation():
    """Test MoneyRangeFilter validation scenarios."""
    # Test BETWEEN operator with None values (should be caught by MoneyRange validation)
    with pytest.raises(ValueError, match="min and max are required"):
        invalid_range = MoneyRange(min=None, max=None)
        MoneyRangeFilter(operator=RangeOperator.BETWEEN, value=invalid_range)

    # Test valid BETWEEN operator
    valid_range = MoneyRange(
        min=Money(amount="1000.00", currency="USD"),
        max=Money(amount="5000.00", currency="USD"),
    )
    filter_obj = MoneyRangeFilter(operator=RangeOperator.BETWEEN, value=valid_range)
    assert filter_obj.operator == RangeOperator.BETWEEN
    assert filter_obj.value.min.amount == "1000.00"
    assert filter_obj.value.max.amount == "5000.00"


def test_invalid_money_value_error():
    """Test the InvalidMoneyValueError exception."""
    error = InvalidMoneyValueError()
    assert str(error) == "Value must be either a Money object or a dict"
    assert isinstance(error, ValueError)


def test_number_range():
    """Test the NumberRange model."""
    # Test with integers
    number_range = NumberRange(min=1, max=100)
    assert number_range.min == 1
    assert number_range.max == 100

    # Test with floats
    number_range = NumberRange(min=1.5, max=99.9)
    assert number_range.min == 1.5
    assert number_range.max == 99.9

    # Test with mixed types
    number_range = NumberRange(min=1, max=100.0)
    assert number_range.min == 1
    assert number_range.max == 100.0


def test_number_range_filter():
    """Test the NumberRangeFilter model."""
    number_range = NumberRange(min=1, max=100)

    # Test BETWEEN operator
    filter_obj = NumberRangeFilter(operator=RangeOperator.BETWEEN, value=number_range)
    assert filter_obj.operator == RangeOperator.BETWEEN
    assert filter_obj.value.min == 1
    assert filter_obj.value.max == 100

    # Test OUTSIDE operator
    filter_obj = NumberRangeFilter(operator=RangeOperator.OUTSIDE, value=number_range)
    assert filter_obj.operator == RangeOperator.OUTSIDE
    assert filter_obj.value.min == 1
    assert filter_obj.value.max == 100


def test_number_comparison_filter():
    """Test the NumberComparisonFilter model."""
    # Test with integers
    filter_obj = NumberComparisonFilter(
        operator=ComparisonOperator.GREATER_THAN, value=100
    )
    assert filter_obj.operator == ComparisonOperator.GREATER_THAN
    assert filter_obj.value == 100

    # Test with floats
    filter_obj = NumberComparisonFilter(
        operator=ComparisonOperator.LESS_THAN, value=99.5
    )
    assert filter_obj.operator == ComparisonOperator.LESS_THAN
    assert filter_obj.value == 99.5

    # Test all comparison operators
    operators = [
        ComparisonOperator.GREATER_THAN,
        ComparisonOperator.GREATER_THAN_OR_EQUAL,
        ComparisonOperator.LESS_THAN,
        ComparisonOperator.LESS_THAN_OR_EQUAL,
    ]

    for operator in operators:
        filter_obj = NumberComparisonFilter(operator=operator, value=50)
        assert filter_obj.operator == operator
        assert filter_obj.value == 50


def test_number_array_filter():
    """Test the NumberArrayFilter model."""
    # Test with integers
    filter_obj = NumberArrayFilter(operator=ArrayOperator.IN, value=[1, 2, 3, 4, 5])
    assert filter_obj.operator == ArrayOperator.IN
    assert filter_obj.value == [1, 2, 3, 4, 5]

    # Test with floats
    filter_obj = NumberArrayFilter(operator=ArrayOperator.NOT_IN, value=[1.5, 2.5, 3.5])
    assert filter_obj.operator == ArrayOperator.NOT_IN
    assert filter_obj.value == [1.5, 2.5, 3.5]

    # Test with mixed types
    filter_obj = NumberArrayFilter(operator=ArrayOperator.IN, value=[1, 2.5, 3])
    assert filter_obj.operator == ArrayOperator.IN
    assert filter_obj.value == [1, 2.5, 3]
