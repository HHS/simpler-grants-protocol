"""Service layer for opportunity-related operations."""

from datetime import date
from typing import Any
from uuid import UUID

from common_grants_sdk.schemas import (
    FilterInfo,
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    PaginatedBodyParams,
    PaginatedResultsInfo,
    SortedResultsInfo,
)
from common_grants_sdk.schemas.sorting import OppSortBy, OppSorting
from fastapi import status

from common_grants.schemas import OppFilters, OpportunityBase
from common_grants.services.utils import build_applied_filters, mock_opportunity
from common_grants.utils.opp_data_source import OpportunityDataSource
from common_grants.utils.opp_transform import OpportunityTransformer


class OpportunityService:
    """Service for managing opportunities."""

    def __init__(self) -> None:
        """Initialize the opportunity service."""
        self.opportunity_list: list[OpportunityBase] = self._get_opportunity_list()
        self.opportunity_map: dict[UUID, OpportunityBase] = {
            opp.id: opp for opp in self.opportunity_list
        }

    def _get_opportunity_list(self) -> list[OpportunityBase]:
        """Transform CA opportunity data to CGP format."""
        # Get normalized data from source
        normalized_data = OpportunityDataSource.get_opportunities()

        # Transform normalized data into CommonGrants format
        transformed = OpportunityTransformer().transform_opportunities(normalized_data)

        # Build result set
        return [OpportunityBase.model_validate(opp_data) for opp_data in transformed]

    async def get_opportunity(self, opportunity_id: str) -> OpportunityBase | None:
        """Get a specific opportunity by ID."""
        try:
            opportunity_uuid = UUID(opportunity_id)
            return self.opportunity_map.get(opportunity_uuid)
        except ValueError:
            return None

    async def list_opportunities(
        self,
        page: int = 1,
        page_size: int = 10,
    ) -> OpportunitiesListResponse:
        """Get a paginated list of opportunities."""
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        items = self.opportunity_list[start_idx:end_idx]

        pagination_info = PaginatedResultsInfo(
            page=page,
            pageSize=page_size,
            totalItems=len(self.opportunity_list),
            totalPages=(len(self.opportunity_list) + page_size - 1) // page_size,
        )

        return OpportunitiesListResponse(
            status=status.HTTP_200_OK,
            message="Opportunities fetched successfully",
            items=items,
            paginationInfo=pagination_info,
        )

    async def search_opportunities(
        self,
        filters: OppFilters | None = None,
        sorting: OppSorting | None = None,
        pagination: PaginatedBodyParams | None = None,
        search: str | None = None,
    ) -> OpportunitiesSearchResponse:
        """Search for opportunities based on the provided filters."""
        # Use default values if not provided
        if filters is None:
            filters = OppFilters()
        if sorting is None:
            sorting = OppSorting(sortBy=OppSortBy.LAST_MODIFIED_AT)
        if pagination is None:
            pagination = PaginatedBodyParams()

        # Apply search filter
        filtered_opportunities = self.opportunity_list
        if search:
            search_lower = search.lower()
            filtered_opportunities = [
                opp
                for opp in filtered_opportunities
                if search_lower in opp.title.lower()
                or (opp.description and search_lower in opp.description.lower())
            ]

        # Create PaginatedResultsInfo object
        start_idx = (pagination.page - 1) * pagination.page_size
        end_idx = start_idx + pagination.page_size
        items = filtered_opportunities[start_idx:end_idx]
        pagination_info = PaginatedResultsInfo(
            page=pagination.page,
            pageSize=pagination.page_size,
            totalItems=len(filtered_opportunities),
            totalPages=(len(filtered_opportunities) + pagination.page_size - 1)
            // pagination.page_size,
        )

        # Create SortedResultsInfo object
        sort_info = SortedResultsInfo(
            sortBy=sorting.sort_by,
            sortOrder=sorting.sort_order,
            customSortBy=sorting.custom_sort_by,
            errors=[],  # Provide empty list as default
        )

        # Create FilterInfo object
        filter_info = FilterInfo(
            filters=build_applied_filters(filters),
            errors=[],
        )

        return OpportunitiesSearchResponse(
            status=status.HTTP_200_OK,
            message="Opportunities fetched successfully",
            items=items,
            paginationInfo=pagination_info,
            sortInfo=sort_info,
            filterInfo=filter_info,
        )

    def _get_mock_opportunities(self) -> list[Any]:
        """Get a list of mock opportunities for testing."""
        return [
            mock_opportunity(
                title="Early Childhood Education Grant",
                description="Supporting early childhood education programs",
                total_available=500000.00,
                min_award_amount=25000.00,
                max_award_amount=100000.00,
                min_award_count=5,
                max_award_count=20,
                app_opens=date(2024, 1, 15),
                app_deadline=date(2024, 3, 15),
            ),
            mock_opportunity(
                title="STEM Research Initiative",
                description="Funding for STEM research projects",
                total_available=1000000.00,
                min_award_amount=50000.00,
                max_award_amount=200000.00,
                min_award_count=3,
                max_award_count=10,
                app_opens=date(2024, 2, 1),
                app_deadline=date(2024, 4, 30),
            ),
            mock_opportunity(
                title="Community Health Program",
                description="Improving community health outcomes",
                total_available=750000.00,
                min_award_amount=30000.00,
                max_award_amount=150000.00,
                min_award_count=4,
                max_award_count=15,
                app_opens=date(2024, 1, 1),
                app_deadline=date(2024, 5, 31),
            ),
        ]
