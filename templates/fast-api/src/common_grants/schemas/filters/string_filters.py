"""String filter schemas."""

from pydantic import BaseModel, Field

from common_grants.schemas.filters.base import ArrayOperator


class StringArrayFilter(BaseModel):
    """Filter that matches against an array of string values."""

    operator: ArrayOperator = Field(
        ...,
        description="The operator to apply to the filter",
        examples=[ArrayOperator.IN, ArrayOperator.NOT_IN],
    )
    value: list[str] = Field(
        ...,
        description="The values to filter by",
        examples=[["foo", "bar"], ["baz", "qux"]],
    )
