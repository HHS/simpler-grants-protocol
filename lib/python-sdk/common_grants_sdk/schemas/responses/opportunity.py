"""Opportunity-specific response schemas for the CommonGrants API."""

from pydantic import Field

from common_grants_sdk.schemas.models import OpportunityBase
from common_grants_sdk.schemas.pagination import PaginatedResultsInfo
from common_grants_sdk.schemas.sorting import SortedResultsInfo
from .base import DefaultResponse
from .success import FilterInfo


class OpportunitiesListResponse(DefaultResponse):
    """A paginated list of opportunities."""

    items: list[OpportunityBase] = Field(..., description="The list of opportunities")
    pagination_info: PaginatedResultsInfo = Field(
        ...,
        description="The pagination details",
        alias="paginationInfo",
    )

    model_config = {"populate_by_name": True}


class OpportunitiesSearchResponse(DefaultResponse):
    """A paginated list of results from an opportunity search."""

    items: list[OpportunityBase] = Field(..., description="The list of opportunities")
    pagination_info: PaginatedResultsInfo = Field(
        ...,
        description="The pagination details",
        alias="paginationInfo",
    )
    sort_info: SortedResultsInfo = Field(
        ...,
        description="The sorting details",
        alias="sortInfo",
    )
    filter_info: FilterInfo[dict] = Field(
        ...,
        description="The filter details",
        alias="filterInfo",
    )

    model_config = {"populate_by_name": True}


class OpportunityResponse(DefaultResponse):
    """A single opportunity."""

    data: OpportunityBase = Field(..., description="The opportunity")
