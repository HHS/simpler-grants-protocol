"""String filter schemas."""

from pydantic import Field

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


class StringComparisonFilter(CommonGrantsBaseModel):
    """Filter that applies a comparison to a string value."""

    operator: EquivalenceOperator | StringOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: str = Field(..., description="The string value to compare against")
