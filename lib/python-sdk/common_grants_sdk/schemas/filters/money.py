"""Money filter schemas."""

from typing import Optional

from pydantic import Field, ValidationInfo, field_validator

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.fields import Money
from .base import (
    ComparisonOperator,
    RangeOperator,
)


class InvalidMoneyValueError(ValueError):
    """Raised when a value cannot be converted to a Money object."""

    def __init__(self) -> None:
        """Initialize the error with a descriptive message."""
        super().__init__("Value must be either a Money object or a dict")


class MoneyRange(CommonGrantsBaseModel):
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


class MoneyRangeFilter(CommonGrantsBaseModel):
    """Filter for money ranges using comparison operators."""

    operator: RangeOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: MoneyRange = Field(..., description="The money range value")

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            return RangeOperator(v)
        return v

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


class MoneyComparisonFilter(CommonGrantsBaseModel):
    """Filter for money values using comparison operators."""

    operator: ComparisonOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: Money = Field(..., description="The money value to compare against")

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            return ComparisonOperator(v)
        return v
