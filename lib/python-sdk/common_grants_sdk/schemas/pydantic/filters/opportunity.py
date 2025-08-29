"""Schemas for the CommonGrants API."""

from typing import Optional

from .base import DefaultFilter
from .date import DateRangeFilter
from .money import MoneyRangeFilter
from .string import StringArrayFilter
from pydantic import BaseModel, Field


class OppDefaultFilters(BaseModel):
    """Standard filters available for searching opportunities."""

    status: Optional[StringArrayFilter] = Field(
        default=None,
        description="`status.value` matches one of the following values",
    )
    close_date_range: Optional[DateRangeFilter] = Field(
        default=None,
        alias="closeDateRange",
        description="`keyDates.closeDate` is between the given range",
    )
    total_funding_available_range: Optional[MoneyRangeFilter] = Field(
        default=None,
        alias="totalFundingAvailableRange",
        description="`funding.totalAmountAvailable` is between the given range",
    )
    min_award_amount_range: Optional[MoneyRangeFilter] = Field(
        default=None,
        alias="minAwardAmountRange",
        description="`funding.minAwardAmount` is between the given range",
    )
    max_award_amount_range: Optional[MoneyRangeFilter] = Field(
        default=None,
        alias="maxAwardAmountRange",
        description="`funding.maxAwardAmount` is between the given range",
    )


class OppFilters(OppDefaultFilters):
    """Filters for searching opportunities."""

    custom_filters: Optional[dict[str, DefaultFilter]] = Field(
        default=None,
        description="Additional custom filters to apply to the search",
        alias="customFilters",
    )
