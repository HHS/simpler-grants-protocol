"""
Router module for handling grant-related endpoints.

This module provides endpoints for accessing and transforming grant opportunity data
from the California Grant Portal format to the CommonGrants Protocol format.
"""

from uuid import UUID

from common_grants.schemas import (
    OppFilters,
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    OpportunityResponse,
    OppSortBy,
    OppSorting,
    PaginationBodyParams,
)
from common_grants.schemas.models.opp_search_request import OpportunitySearchRequest
from fastapi import APIRouter, HTTPException, Query, status

from services.opportunity import OpportunityService

router = APIRouter(prefix="/common-grants/opportunities", tags=["Opportunities"])


@router.get(
    "",
    summary="List opportunities",
    description="Get a list of opportunities.",
)
async def list_opportunities(
    page: int = Query(
        default=1,
        ge=1,
        description="The page number to retrieve",
    ),
    page_size: int = Query(
        default=10,
        alias="pageSize",
        ge=1,
        description="The number of items per page",
    ),
) -> OpportunitiesListResponse:
    """Get a paginated list of opportunities."""
    opportunity_service = OpportunityService()
    return await opportunity_service.list_opportunities(
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{id}",
    summary="View opportunity",
    description="View additional details about an opportunity",
    responses={
        status.HTTP_200_OK: {
            "description": "The opportunity details",
            "content": {
                "application/json": {
                    "schema": OpportunityResponse.model_json_schema(),
                },
            },
        },
        status.HTTP_404_NOT_FOUND: {
            "description": "Opportunity not found",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["status", "message", "errors"],
                        "properties": {
                            "status": {
                                "type": "integer",
                                "format": "int32",
                                "example": 404,
                            },
                            "message": {
                                "type": "string",
                                "example": "Opportunity not found",
                            },
                            "errors": {"type": "array", "items": {}},
                        },
                    },
                },
            },
        },
    },
)
async def get_opportunity(
    id: UUID,  # noqa: A002
) -> OpportunityResponse:
    """Get a specific opportunity by ID."""
    opportunity_service = OpportunityService()
    opportunity = await opportunity_service.get_opportunity(id)

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opportunity not found",
        )

    return OpportunityResponse(
        status=status.HTTP_200_OK,
        message="Success",
        data=opportunity,
    )


@router.post(
    "/search",
    summary="Search opportunities",
    description="Search for opportunities based on the provided filters",
)
async def search_opportunities(
    request: OpportunitySearchRequest,
) -> OpportunitiesSearchResponse:
    """Search for opportunities based on the provided filters."""
    opportunity_service = OpportunityService()

    if request.pagination is None:
        request.pagination = PaginationBodyParams()

    if request.filters is None:
        request.filters = OppFilters()

    if request.sorting is None:
        request.sorting = OppSorting(sortBy=OppSortBy.LAST_MODIFIED_AT)

    return await opportunity_service.search_opportunities(
        filters=request.filters,
        sorting=request.sorting,
        pagination=request.pagination,
    )
