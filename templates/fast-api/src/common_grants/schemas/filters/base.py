"""Filter models for the CommonGrants API."""

from enum import StrEnum

from pydantic import BaseModel

# ############################################################
# Enums
# ############################################################


class EquivalenceOperator(StrEnum):
    """The operator to apply to the filter."""

    EQUAL = "eq"
    NOT_EQUAL = "neq"


class ComparisonOperator(StrEnum):
    """Operators that filter a field based on a comparison to a value."""

    GREATER_THAN = "gt"
    GREATER_THAN_OR_EQUAL = "gte"
    LESS_THAN = "lt"
    LESS_THAN_OR_EQUAL = "lte"


class ArrayOperator(StrEnum):
    """Operators that filter a field based on an array of values."""

    IN = "in"
    NOT_IN = "not_in"


class StringOperator(StrEnum):
    """Operators that filter a field based on a string value."""

    LIKE = "like"
    NOT_LIKE = "not_like"


class RangeOperator(StrEnum):
    """Operators that filter a field based on a range of values."""

    BETWEEN = "between"
    OUTSIDE = "outside"


# ############################################################
# Models
# ############################################################


class DefaultFilter(BaseModel):
    """Base class for all filters."""
