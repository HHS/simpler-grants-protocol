"""Service for handling opportunity data operations."""

from pathlib import Path
from typing import Optional
from uuid import UUID

from common_grants.schemas import (
    OppFilters,
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    OppSorting,
    PaginationBodyParams,
    PaginationInfo,
)
from common_grants_sdk.schemas.models import (
    OpportunityBase,
)
from fastapi import status

from ca_common_grants.utils.opp_data_source import OpportunityDataSource
from ca_common_grants.utils.opp_transform import OpportunityTransformer

DATA_FILE = Path(__file__).parent.parent / "data" / "ca_grants_sample.json"


class OpportunityService:
    """
    Service for handling opportunity data operations.

    In a real world implementation, this class would likely interact with a database,
    whereas this example uses a flat file on disk.
    """

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

    async def list_opportunities(
        self,
        page: int,
        page_size: int,
    ) -> OpportunitiesListResponse:
        """
        Get a list of opportunities.

        Args:
            page: The page number to retrieve
            page_size: The number of items per page

        Returns:
            An instance of OpportunitiesListResponse

        """
        return OpportunitiesListResponse(
            status=status.HTTP_200_OK,
            message="Success",
            items=self.opportunity_list,
            paginationInfo=PaginationInfo(
                page=1,
                pageSize=len(self.opportunity_list),
                totalItems=len(self.opportunity_list),
                totalPages=1,
            ),
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
            An instance of OpportunitiesSearchResponse

        """
        return OpportunitiesSearchResponse(
            status=status.HTTP_200_OK,
            message="Success",
            items=self.opportunity_list,
            paginationInfo=PaginationInfo(
                page=1,
                pageSize=len(self.opportunity_list),
                totalItems=len(self.opportunity_list),
                totalPages=1,
            ),
            sortInfo=sorting,
            filterInfo=filters,
        )
