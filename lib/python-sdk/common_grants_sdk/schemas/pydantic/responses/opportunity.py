"""Opportunity-specific response schemas for the CommonGrants API."""

from typing import TYPE_CHECKING, Any

from pydantic import Field

from ..models import OpportunityBase, OpportunityDetails
from ..pagination import PaginatedResultsInfo
from ..sorting import SortedResultsInfo
from .base import DefaultResponse
from .success import FilterInfo


class OpportunitiesListResponse(DefaultResponse):
    """A paginated list of opportunities."""

    items: list[OpportunityBase] = Field(..., description="The list of opportunities")
    pagination_info: PaginatedResultsInfo = Field(
        ...,
        description="The pagination details",
    )

    model_config = {"populate_by_name": True}


class OpportunitiesSearchResponse(DefaultResponse):
    """A paginated list of results from an opportunity search."""

    items: list[OpportunityBase] = Field(..., description="The list of opportunities")
    pagination_info: PaginatedResultsInfo = Field(
        ...,
        description="The pagination details",
    )
    sort_info: SortedResultsInfo = Field(
        ...,
        description="The sorting details",
    )
    filter_info: FilterInfo[dict] = Field(
        ...,
        description="The filter details",
    )

    model_config = {"populate_by_name": True}


class OpportunityResponse(DefaultResponse):
    """A single opportunity, with its details."""

    data: OpportunityDetails = Field(..., description="The opportunity")

    if TYPE_CHECKING:
        # Validation reads any opportunity model as OpportunityDetails, so the
        # constructor accepts one; ``data`` is always the detail model.
        def __init__(
            self, *, status: int, message: str, data: OpportunityBase[Any]
        ) -> None: ...
