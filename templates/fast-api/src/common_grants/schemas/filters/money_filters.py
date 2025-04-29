"""Money filter schemas."""

from typing import Optional

from common_grants_sdk.schemas.fields import Money
from pydantic import BaseModel, Field

from common_grants.schemas.filters.base import ComparisonOperator, RangeOperator


class MoneyRange(BaseModel):
    """Range filter for money values."""

    min: Optional[Money] = Field(None, description="The minimum amount in the range")
    max: Optional[Money] = Field(None, description="The maximum amount in the range")

    def __init__(self, **data: dict) -> None:
        """
        Initialize the MoneyRange with optional conversion of dict to Money objects.

        Args:
            **data: The range data, which may include min and max values as dicts.

        """
        # Convert dict to Money objects if needed
        if "min" in data and isinstance(data["min"], dict):
            data["min"] = Money(**data["min"])
        if "max" in data and isinstance(data["max"], dict):
            data["max"] = Money(**data["max"])
        super().__init__(**data)


class MoneyRangeFilter(BaseModel):
    """Filter for money ranges using comparison operators."""

    operator: RangeOperator = Field(..., description="The range operator to use")
    value: MoneyRange = Field(..., description="The money range to compare against")


class MoneyComparisonFilter(BaseModel):
    """Filter for money values using comparison operators."""

    operator: ComparisonOperator = Field(
        ...,
        description="The comparison operator to use",
    )
    value: Money = Field(..., description="The money value to compare against")
