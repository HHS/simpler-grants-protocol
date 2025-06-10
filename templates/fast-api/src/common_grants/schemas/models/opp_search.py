"""Schemas for the CommonGrants API."""

from common_grants_sdk.schemas.fields import Money
from pydantic import BaseModel, Field

from common_grants.schemas.filters.base import (
    ArrayOperator,
    DefaultFilter,
    RangeOperator,
)
from common_grants.schemas.filters.date_filters import DateRange, DateRangeFilter
from common_grants.schemas.filters.money_filters import MoneyRange, MoneyRangeFilter
from common_grants.schemas.filters.string_filters import StringArrayFilter


class OppDefaultFilters(BaseModel):
    """Standard filters available for searching opportunities."""

    status: StringArrayFilter = Field(
        default=StringArrayFilter(operator=ArrayOperator.IN, value=[]),
        description="`status.value` matches one of the following values",
    )
    close_date_range: DateRangeFilter = Field(
        default=DateRangeFilter(
            operator=RangeOperator.BETWEEN,
            value=DateRange(min=None, max=None),
        ),
        description="`keyDates.closeDate` is between the given range",
        alias="closeDateRange",
    )
    total_funding_available_range: MoneyRangeFilter = Field(
        default=MoneyRangeFilter(
            operator=RangeOperator.BETWEEN,
            value=MoneyRange(
                min=Money(amount="0.00", currency="USD"),
                max=Money(amount="0.00", currency="USD"),
            ),
        ),
        description="`funding.totalAmountAvailable` is between the given range",
        alias="totalFundingAvailableRange",
    )
    min_award_amount_range: MoneyRangeFilter = Field(
        default=MoneyRangeFilter(
            operator=RangeOperator.BETWEEN,
            value=MoneyRange(
                min=Money(amount="0.00", currency="USD"),
                max=Money(amount="0.00", currency="USD"),
            ),
        ),
        description="`funding.minAwardAmount` is between the given range",
        alias="minAwardAmountRange",
    )
    max_award_amount_range: MoneyRangeFilter = Field(
        default=MoneyRangeFilter(
            operator=RangeOperator.BETWEEN,
            value=MoneyRange(
                min=Money(amount="0.00", currency="USD"),
                max=Money(amount="0.00", currency="USD"),
            ),
        ),
        description="`funding.maxAwardAmount` is between the given range",
        alias="maxAwardAmountRange",
    )


class OppFilters(OppDefaultFilters):
    """Filters for searching opportunities."""

    custom_filters: dict[str, DefaultFilter] = Field(
        default_factory=dict,
        description="Additional implementation-defined filters to apply to the search",
        alias="customFilters",
    )
