"""Integer filter schemas."""

from pydantic import Field, field_validator

from ..base import CommonGrantsBaseModel
from .base import ComparisonOperator, EquivalenceOperator

# ############################################################
# Models
# ############################################################


class IntegerComparisonFilter(CommonGrantsBaseModel):
    """Filter that matches an integer against a value.

    Accepts comparison operators (``gt``/``gte``/``lt``/``lte``) and equivalence
    operators (``eq``/``neq``). The value must be an integer: a non-integral value
    (e.g. 3.5) or a bool is rejected. Implements the core spec's
    IntegerComparisonFilter (filters/numeric.tsp).
    """

    operator: ComparisonOperator | EquivalenceOperator = Field(
        ...,
        description="The comparison operator to apply to the filter value",
    )
    value: int = Field(..., description="The integer value to compare against")

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
        """Reject bool (bool subclasses int, so True would ship as 1)."""
        if isinstance(v, bool):
            raise ValueError("value must be an integer, not a bool")
        return v
