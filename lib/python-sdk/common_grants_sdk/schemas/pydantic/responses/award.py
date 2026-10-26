"""Success responses for the Core award routes, generic over the award model.

``AwardResponse`` and the list wrappers default to ``AwardBase``; parameterize them
with a typed award to keep it through parsing::

    AwardResponse[AwardBase[AwdRecipientIndividual[RecipientFields]]]

``GET /awards/{awdId}`` answers a missing award with the shared ``Error`` model.
"""

from typing import Any, Generic, Literal, Optional

import typing_extensions as te
from pydantic import Field

from .._contract import SealedModel
from ..filters.award import AwdFilters
from ..models.award import AwardBase
from ..requests.award import _Page
from ..sorting import SortOrder

AwardT = te.TypeVar("AwardT", bound=AwardBase[Any], default=AwardBase)


class _AwdPaginationInfo(SealedModel):
    page: _Page = Field(..., description="The page number of the current results")
    page_size: int = Field(..., ge=1, description="The number of items per page")
    total_items: Optional[int] = Field(
        default=None, description="The total number of items"
    )
    total_pages: Optional[int] = Field(
        default=None, description="The total number of pages"
    )


class _AwdSortInfo(SealedModel):
    sort_by: str = Field(..., description="The field the results are sorted by")
    custom_sort_by: Optional[str] = Field(
        default=None,
        description="Implementation-defined sort key, when used",
    )
    sort_order: SortOrder = Field(
        ..., description="The order the results are sorted in"
    )
    errors: Optional[list[str]] = Field(
        default=None,
        description="Non-fatal errors that occurred during sorting",
    )


class _AwdFilterInfo(SealedModel):
    filters: AwdFilters = Field(..., description="The filters applied to the results")
    errors: Optional[list[str]] = Field(
        default=None,
        description="Non-fatal errors that occurred during filtering",
    )


class _AwardSuccess(SealedModel):
    status: Literal[200] = Field(..., description="The HTTP status code")
    message: str = Field(..., description="The message")


class AwardResponse(_AwardSuccess, Generic[AwardT]):
    """Successful response from ``GET /awards/{awdId}``."""

    data: AwardT = Field(..., description="The award")


class AwardsListResponse(_AwardSuccess, Generic[AwardT]):
    """Successful response from ``GET /awards``: a page of awards."""

    items: list[AwardT] = Field(..., description="Items from the current page")
    pagination_info: _AwdPaginationInfo = Field(
        ...,
        description="Details about the paginated results",
    )


class AwardsSortedResponse(AwardsListResponse[AwardT], Generic[AwardT]):
    """A page of awards with the sort order applied."""

    sort_info: _AwdSortInfo = Field(..., description="The sort order of the items")


class AwardsFilteredResponse(AwardsSortedResponse[AwardT], Generic[AwardT]):
    """Successful response from ``POST /awards/search``: sorted and filtered awards."""

    filter_info: _AwdFilterInfo = Field(
        ...,
        description="The filters applied to the response items",
    )


__all__ = [
    "AwardResponse",
    "AwardsFilteredResponse",
    "AwardsListResponse",
    "AwardsSortedResponse",
]
