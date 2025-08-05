"""Numeric filter schemas."""

from typing import Union

from pydantic import Field, field_validator

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from .base import (
    ArrayOperator,
    ComparisonOperator,
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
    """Filter that matches numbers against a specific value."""

    operator: ComparisonOperator = Field(
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
            return ComparisonOperator(v)
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
