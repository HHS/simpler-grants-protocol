"""Schemas for the CommonGrants API responses."""

from typing import Optional

from pydantic import BaseModel, Field

from common_grants.schemas.models import (
    OpportunityBase,
)
from common_grants.schemas.pagination import PaginationInfo


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


class SortInfo(BaseModel):
    """Sorting information for search results."""

    sort_by: str = Field(
        ...,
        alias="sortBy",
        description="The field results are sorted by",
    )
    custom_sort_by: Optional[str] = Field(
        default=None,
        alias="customSortBy",
        description="Implementation-defined sort key used to sort the results, if applicable",
    )
    sort_order: str = Field(
        ...,
        alias="sortOrder",
        description="The order in which the results are sorted",
    )
    errors: Optional[list[str]] = Field(
        default_factory=list,
        description="Non-fatal errors that occurred during sorting",
        json_schema_extra={"items": {"type": "string"}},
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
    sort_info: SortInfo = Field(
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
