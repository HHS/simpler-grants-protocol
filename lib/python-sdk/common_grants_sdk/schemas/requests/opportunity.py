"""Request model for opportunity search."""

from typing import Optional

from pydantic import BaseModel, Field

from ..filters.opportunity import OppFilters
from ..pagination import PaginatedBodyParams
from ..sorting import OppSortBy, OppSorting


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
    pagination: PaginatedBodyParams = PaginatedBodyParams()
