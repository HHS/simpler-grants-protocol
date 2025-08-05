"""String filter schemas."""

from pydantic import Field, field_validator

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from .base import (
    ArrayOperator,
    EquivalenceOperator,
    StringOperator,
)


class StringArrayFilter(CommonGrantsBaseModel):
    """Filter that matches against an array of string values."""

    operator: ArrayOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: list[str] = Field(..., description="The array of string values")

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            return ArrayOperator(v)
        return v


class StringComparisonFilter(CommonGrantsBaseModel):
    """Filter that applies a comparison to a string value."""

    operator: EquivalenceOperator | StringOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: str = Field(..., description="The string value to compare against")

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            if v in [op.value for op in EquivalenceOperator]:
                return EquivalenceOperator(v)
            elif v in [op.value for op in StringOperator]:
                return StringOperator(v)
        return v
