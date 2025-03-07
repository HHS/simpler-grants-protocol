from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from common_grants.schemas.opportunity import (
    OppFilters,
    OppSortBy,
    OppSorting,
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    OpportunityResponse,
    PaginationParams,
)
from common_grants.services.opportunity import OpportunityService

opportunity_router = APIRouter(
    prefix="/common-grants/opportunities",
    tags=["Opportunities"],
)


@opportunity_router.get(
    "",
    response_model=OpportunitiesListResponse,
    summary="List opportunities",
    description="Get a paginated list of opportunities, sorted by `lastModifiedAt` with most recent first.",
)
async def list_opportunities(
    page: Optional[int] = Query(1, ge=1, description="The page number to retrieve"),
    page_size: Optional[int] = Query(
        10, ge=1, le=100, description="The number of items per page"
    ),
    opportunity_service: OpportunityService = Depends(),
) -> OpportunitiesListResponse:
    """
    Get a paginated list of opportunities.
    """
    pagination = PaginationParams(page=page, page_size=page_size)
    opportunities, total_count = await opportunity_service.list_opportunities(
        pagination
    )

    return OpportunitiesListResponse(
        data=opportunities,
        pagination=pagination,
        total_count=total_count,
    )


@opportunity_router.get(
    "/{id}",
    response_model=OpportunityResponse,
    summary="View opportunity",
    description="View additional details about an opportunity",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Opportunity not found"},
    },
)
async def get_opportunity(
    id: UUID,
    opportunity_service: OpportunityService = Depends(),
) -> OpportunityResponse:
    """
    Get a specific opportunity by ID.
    """
    opportunity = await opportunity_service.get_opportunity(id)

    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opportunity with ID {id} not found",
        )

    return OpportunityResponse(data=opportunity)


@opportunity_router.post(
    "/search",
    response_model=OpportunitiesSearchResponse,
    summary="Search opportunities",
    description="Search for opportunities based on the provided filters",
)
async def search_opportunities(
    filters: Optional[OppFilters] = None,
    sorting: Optional[OppSorting] = None,
    pagination: Optional[PaginationParams] = None,
    opportunity_service: OpportunityService = Depends(),
) -> OpportunitiesSearchResponse:
    """
    Search for opportunities based on the provided filters.
    """
    if pagination is None:
        pagination = PaginationParams()

    if filters is None:
        filters = OppFilters()

    if sorting is None:
        sorting = OppSorting(sort_by=OppSortBy.LAST_MODIFIED_AT, sort_order="desc")

    opportunities, total_count = await opportunity_service.search_opportunities(
        filters=filters,
        sorting=sorting,
        pagination=pagination,
    )

    return OpportunitiesSearchResponse(
        data=opportunities,
        pagination=pagination,
        total_count=total_count,
        filters=filters,
    )
