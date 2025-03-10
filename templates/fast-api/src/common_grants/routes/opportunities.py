"""Routes for the opportunities API."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from common_grants.schemas import (
    OppFilters,
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    OpportunityResponse,
    OppSortBy,
    OppSorting,
    PaginationBodyParams,
    PaginationInfo,
)
from common_grants.services.opportunity import OpportunityService

opportunity_router = APIRouter(
    prefix="/common-grants/opportunities",
    tags=["Opportunities"],
)


@opportunity_router.get(
    "",
    summary="List opportunities",
    description="Get a paginated list of opportunities, sorted by `lastModifiedAt` with most recent first.",  # noqa: E501
)
async def list_opportunities(
    page: Optional[int] = Query(1, ge=1, description="The page number to retrieve"),
    page_size: Optional[int] = Query(
        10,
        ge=1,
        description="The number of items per page",
    ),
) -> OpportunitiesListResponse:
    """Get a paginated list of opportunities."""
    opportunity_service = OpportunityService()
    pagination = PaginationBodyParams(page=page, page_size=page_size)
    opportunities, total_count = await opportunity_service.list_opportunities(
        pagination,
    )

    return OpportunitiesListResponse(
        message="Success",
        items=opportunities,
        paginationInfo=PaginationInfo(
            page=pagination.page,
            page_size=pagination.page_size,
            total_pages=100,
            total_count=total_count,
        ),
    )


@opportunity_router.get(
    "/{id}",
    summary="View opportunity",
    description="View additional details about an opportunity",
    responses={
        status.HTTP_404_NOT_FOUND: {"description": "Opportunity not found"},
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
        message="Success",
        data=opportunity,
    )


@opportunity_router.post(
    "/search",
    summary="Search opportunities",
    description="Search for opportunities based on the provided filters",
)
async def search_opportunities(
    filters: Optional[OppFilters] = None,
    sorting: Optional[OppSorting] = None,
    pagination: Optional[PaginationBodyParams] = None,
) -> OpportunitiesSearchResponse:
    """Search for opportunities based on the provided filters."""
    opportunity_service = OpportunityService()

    if pagination is None:
        pagination = PaginationBodyParams()

    if filters is None:
        filters = OppFilters()

    if sorting is None:
        sorting = OppSorting(sortBy=OppSortBy.LAST_MODIFIED_AT)

    opportunities, total_count = await opportunity_service.search_opportunities(
        filters=filters,
        sorting=sorting,
        pagination=pagination,
    )

    return OpportunitiesSearchResponse(
        message="Success",
        items=opportunities,
        paginationInfo=PaginationInfo(
            page=pagination.page,
            page_size=pagination.page_size,
            total_pages=100,
            total_count=total_count,
        ),
        sortInfo=sorting,
        filterInfo=filters,
    )
