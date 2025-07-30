"""Tests for pagination schemas."""

import pytest
from pydantic import ValidationError

from common_grants_sdk.schemas import (
    PaginatedBodyParams,
    PaginatedItems,
    PaginatedBase,
    PaginatedInfo,
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


class TestPaginatedInfo:
    """Test PaginatedInfo class."""

    def test_required_fields(self):
        """Test PaginatedInfo with required fields."""
        pagination = PaginatedInfo(
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
        pagination = PaginatedInfo(
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


class TestPaginatedItems:
    """Test PaginatedItems class."""

    def test_with_string_items(self):
        """Test PaginatedItems with string items."""
        items = ["item1", "item2", "item3"]
        paginated_info = PaginatedInfo(
            page=1,
            page_size=10,
            total_items=3,
            total_pages=1,
        )
        paginated = PaginatedItems(items=items, paginated_info=paginated_info)
        assert paginated.items == items
        assert paginated.paginated_info == paginated_info

    def test_with_dict_items(self):
        """Test PaginatedItems with dictionary items."""
        items = [{"id": 1, "name": "test"}, {"id": 2, "name": "test2"}]
        paginated_info = PaginatedInfo(
            page=1,
            page_size=10,
            total_items=2,
            total_pages=1,
        )
        paginated = PaginatedItems(items=items, paginated_info=paginated_info)
        assert paginated.items == items
        assert paginated.paginated_info == paginated_info

    def test_json_serialization(self):
        """Test JSON serialization."""
        items = ["item1", "item2"]
        paginated_info = PaginatedInfo(
            page=1,
            page_size=10,
            total_items=2,
            total_pages=1,
        )
        paginated = PaginatedItems(items=items, paginated_info=paginated_info)
        data = paginated.model_dump(by_alias=True)
        assert data["items"] == items
        assert data["paginatedInfo"]["page"] == 1
        assert data["paginatedInfo"]["pageSize"] == 10
        assert data["paginatedInfo"]["totalItems"] == 2
        assert data["paginatedInfo"]["totalPages"] == 1

    def test_empty_items(self):
        """Test PaginatedItems with empty items list."""
        items = []
        paginated_info = PaginatedInfo(
            page=1,
            page_size=10,
            total_items=0,
            total_pages=0,
        )
        paginated = PaginatedItems(items=items, paginated_info=paginated_info)
        assert paginated.items == []
        assert paginated.paginated_info.total_items == 0
        assert paginated.paginated_info.total_pages == 0
