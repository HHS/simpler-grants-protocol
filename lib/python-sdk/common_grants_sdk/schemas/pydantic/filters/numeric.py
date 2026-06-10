"""Numeric filter schemas."""

from typing import Union

from pydantic import Field, StrictInt, field_validator

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


class NumberRange(CommonGrantsBaseModel):
    """Represents a range between two numeric values."""

    min: Union[int, float] = Field(..., description="The minimum value in the range")
    max: Union[int, float] = Field(..., description="The maximum value in the range")


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


class IntegerComparisonFilter(CommonGrantsBaseModel):
    """Filter that matches integers against a specific value.

    Operator surface matches ``NumberComparisonFilter`` (comparison plus
    ``eq``/``neq``), as in the TS SDK's IntegerComparisonFilterSchema.

    Strict integer: fractional values and numeric strings are rejected, as in
    the TS SDK (``z.number().int()``). Stricter than TS on integral floats:
    ``100.0`` is rejected here but is indistinguishable from ``100`` in
    JavaScript.
    """

    operator: ComparisonOperator | EquivalenceOperator = Field(
        ...,
        description="The comparison operator to apply to the filter value",
    )
    value: StrictInt = Field(..., description="The integer value to compare against")

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
