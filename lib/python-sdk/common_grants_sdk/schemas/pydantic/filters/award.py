"""Award search filters for the CommonGrants API.

Core seals every award filter object and requires both bounds of its ranges. The
shared filter models are looser, and opportunity search still relies on them, so
awards use small local compositions instead of changing those models.
"""

from typing import Optional, Union

from pydantic import AwareDatetime, ConfigDict, Field
from typing_extensions import TypedDict

from .._contract import SealedModel
from ..base import CommonGrantsBaseModel
from ..fields import Money
from ..types import ISODate
from .base import DefaultFilter, RangeOperator
from .date import DateRangeFilter
from .money import MoneyRangeFilter
from .string import StringArrayFilter


class _AwdStringArrayFilter(StringArrayFilter):
    model_config = ConfigDict(extra="forbid")


class _AwdDefaultFilter(DefaultFilter):
    model_config = ConfigDict(extra="forbid")


# Datetime first: in a smart union a midnight datetime collapses into a date and
# loses its offset.
_DateOrDateTime = Union[AwareDatetime, ISODate]


class _AwdDateRange(SealedModel):
    min: _DateOrDateTime = Field(..., union_mode="left_to_right")
    max: _DateOrDateTime = Field(..., union_mode="left_to_right")


class _AwdDateRangeFilter(SealedModel):
    operator: RangeOperator = Field(
        ..., description="The operator to apply to the filter value"
    )
    value: _AwdDateRange = Field(..., description="The date or datetime range value")


class _AwdMoneyRange(SealedModel):
    min: Money = Field(..., description="The minimum amount in the range")
    max: Money = Field(..., description="The maximum amount in the range")


class _AwdMoneyRangeFilter(SealedModel):
    operator: RangeOperator = Field(
        ..., description="The operator to apply to the filter value"
    )
    value: _AwdMoneyRange = Field(..., description="The money range value")


class _AwdNamedFilters(SealedModel):
    status: Optional[_AwdStringArrayFilter] = Field(
        default=None,
        description="`status.value` matches one of the following values",
    )
    opportunity_id: Optional[_AwdStringArrayFilter] = Field(
        default=None,
        description="`opportunity.id` matches one of the following values",
    )
    award_date_range: Optional[_AwdDateRangeFilter] = Field(
        default=None,
        description="`keyDates.awardDate` is between the given range",
    )
    awarded_amount_range: Optional[_AwdMoneyRangeFilter] = Field(
        default=None,
        description=(
            "`funding.awardedAmount` is between the given range; amounts in a "
            "different currency are excluded"
        ),
    )


class AwdDefaultFilters(_AwdNamedFilters):
    """Standard award filters, plus implementation-defined filters at the root.

    Root keys beyond the standard ones are kept, each validated as a ``DefaultFilter``.
    """

    model_config = ConfigDict(extra="allow")

    __pydantic_extra__: dict[str, _AwdDefaultFilter] = Field(init=False)


class AwdFilters(_AwdNamedFilters):
    """Filters accepted by the award search request.

    Closed: implementation-defined filters go under ``customFilters``.
    """

    custom_filters: Optional[dict[str, _AwdDefaultFilter]] = Field(
        default=None,
        description="Additional custom filters to apply to the search",
    )


class AwardFilters(TypedDict, total=False, extra_items=CommonGrantsBaseModel):
    """Typed authoring surface for award search filters.

    Standard keys are the snake_case names of :class:`AwdFilters`, typed to the
    shared filter value models; the range keys also take the ``DefaultFilter`` that
    ``f.between`` builds for date, datetime and money bounds. The client checks each
    value against the stricter award model and sends its camelCase wire name. A plugin
    author extends this to register custom award filters for a route::

        class AwardSearchFilters(AwardFilters, total=False):
            program_code: StringArray

    Open via PEP 728 ``extra_items`` like ``OpportunityFilters``: an unregistered
    key is an ad-hoc filter sent under ``customFilters``.
    """

    status: StringArrayFilter
    opportunity_id: StringArrayFilter
    award_date_range: Union[DateRangeFilter, DefaultFilter]
    awarded_amount_range: Union[MoneyRangeFilter, DefaultFilter]


__all__ = [
    "AwardFilters",
    "AwdDefaultFilters",
    "AwdFilters",
]
