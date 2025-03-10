"""Schemas for the CommonGrants API responses."""

from pydantic import BaseModel, Field

from common_grants.schemas.models import (
    OppFilters,
    OpportunityBase,
)
from common_grants.schemas.pagination import PaginationInfo
from common_grants.schemas.sorting import OppSorting


class DefaultResponse(BaseModel):
    """Response for a default operation."""

    message: str = Field(
        ...,
        description="The message",
        examples=["Success"],
    )


class OpportunitiesListResponse(DefaultResponse):
    """A paginated list of opportunities."""

    items: list[OpportunityBase] = Field(..., description="The list of opportunities")
    pagination_info: PaginationInfo = Field(
        ...,
        description="The pagination details",
        alias="paginationInfo",
    )


class OpportunitiesSearchResponse(DefaultResponse):
    """A paginated list of results from an opportunity search."""

    items: list[OpportunityBase] = Field(..., description="The list of opportunities")
    pagination_info: PaginationInfo = Field(
        ...,
        description="The pagination details",
        alias="paginationInfo",
    )
    sort_info: OppSorting = Field(
        ...,
        description="The sorting details",
        alias="sortInfo",
    )
    filter_info: OppFilters = Field(
        ...,
        description="The filter details",
        alias="filterInfo",
    )


class OpportunityResponse(DefaultResponse):
    """A single opportunity."""

    data: OpportunityBase = Field(..., description="The opportunity")
