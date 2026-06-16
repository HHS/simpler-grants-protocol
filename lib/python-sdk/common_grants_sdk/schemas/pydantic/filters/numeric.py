"""Numeric filter schemas."""

from typing import Union

from pydantic import Field, field_validator

from ..base import CommonGrantsBaseModel
from .base import (
    ArrayOperator,
    ComparisonOperator,
    EquivalenceOperator,
    RangeOperator,
)

# ############################################################
# Models
# ############################################################


def _ensure_not_bool(v: object) -> object:
    """Reject bool before union coercion.

    bool subclasses int in Python, so a ``Union[int, float]`` field
    lax-coerces ``True`` -> ``1`` and a boolean silently ships as a number —
    the same wire corruption ``DefaultFilter.value: Any`` guards against.
    ``z.number()`` rejects booleans, so rejection keeps the SDKs aligned.
    """
    if isinstance(v, bool):
        raise ValueError("value must be a number, not a bool")
    return v


class NumberRange(CommonGrantsBaseModel):
    """Represents a range between two numeric values."""

    min: Union[int, float] = Field(..., description="The minimum value in the range")
    max: Union[int, float] = Field(..., description="The maximum value in the range")

    @field_validator("min", "max", mode="before")
    @classmethod
    def reject_bool(cls, v):
        """Reject bool min/max (would lax-coerce to 1/0; see _ensure_not_bool)."""
        return _ensure_not_bool(v)


class NumberComparisonFilter(CommonGrantsBaseModel):
    """Filter that matches numbers against a specific value.

    Accepts equivalence operators (``eq``/``neq``) in addition to comparison
    operators, per the core spec (filters/numeric.tsp, since protocol v0.3).
    """

    operator: ComparisonOperator | EquivalenceOperator = Field(
        ...,
        description="The comparison operator to apply to the filter value",
    )
    value: Union[int, float] = Field(
        ..., description="The numeric value to compare against"
    )

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            if v in [op.value for op in ComparisonOperator]:
                return ComparisonOperator(v)
            elif v in [op.value for op in EquivalenceOperator]:
                return EquivalenceOperator(v)
        return v

    @field_validator("value", mode="before")
    @classmethod
    def reject_bool(cls, v):
        """Reject bool values (would lax-coerce to 1/0; see _ensure_not_bool)."""
        return _ensure_not_bool(v)


class NumberRangeFilter(CommonGrantsBaseModel):
    """Filter that matches numbers within a specified range."""

    operator: RangeOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: NumberRange = Field(..., description="The numeric range value")

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            return RangeOperator(v)
        return v


class NumberArrayFilter(CommonGrantsBaseModel):
    """Filter that matches against an array of numeric values."""

    operator: ArrayOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: list[Union[int, float]] = Field(
        ..., description="The array of numeric values"
    )

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            return ArrayOperator(v)
        return v

    @field_validator("value", mode="before")
    @classmethod
    def reject_bool_items(cls, v):
        """Reject bool items (each would lax-coerce to 1/0; see _ensure_not_bool)."""
        if isinstance(v, list):
            for item in v:
                _ensure_not_bool(item)
        return v
