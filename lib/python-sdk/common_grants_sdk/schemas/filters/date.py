"""Date filter schemas."""

from typing import Optional

from pydantic import Field, field_validator

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.filters.base import (
    ComparisonOperator,
    RangeOperator,
)
from common_grants_sdk.schemas.types import ISODate

# ############################################################
# Models
# ############################################################


class DateRange(CommonGrantsBaseModel):
    """Represents a range between two dates."""

    min: Optional[ISODate] = Field(None, description="The minimum date in the range")
    max: Optional[ISODate] = Field(None, description="The maximum date in the range")


class DateRangeFilter(CommonGrantsBaseModel):
    """Filter that matches dates within a specified range."""

    operator: RangeOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: DateRange = Field(..., description="The date range value")

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            return RangeOperator(v)
        return v


class DateComparisonFilter(CommonGrantsBaseModel):
    """Filter that matches dates against a specific value."""

    operator: ComparisonOperator = Field(
        ...,
        description="The operator to apply to the filter value",
    )
    value: ISODate = Field(..., description="The date value to compare against")

    @field_validator("operator", mode="before")
    @classmethod
    def validate_operator(cls, v):
        """Convert string to enum if needed."""
        if isinstance(v, str):
            return ComparisonOperator(v)
        return v
