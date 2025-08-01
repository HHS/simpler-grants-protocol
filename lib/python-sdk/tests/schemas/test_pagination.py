"""Tests for pagination schemas."""

import pytest
from pydantic import ValidationError

from common_grants_sdk.schemas import (
    PaginatedBodyParams,
    Paginated,
    PaginatedBase,
    PaginatedResultsInfo,
)


class TestPaginatedBase:
    """Test PaginatedBase class."""

    def test_default_values(self):
        """Test PaginatedBase with default values."""
        pagination = PaginatedBase()
        assert pagination.page == 1
        assert pagination.page_size == 10

    def test_custom_values(self):
        """Test PaginatedBase with custom values."""
        pagination = PaginatedBase(page=2, page_size=20)
        assert pagination.page == 2
        assert pagination.page_size == 20

    def test_validation_page_less_than_one(self):
        """Test that page must be >= 1."""
        with pytest.raises(ValidationError):
            PaginatedBase(page=0)

    def test_validation_page_size_less_than_one(self):
        """Test that page_size must be >= 1."""
        with pytest.raises(ValidationError):
            PaginatedBase(page_size=0)

    def test_json_serialization(self):
        """Test JSON serialization with aliases."""
        pagination = PaginatedBase(page=2, page_size=15)
        data = pagination.model_dump(by_alias=True)
        assert data["page"] == 2
        assert data["pageSize"] == 15


class TestPaginatedResultsInfo:
    """Test PaginatedResultsInfo class."""

    def test_required_fields(self):
        """Test PaginatedResultsInfo with required fields."""
        pagination = PaginatedResultsInfo(
            page=1,
            page_size=10,
            total_items=100,
            total_pages=10,
        )
        assert pagination.page == 1
        assert pagination.page_size == 10
        assert pagination.total_items == 100
        assert pagination.total_pages == 10

    def test_json_serialization(self):
        """Test JSON serialization with aliases."""
        pagination = PaginatedResultsInfo(
            page=2,
            page_size=15,
            total_items=150,
            total_pages=10,
        )
        data = pagination.model_dump(by_alias=True)
        assert data["page"] == 2
        assert data["pageSize"] == 15
        assert data["totalItems"] == 150
        assert data["totalPages"] == 10


class TestPaginatedBodyParams:
    """Test PaginatedBodyParams class."""

    def test_inherits_from_pagination_base(self):
        """Test that PaginatedBodyParams inherits from PaginatedBase."""
        params = PaginatedBodyParams(page=3, page_size=25)
        assert isinstance(params, PaginatedBase)
        assert params.page == 3
        assert params.page_size == 25


class TestPaginated:
    """Test Paginated class."""

    def test_with_string_items(self):
        """Test Paginated with string items."""
        items = ["item1", "item2", "item3"]
        paginated_info = PaginatedResultsInfo(
            page=1,
            page_size=10,
            total_items=3,
            total_pages=1,
        )
        paginated = Paginated(items=items, pagination_info=paginated_info)
        assert paginated.items == items
        assert paginated.pagination_info == paginated_info

    def test_with_dict_items(self):
        """Test Paginated with dictionary items."""
        items = [{"id": 1, "name": "test"}, {"id": 2, "name": "test2"}]
        paginated_info = PaginatedResultsInfo(
            page=1,
            page_size=10,
            total_items=2,
            total_pages=1,
        )
        paginated = Paginated(items=items, pagination_info=paginated_info)
        assert paginated.items == items
        assert paginated.pagination_info == paginated_info

    def test_json_serialization(self):
        """Test JSON serialization."""
        items = ["item1", "item2"]
        paginated_info = PaginatedResultsInfo(
            page=1,
            page_size=10,
            total_items=2,
            total_pages=1,
        )
        paginated = Paginated(items=items, pagination_info=paginated_info)
        data = paginated.model_dump(by_alias=True)
        assert data["items"] == items
        assert data["paginationInfo"]["page"] == 1
        assert data["paginationInfo"]["pageSize"] == 10
        assert data["paginationInfo"]["totalItems"] == 2
        assert data["paginationInfo"]["totalPages"] == 1

    def test_empty_items(self):
        """Test Paginated with empty items list."""
        items = []
        paginated_info = PaginatedResultsInfo(
            page=1,
            page_size=10,
            total_items=0,
            total_pages=0,
        )
        paginated = Paginated(items=items, pagination_info=paginated_info)
        assert paginated.items == []
        assert paginated.pagination_info.total_items == 0
        assert paginated.pagination_info.total_pages == 0
