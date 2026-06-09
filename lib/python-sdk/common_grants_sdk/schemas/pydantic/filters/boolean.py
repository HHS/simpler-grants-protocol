"""Boolean filter schemas."""

from pydantic import Field, field_validator

from ..base import CommonGrantsBaseModel
from .base import EquivalenceOperator


class BooleanComparisonFilter(CommonGrantsBaseModel):
    """Filter that matches a boolean value for equality (eq | neq)."""

    operator: EquivalenceOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: bool = Field(..., description="The boolean value to compare against")

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            return EquivalenceOperator(v)
        return v
