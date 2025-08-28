"""Date filter schemas."""

from datetime import date
from typing import Optional

from pydantic import Field, field_validator

from ..base import CommonGrantsBaseModel
from .base import (
    ComparisonOperator,
    RangeOperator,
)
from ..types import ISODate

# ############################################################
# Models
# ############################################################


class DateRange(CommonGrantsBaseModel):
    """Represents a range between two dates."""

    min: Optional[ISODate] = Field(None, description="The minimum date in the range")
    max: Optional[ISODate] = Field(None, description="The maximum date in the range")

    @field_validator("min", "max", mode="before")
    @classmethod
    def validate_date(cls, v):
        """Convert string to date if needed."""
        if v is None:
            return v
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v


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

    @field_validator("value", mode="before")
    @classmethod
    def validate_date(cls, v):
        """Convert string to date if needed."""
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v
