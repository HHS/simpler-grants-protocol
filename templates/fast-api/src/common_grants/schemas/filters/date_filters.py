"""Date filter schemas."""

from typing import Optional

from pydantic import BaseModel, Field

from common_grants.schemas.fields import ISODate
from common_grants.schemas.filters.base import ComparisonOperator, RangeOperator

# ############################################################
# Models
# ############################################################


class DateRange(BaseModel):
    """Represents a range between two dates."""

    min: Optional[ISODate] = Field(None, description="The minimum date in the range")
    max: Optional[ISODate] = Field(None, description="The maximum date in the range")


class DateRangeFilter(BaseModel):
    """Filter that matches dates within a specified range."""

    operator: RangeOperator = Field(
        ...,
        description="The operator to apply to the filter",
        examples=[RangeOperator.BETWEEN, RangeOperator.OUTSIDE],
    )
    value: DateRange = Field(..., description="The date range to filter by")


class DateComparisonFilter(BaseModel):
    """Filter that matches dates against a specific value."""

    operator: ComparisonOperator = Field(
        ...,
        description="The operator to apply to the filter",
        examples=[ComparisonOperator.GREATER_THAN, ComparisonOperator.LESS_THAN],
    )


value: ISODate = Field(..., description="The date to filter by")


class DefaultFilter(BaseModel):
    """Base class for all filters."""
