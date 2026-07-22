"""Boolean filter schemas."""

from pydantic import Field, StrictBool, field_validator

from ..base import CommonGrantsBaseModel
from .base import EquivalenceOperator


class BooleanComparisonFilter(CommonGrantsBaseModel):
    """Filter that matches a boolean value for equality (eq | neq).

    Strict boolean: 1/0 and "true"/"false" are rejected, matching the Zod
    ``z.boolean()`` semantics of the TS SDK's ``BooleanComparisonFilterSchema``.

    No spec model backs this filter yet: the core spec defines no boolean
    filter, so both SDKs carry an SDK-level model until one lands.
    """

    operator: EquivalenceOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: StrictBool = Field(..., description="The boolean value to compare against")

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            return EquivalenceOperator(v)
        return v
