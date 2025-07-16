"""Request model for opportunity search."""

from typing import Optional

from pydantic import BaseModel, Field

from common_grants.schemas.models import OppFilters
from common_grants.schemas.pagination import PaginationBodyParams
from common_grants.schemas.sorting import OppSortBy, OppSorting


def create_default_sorting() -> OppSorting:
    """Create a default sorting configuration."""
    return OppSorting(sortBy=OppSortBy.LAST_MODIFIED_AT)


class OpportunitySearchRequest(BaseModel):
    """Request body for searching opportunities."""

    search: Optional[str] = Field(
        default=None,
        description="Search query string",
        examples=["Pre-school education"],
    )
    filters: Optional[OppFilters] = Field(
        default_factory=OppFilters,
        description="Filters to apply to the opportunity search",
    )
    sorting: OppSorting = Field(
        default_factory=create_default_sorting,
        description="The sort order to apply to the results",
    )
    pagination: Optional[PaginationBodyParams] = Field(
        default_factory=PaginationBodyParams,
        description="Pagination instructions for the results",
    )
