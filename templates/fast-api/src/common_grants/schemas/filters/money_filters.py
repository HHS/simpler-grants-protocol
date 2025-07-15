"""Money filter schemas."""

from typing import Optional

from common_grants_sdk.schemas.fields import Money
from pydantic import BaseModel, Field, ValidationInfo, field_validator

from common_grants.schemas.filters.base import (
    DefaultFilter,
    RangeOperator,
)


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
            e = "min and max are required"
            raise ValueError(e)
        if isinstance(v, Money):
            return v
        if isinstance(v, dict):
            return Money(**v)
        raise InvalidMoneyValueError


class MoneyRangeFilter(DefaultFilter):
    """Filter for money ranges using comparison operators."""

    @field_validator("value")
    @classmethod
    def validate_range(cls, v: MoneyRange, info: ValidationInfo) -> MoneyRange:
        """Validate that min and max are provided when using the between operator."""
        if info.data.get("operator") == RangeOperator.BETWEEN and (
            v.min is None or v.max is None
        ):
            e = "min and max are required when using the between operator"
            raise ValueError(e)
        return v


class MoneyComparisonFilter(DefaultFilter):
    """Filter for money values using comparison operators."""
