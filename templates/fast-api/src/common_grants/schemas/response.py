"""Schemas for the CommonGrants API responses."""

from typing import Optional

from common_grants_sdk.schemas import PaginatedResultsInfo, SortedResultsInfo
from pydantic import BaseModel, Field

from common_grants.schemas.models import (
    OpportunityBase,
)


class DefaultResponse(BaseModel):
    """Response for a default operation."""

    status: int = Field(
        ...,
        description="The HTTP status code",
        examples=[200, 201, 204],
    )
    message: str = Field(
        ...,
        description="The message",
        examples=["Success"],
    )


class FilterInfo(BaseModel):
    """Filter information for search results."""

    filters: dict = Field(..., description="The filters applied to the response items")
    errors: Optional[list[str]] = Field(
        default_factory=list,
        description="Non-fatal errors that occurred during filtering",
        json_schema_extra={"items": {"type": "string"}},
    )


class OpportunitiesListResponse(DefaultResponse):
    """A paginated list of opportunities."""

    items: list[OpportunityBase] = Field(..., description="The list of opportunities")
    pagination_info: PaginatedResultsInfo = Field(
        ...,
        description="The pagination details",
        alias="paginationInfo",
    )


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
    filter_info: FilterInfo = Field(
        ...,
        description="The filter details",
        alias="filterInfo",
    )


class OpportunityResponse(DefaultResponse):
    """A single opportunity."""

    data: OpportunityBase = Field(..., description="The opportunity")
