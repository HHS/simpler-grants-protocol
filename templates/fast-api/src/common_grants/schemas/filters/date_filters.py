"""Date filter schemas."""

from typing import Optional

from common_grants_sdk.schemas.fields import ISODate
from pydantic import BaseModel, Field

from common_grants.schemas.filters.base import (
    DefaultFilter,
)

# ############################################################
# Models
# ############################################################


class DateRange(BaseModel):
    """Represents a range between two dates."""

    min: Optional[ISODate] = Field(None, description="The minimum date in the range")
    max: Optional[ISODate] = Field(None, description="The maximum date in the range")


class DateRangeFilter(DefaultFilter):
    """Filter that matches dates within a specified range."""
    
    value: DateRange = Field(..., description="The date range value")


class DateComparisonFilter(DefaultFilter):
    """Filter that matches dates against a specific value."""
