"""Schemas for the CommonGrants API."""

from typing import Optional, TypedDict

from .base import DefaultFilter
from .boolean import BooleanComparisonFilter
from .date import DateComparisonFilter, DateRangeFilter
from .money import MoneyComparisonFilter, MoneyRangeFilter
from .numeric import NumberArrayFilter, NumberComparisonFilter, NumberRangeFilter
from .string import StringArrayFilter, StringComparisonFilter
from pydantic import BaseModel, Field

# Clean aliases for the typed authoring DX. A plugin author declaring custom
# filters reads ``agency: StringArray`` rather than ``agency: StringArrayFilter``;
# the alias *is* the Pydantic value model, so call-site values still validate.
StringArray = StringArrayFilter
StringComparison = StringComparisonFilter
NumberArray = NumberArrayFilter
NumberComparison = NumberComparisonFilter
NumberRange = NumberRangeFilter
DateComparison = DateComparisonFilter
DateRange = DateRangeFilter
MoneyComparison = MoneyComparisonFilter
MoneyRange = MoneyRangeFilter
BooleanComparison = BooleanComparisonFilter


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


class OpportunityFilters(TypedDict, total=False):
    """Standard filters for the opportunities search route (typed authoring DX).

    Keys are the wire names a consumer passes to ``classify_filters`` (the
    camelCase aliases of :class:`OppDefaultFilters`), each typed to its value
    model. A plugin author extends this to register custom filters for the route::

        class OppSearchFilters(OpportunityFilters, total=False):
            agency: StringArray

    ``total=False`` so every standard key is optional. This is the static
    authoring surface only; the throw-based ``classify_filters`` runtime is
    unchanged and does not consume it.
    """

    status: StringArray
    closeDateRange: DateRange
    totalFundingAvailableRange: MoneyRange
    minAwardAmountRange: MoneyRange
    maxAwardAmountRange: MoneyRange
