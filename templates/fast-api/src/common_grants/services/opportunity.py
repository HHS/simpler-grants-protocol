"""Service for handling opportunity data operations."""

from datetime import date
from typing import Optional
from uuid import UUID

from common_grants_sdk.schemas.models import OpportunityBase
from common_grants_sdk.schemas.models.opp_status import OppStatusOptions
from fastapi import status

from common_grants.schemas import (
    OppFilters,
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    OppSorting,
    PaginationBodyParams,
)
from common_grants.services.utils import mock_opportunity, paginate


class OpportunityService:
    """
    Service for handling opportunity data operations.

    In a real implementation, this would interact with a database.
    For this example, we're using an in-memory store.
    """

    def __init__(self) -> None:
        """Initialize the opportunity service."""
        # In-memory store for opportunities
        self.opportunity_list: list[OpportunityBase] = self._get_mock_opportunities()
        self.opportunity_map: dict[UUID, OpportunityBase] = {
            opp.id: opp for opp in self.opportunity_list
        }

    async def list_opportunities(
        self,
        page: int,
        page_size: int,
    ) -> OpportunitiesListResponse:
        """
        Get a paginated list of opportunities.

        Args:
            page: The page number to retrieve
            page_size: The number of items per page

        Returns:
            A tuple containing the list of opportunities and the total count

        """
        pages = paginate(
            items=self.opportunity_list,
            page=page,
            page_size=page_size,
        )
        return OpportunitiesListResponse(
            status=status.HTTP_200_OK,
            message="Opportunities fetched successfully",
            items=pages.items,
            paginationInfo=pages.pagination_info,
        )

    async def get_opportunity(self, opportunity_id: UUID) -> Optional[OpportunityBase]:
        """
        Get a specific opportunity by ID.

        Args:
            opportunity_id: The ID of the opportunity to retrieve

        Returns:
            The opportunity if found, None otherwise

        """
        return self.opportunity_map.get(opportunity_id)

    async def search_opportunities(
        self,
        filters: OppFilters,
        sorting: OppSorting,
        pagination: PaginationBodyParams,
    ) -> OpportunitiesSearchResponse:
        """
        Search for opportunities based on the provided filters.

        Args:
            filters: Filters to apply to the search
            sorting: Sorting parameters
            pagination: Pagination parameters

        Returns:
            A tuple containing the list of filtered opportunities and the total count

        """
        pages = paginate(
            self.opportunity_list,
            pagination.page,
            pagination.page_size,
        )
        return OpportunitiesSearchResponse(
            status=status.HTTP_200_OK,
            message="Opportunities fetched successfully",
            items=pages.items,
            paginationInfo=pages.pagination_info,
            sortInfo=sorting,
            filterInfo=filters,
        )

    def _get_mock_opportunities(self) -> list[OpportunityBase]:
        """Get a list of mock opportunities for testing."""
        return [
            mock_opportunity(
                title="Opportunity 1",
                status=OppStatusOptions.CLOSED,
                total_available=5_000_000,
                min_award_amount=100_000,
                app_opens=date(2025, 1, 1),
                app_deadline=date(2025, 1, 31),
            ),
            mock_opportunity(
                title="Opportunity 2",
                status=OppStatusOptions.CLOSED,
                total_available=5_000_000,
                min_award_amount=100_000,
                max_award_amount=500_000,
                app_opens=date(2025, 1, 1),
                app_deadline=date(2025, 1, 31),
            ),
            mock_opportunity(
                title="Opportunity 3",
                status=OppStatusOptions.OPEN,
                total_available=750_000,
                min_award_amount=10_000,
                app_opens=date(2025, 1, 2),
                app_deadline=date(2025, 2, 28),
            ),
            mock_opportunity(
                title="Opportunity 4",
                status=OppStatusOptions.OPEN,
                total_available=500_000,
                min_award_amount=1_000,
                app_opens=date(2025, 2, 1),
                app_deadline=date(2025, 3, 31),
            ),
            mock_opportunity(
                title="Opportunity 5",
                status=OppStatusOptions.OPEN,
                min_award_amount=1_000,
                max_award_amount=5_000,
                app_opens=date(2025, 3, 1),
                app_deadline=date(2025, 3, 30),
            ),
            mock_opportunity(
                title="Opportunity 6",
                status=OppStatusOptions.OPEN,
                min_award_amount=15_000,
                max_award_amount=25_000,
                max_award_count=10,
                app_opens=date(2025, 3, 1),
                app_deadline=date(2025, 3, 30),
            ),
            mock_opportunity(
                title="Opportunity 7",
                status=OppStatusOptions.OPEN,
                min_award_amount=5_000,
                max_award_amount=25_000,
                app_opens=date(2025, 3, 15),
                app_deadline=date(2025, 4, 15),
            ),
            mock_opportunity(
                title="Opportunity 8",
                status=OppStatusOptions.OPEN,
                min_award_amount=30_000,
                max_award_amount=50_000,
                min_award_count=5,
                max_award_count=10,
                app_opens=date(2025, 4, 1),
                app_deadline=date(2025, 4, 30),
            ),
            mock_opportunity(
                title="Opportunity 9",
                status=OppStatusOptions.FORECASTED,
                total_available=2_500_000,
                min_award_amount=50_000,
                app_opens=date(2025, 5, 1),
            ),
            mock_opportunity(
                title="Opportunity 10",
                status=OppStatusOptions.FORECASTED,
                total_available=500_000,
                max_award_amount=10_000,
                app_opens=date(2025, 5, 1),
            ),
        ]
