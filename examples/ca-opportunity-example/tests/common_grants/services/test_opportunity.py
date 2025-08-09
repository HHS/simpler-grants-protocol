"""Tests for the opportunity service layer."""

import pytest
from common_grants_sdk.schemas import (
    OppFilters,
    OppSortBy,
    OppSorting,
    PaginatedBodyParams,
)

from common_grants.services.opportunity import OpportunityService


class TestOpportunityService:
    """Test the OpportunityService class."""

    @pytest.fixture
    def service(self) -> OpportunityService:
        """Create an OpportunityService instance for testing."""
        return OpportunityService()

    def test_service_initialization(self, service: OpportunityService) -> None:
        """Test that the service initializes correctly with opportunity data."""
        assert service.opportunity_list is not None
        assert len(service.opportunity_list) > 0
        assert service.opportunity_map is not None
        assert len(service.opportunity_map) > 0

    def test_get_opportunity_list(self, service: OpportunityService) -> None:
        """Test that opportunity list is properly loaded and transformed."""
        opportunities = service._get_opportunity_list()  # noqa: SLF001
        assert isinstance(opportunities, list)
        assert len(opportunities) > 0

        for opp in opportunities:
            assert hasattr(opp, "id")
            assert hasattr(opp, "title")
            assert hasattr(opp, "status")

    @pytest.mark.asyncio
    async def test_get_opportunity_valid_id(self, service: OpportunityService) -> None:
        """Test getting an opportunity with a valid ID."""
        first_opp = service.opportunity_list[0]
        result = await service.get_opportunity(str(first_opp.id))

        assert result is not None
        assert result.id == first_opp.id
        assert result.title is not None

    @pytest.mark.asyncio
    async def test_get_opportunity_invalid_uuid(
        self,
        service: OpportunityService,
    ) -> None:
        """Test getting an opportunity with an invalid UUID."""
        result = await service.get_opportunity("invalid-uuid")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_opportunity_nonexistent_id(
        self,
        service: OpportunityService,
    ) -> None:
        """Test getting an opportunity with a valid UUID that doesn't exist."""
        from uuid import uuid4

        result = await service.get_opportunity(str(uuid4()))
        assert result is None

    @pytest.mark.asyncio
    async def test_list_opportunities_default_pagination(
        self,
        service: OpportunityService,
    ) -> None:
        """Test listing opportunities with default pagination."""
        response = await service.list_opportunities()

        assert response.status == 200
        assert response.message == "Opportunities fetched successfully"
        assert len(response.items) <= 10
        assert response.pagination_info.page == 1
        assert response.pagination_info.page_size == 10
        assert response.pagination_info.total_items > 0
        assert response.pagination_info.total_pages > 0

    @pytest.mark.asyncio
    async def test_list_opportunities_custom_pagination(
        self,
        service: OpportunityService,
    ) -> None:
        """Test listing opportunities with custom pagination."""
        response = await service.list_opportunities(page=2, page_size=5)

        assert response.status == 200
        assert response.pagination_info.page == 2
        assert response.pagination_info.page_size == 5
        assert len(response.items) <= 5

    @pytest.mark.asyncio
    async def test_list_opportunities_empty_page(
        self,
        service: OpportunityService,
    ) -> None:
        """Test listing opportunities with a page number beyond available data."""
        total_opps = len(service.opportunity_list)
        response = await service.list_opportunities(page=total_opps + 10, page_size=10)

        assert response.status == 200
        assert len(response.items) == 0
        assert response.pagination_info.page == total_opps + 10

    @pytest.mark.asyncio
    async def test_search_opportunities_default_params(
        self,
        service: OpportunityService,
    ) -> None:
        """Test searching opportunities with default parameters."""
        response = await service.search_opportunities()

        assert response.status == 200
        assert response.message == "Opportunities fetched successfully"
        assert response.sort_info.sort_by == OppSortBy.LAST_MODIFIED_AT
        assert response.filter_info.filters == {}
        assert response.filter_info.errors == []
        assert response.sort_info.errors == []

    @pytest.mark.asyncio
    async def test_search_opportunities_with_filters(
        self,
        service: OpportunityService,
    ) -> None:
        """Test searching opportunities with filters."""
        filters = OppFilters()
        response = await service.search_opportunities(filters=filters)

        assert response.status == 200
        assert response.filter_info.filters == {}

    @pytest.mark.asyncio
    async def test_search_opportunities_with_sorting(
        self,
        service: OpportunityService,
    ) -> None:
        """Test searching opportunities with custom sorting."""
        sorting = OppSorting(sortBy=OppSortBy.TITLE, sortOrder="asc")
        response = await service.search_opportunities(sorting=sorting)

        assert response.status == 200
        assert response.sort_info.sort_by == OppSortBy.TITLE
        assert response.sort_info.sort_order == "asc"

    @pytest.mark.asyncio
    async def test_search_opportunities_with_pagination(
        self,
        service: OpportunityService,
    ) -> None:
        """Test searching opportunities with custom pagination."""
        pagination = PaginatedBodyParams(page=2, pageSize=5)
        response = await service.search_opportunities(pagination=pagination)

        assert response.status == 200
        assert response.pagination_info.page == 2
        assert response.pagination_info.page_size == 5

    @pytest.mark.asyncio
    async def test_search_opportunities_with_search_term(
        self,
        service: OpportunityService,
    ) -> None:
        """Test searching opportunities with a search term."""
        first_opp = service.opportunity_list[0]
        search_term = first_opp.title.split()[0]

        response = await service.search_opportunities(search=search_term)

        assert response.status == 200
        assert len(response.items) > 0

    @pytest.mark.asyncio
    async def test_search_opportunities_no_results(
        self,
        service: OpportunityService,
    ) -> None:
        """Test searching opportunities with a term that won't match."""
        response = await service.search_opportunities(search="xyz123nonexistent")

        assert response.status == 200
        assert len(response.items) == 0
