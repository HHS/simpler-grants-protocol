"""Request model for opportunity search."""

from typing import Optional

from pydantic import BaseModel, Field

from common_grants.schemas.models import OppFilters
from common_grants.schemas.pagination import PaginationBodyParams
from common_grants.schemas.sorting import OppSortBy, OppSorting


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
    sorting: OppSorting = OppSorting(sortBy=OppSortBy.LAST_MODIFIED_AT)
    pagination: PaginationBodyParams = PaginationBodyParams()
