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
        description="Free-text search query to match against opportunity title and description",
    )
    filters: OppFilters = OppFilters()
    sorting: OppSorting = OppSorting(sortBy=OppSortBy.LAST_MODIFIED_AT)
    pagination: PaginationBodyParams = PaginationBodyParams()
