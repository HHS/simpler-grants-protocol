"""Request model for opportunity search."""

from pydantic import BaseModel

from common_grants.schemas.models import OppFilters
from common_grants.schemas.pagination import PaginationBodyParams
from common_grants.schemas.sorting import OppSortBy, OppSorting


class OpportunitySearchRequest(BaseModel):
    """Request body for searching opportunities."""

    filters: OppFilters = OppFilters()
    sorting: OppSorting = OppSorting(sortBy=OppSortBy.LAST_MODIFIED_AT)
    pagination: PaginationBodyParams = PaginationBodyParams()
