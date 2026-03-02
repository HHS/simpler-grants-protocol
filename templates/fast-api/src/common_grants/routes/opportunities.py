"""Routes for the opportunities API."""

from uuid import UUID

from common_grants_sdk.schemas.pydantic import (
    Error,
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    OpportunityResponse,
)
from common_grants_sdk.schemas.pydantic.requests.opportunity import (
    OpportunitySearchRequest,
)
from fastapi import APIRouter, HTTPException, Query, status

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


@opportunity_router.get(
    "/{oppId}",
    summary="View opportunity",
    description="View additional details about an opportunity",
    responses={
        200: {"model": OpportunityResponse, "description": "Success"},
        404: {"model": Error, "description": "Opportunity not found"},
    },
)
async def get_opportunity(
    oppId: UUID,  # noqa: N803
) -> OpportunityResponse:
    """Get a specific opportunity by ID."""
    opportunity_service = OpportunityService()
    opportunity = await opportunity_service.get_opportunity(str(oppId))

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


@opportunity_router.post(
    "/search",
    summary="Search opportunities",
    description="Search for opportunities based on the provided filters",
)
async def search_opportunities(
    request: OpportunitySearchRequest,
) -> OpportunitiesSearchResponse:
    """Search for opportunities based on the provided filters."""
    opportunity_service = OpportunityService()

    return await opportunity_service.search_opportunities(
        search=request.search,
        filters=request.filters,
        sorting=request.sorting,
        pagination=request.pagination,
    )
