"""Money filter schemas."""

from typing import Optional

from pydantic import BaseModel, Field

from common_grants.schemas.fields import Money
from common_grants.schemas.filters.base import ComparisonOperator, RangeOperator


class MoneyRange(BaseModel):
    """Represents a range between two monetary amounts."""

    min: Optional[Money] = Field(None, description="The minimum amount in the range")
    max: Optional[Money] = Field(None, description="The maximum amount in the range")


class MoneyRangeFilter(BaseModel):
    """Filter that matches monetary amounts within a specified range."""

    operator: RangeOperator = Field(
        ...,
        description="The operator to apply to the filter",
        examples=[RangeOperator.BETWEEN, RangeOperator.OUTSIDE],
    )
    value: MoneyRange = Field(
        ...,
        description="The money range to filter by",
        examples=[
            MoneyRange(
                min=Money(amount="1000", currency="USD"),
                max=Money(amount="2000", currency="USD"),
            ),
            MoneyRange(
                min=Money(amount="1000", currency="USD"),
                max=None,
            ),
        ],
    )


class MoneyComparisonFilter(BaseModel):
    """Filter that matches monetary amounts against a specific value."""

    operator: ComparisonOperator = Field(
        ...,
        description="The operator to apply to the filter",
        examples=[ComparisonOperator.GREATER_THAN, ComparisonOperator.LESS_THAN],
    )
    value: Money = Field(
        ...,
        description="The monetary amount to filter by",
        examples=[Money(amount="1000", currency="USD")],
    )
