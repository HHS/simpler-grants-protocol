"""Filter models for the CommonGrants API."""

from enum import StrEnum
from typing import Union

from pydantic import Field, field_validator

from ..base import CommonGrantsBaseModel

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
    NOT_IN = "notIn"


class StringOperator(StrEnum):
    """Operators that filter a field based on a string value."""

    LIKE = "like"
    NOT_LIKE = "notLike"


class RangeOperator(StrEnum):
    """Operators that filter a field based on a range of values."""

    BETWEEN = "between"
    OUTSIDE = "outside"


# ############################################################
# Models
# ############################################################


class DefaultFilter(CommonGrantsBaseModel):
    """Base class for all filters that matches Core v0.1.0 DefaultFilter structure."""

    operator: Union[
        EquivalenceOperator,
        ComparisonOperator,
        ArrayOperator,
        StringOperator,
        RangeOperator,
    ] = Field(..., description="The operator to apply to the filter value")
    value: Union[str, int, float, list, dict] = Field(
        ...,
        description="The value to use for the filter operation",
    )

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            # Try to match against each operator type
            for operator_class in [
                EquivalenceOperator,
                ComparisonOperator,
                ArrayOperator,
                StringOperator,
                RangeOperator,
            ]:
                try:
                    return operator_class(v)
                except ValueError:
                    continue
            # If no match found, raise ValueError
            raise ValueError(f"Invalid operator: {v}")
        return v
