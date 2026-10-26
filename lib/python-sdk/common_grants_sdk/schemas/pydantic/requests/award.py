"""Request models for the Core award routes.

Award routes use Core's pagination contract directly (default page size 100, int32
bounds) rather than the shared pagination helpers, which opportunity routes still use.
"""

from typing import Annotated, Optional
from uuid import UUID

from pydantic import Field

from .._contract import SealedModel
from ..filters.award import AwdFilters
from ..sorting import AwdSorting

_INT32_MAX = 2_147_483_647
_Page = Annotated[int, Field(ge=1, le=_INT32_MAX)]


class _AwdPagination(SealedModel):
    page: _Page = Field(default=1, description="The page to return")
    page_size: _Page = Field(
        default=100,
        description="The number of items to return per page",
    )


class AwardsListRequest(_AwdPagination):
    """Query parameters for ``GET /awards``; also the search request's ``pagination``."""


class AwardGetRequest(SealedModel):
    """Path parameters for ``GET /awards/{awdId}``."""

    awd_id: UUID = Field(..., description="The ID of the award to view")


class AwdSearchRequest(SealedModel):
    """Request body for ``POST /awards/search``. Every property is optional."""

    search: Optional[str] = Field(default=None, description="Award search query")
    filters: Optional[AwdFilters] = Field(
        default=None,
        description="Filters to apply to the award search, combined with AND logic",
    )
    sorting: Optional[AwdSorting] = Field(
        default=None,
        description="The sort order to apply to the results",
    )
    pagination: Optional[_AwdPagination] = Field(
        default=None,
        description="Pagination instructions for the results",
    )


__all__ = [
    "AwardGetRequest",
    "AwardsListRequest",
    "AwdSearchRequest",
]
