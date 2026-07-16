"""Schemas for the CommonGrants API."""

from typing import Optional

from typing_extensions import TypedDict

from ..base import CommonGrantsBaseModel
from .base import DefaultFilter
from .boolean import BooleanComparisonFilter
from .date import DateComparisonFilter, DateRangeFilter
from .money import MoneyComparisonFilter, MoneyRangeFilter
from .numeric import NumberArrayFilter, NumberComparisonFilter
from .string import StringArrayFilter, StringComparisonFilter
from pydantic import BaseModel, Field

# Clean aliases for the typed authoring DX. A plugin author declaring custom
# filters reads ``agency: StringArray`` rather than ``agency: StringArrayFilter``;
# the alias *is* the Pydantic value model, so call-site values still validate.
StringArray = StringArrayFilter
StringComparison = StringComparisonFilter
NumberArray = NumberArrayFilter
NumberComparison = NumberComparisonFilter
DateComparison = DateComparisonFilter
MoneyComparison = MoneyComparisonFilter
BooleanComparison = BooleanComparisonFilter

# Range filters have no clean alias: ``DateRange`` / ``MoneyRange`` / ``NumberRange``
# are already the range *value* sub-models (a range filter's ``.value``), so range
# fields are typed with the explicit ``*RangeFilter`` names to avoid the collision.


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


class OpportunityFilters(TypedDict, total=False, extra_items=CommonGrantsBaseModel):
    """Typed authoring surface for opportunity filters — the dict consumers
    annotate, extended to give each custom filter its own typed key.

    Standard keys are the wire names a consumer passes to the client (the
    camelCase aliases of :class:`OppDefaultFilters`), each typed to its value
    model. A plugin author extends this to register custom filters for a route::

        class OppSearchFilters(OpportunityFilters, total=False):
            region: StringArray

    Open via PEP 728 ``extra_items``: any key beyond those declared is typed
    ``CommonGrantsBaseModel`` (the common base of every filter value model), so
    a registered custom key gets exact typing through the subclass while an
    unregistered ad-hoc key still passes. ``total=False`` makes every standard
    key optional.
    """

    status: StringArray
    closeDateRange: DateRangeFilter
    totalFundingAvailableRange: MoneyRangeFilter
    minAwardAmountRange: MoneyRangeFilter
    maxAwardAmountRange: MoneyRangeFilter
