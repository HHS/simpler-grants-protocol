"""Money filter schemas."""

from typing import Optional

from common_grants_sdk.schemas.fields import Money
from pydantic import BaseModel, Field, field_validator

from common_grants.schemas.filters.base import ComparisonOperator, RangeOperator


class InvalidMoneyValueError(ValueError):
    """Raised when a value cannot be converted to a Money object."""

    def __init__(self) -> None:
        """Initialize the error with a descriptive message."""
        super().__init__("Value must be either a Money object or a dict")


class MoneyRange(BaseModel):
    """Range filter for money values."""

    min: Money = Field(..., description="The minimum amount in the range")
    max: Money = Field(..., description="The maximum amount in the range")

    @field_validator("min", "max", mode="before")
    @classmethod
    def validate_money(cls, v: Optional[dict | Money]) -> Money:
        """Convert dict to Money objects if needed."""
        if v is None:
            raise ValueError("min and max are required")
        if isinstance(v, Money):
            return v
        if isinstance(v, dict):
            return Money(**v)
        raise InvalidMoneyValueError


class MoneyRangeFilter(BaseModel):
    """Filter for money ranges using comparison operators."""

    operator: RangeOperator = Field(..., description="The range operator to use")
    value: MoneyRange = Field(..., description="The money range to compare against")

    @field_validator("value")
    @classmethod
    def validate_range(cls, v: MoneyRange, info) -> MoneyRange:
        """Validate that min and max are provided when using the between operator."""
        if info.data.get("operator") == RangeOperator.BETWEEN:
            if v.min is None or v.max is None:
                raise ValueError(
                    "min and max are required when using the between operator"
                )
        return v


class MoneyComparisonFilter(BaseModel):
    """Filter for money values using comparison operators."""

    operator: ComparisonOperator = Field(
        ...,
        description="The comparison operator to use",
    )
    value: Money = Field(..., description="The money value to compare against")
