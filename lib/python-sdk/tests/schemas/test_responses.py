"""Tests for response schemas."""

import pytest
from pydantic import ValidationError

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.pagination import PaginatedResultsInfo
from common_grants_sdk.schemas.responses import (
    DefaultResponse,
    Error,
    Filtered,
    Paginated,
    Sorted,
    Success,
)
from common_grants_sdk.schemas.sorting import SortedResultsInfo


class TestDefaultResponse:
    """Test DefaultResponse class."""

    def test_default_response_creation(self):
        """Test creating a DefaultResponse."""
        response = DefaultResponse(status=200, message="Success")
        assert response.status == 200
        assert response.message == "Success"

    def test_default_response_validation(self):
        """Test DefaultResponse validation."""
        with pytest.raises(ValidationError):
            DefaultResponse()  # Missing required fields

    def test_default_response_examples(self):
        """Test DefaultResponse with example values."""
        response = DefaultResponse(
            status=201,
            message="Created successfully",
        )
        assert response.status == 201
        assert response.message == "Created successfully"


class TestSuccess:
    """Test Success class."""

    def test_success_default_values(self):
        """Test Success with default values."""
        response = Success()
        assert response.status == 200
        assert response.message == "Success"

    def test_success_custom_values(self):
        """Test Success with custom values."""
        response = Success(status=201, message="Created")
        assert response.status == 201
        assert response.message == "Created"


class TestPaginated:
    """Test Paginated class."""

    def test_paginated_response(self):
        """Test Paginated response."""
        items = [{"id": "1"}, {"id": "2"}]
        pagination_info = PaginatedResultsInfo(
            page=1,
            page_size=10,
            total_items=20,
            total_pages=2,
        )

        response = Paginated[dict](
            items=items,
            pagination_info=pagination_info,
        )

        assert response.status == 200
        assert response.message == "Success"
        assert response.items == items
        assert response.pagination_info == pagination_info

    def test_paginated_with_models(self) -> None:
        """Test Paginated response with models."""

        # Create a simple test model
        class TestModel(CommonGrantsBaseModel):
            id: str
            name: str

        items = [
            TestModel(id="1", name="Item 1"),
            TestModel(id="2", name="Item 2"),
        ]
        pagination_info = PaginatedResultsInfo(
            page=1,
            pageSize=10,
            totalItems=20,
            totalPages=2,
        )

        response = Paginated[TestModel](
            items=items,
            paginationInfo=pagination_info,
        )

        assert len(response.items) == 2
        assert response.items[0].id == "1"
        assert response.items[1].name == "Item 2"


class TestSorted:
    """Test Sorted class."""

    def test_sorted_response(self) -> None:
        """Test Sorted response."""
        items = [{"id": "1"}, {"id": "2"}]
        pagination_info = PaginatedResultsInfo(
            page=1,
            pageSize=10,
            totalItems=20,
            totalPages=2,
        )
        sort_info = SortedResultsInfo(
            sortBy="id",
            sortOrder="asc",
        )

        response = Sorted[dict](
            items=items,
            paginationInfo=pagination_info,
            sortInfo=sort_info,
        )

        assert response.status == 200
        assert response.items == items
        assert response.pagination_info == pagination_info
        assert response.sort_info == sort_info


class TestFiltered:
    """Test Filtered class."""

    def test_filtered_response(self):
        """Test Filtered response."""
        items = [{"id": "1"}, {"id": "2"}]
        pagination_info = PaginatedResultsInfo(
            page=1,
            page_size=10,
            total_items=20,
            total_pages=2,
        )
        sort_info = SortedResultsInfo(
            sort_by="id",
            sort_order="asc",
        )
        filter_info = {
            "filters": {"status": "active"},
            "errors": [],
        }

        response = Filtered[dict, dict](
            items=items,
            pagination_info=pagination_info,
            sort_info=sort_info,
            filter_info=filter_info,
        )

        assert response.status == 200
        assert response.items == items
        assert response.pagination_info == pagination_info
        assert response.sort_info == sort_info
        assert response.filter_info == filter_info


class TestError:
    """Test Error class."""

    def test_error_default_values(self):
        """Test Error with default values."""
        response = Error(errors=[])
        assert response.status == 400
        assert response.message == "Error"
        assert response.errors == []

    def test_error_custom_values(self):
        """Test Error with custom values."""
        errors = [{"field": "name", "message": "Required"}]
        response = Error(
            status=422,
            message="Validation failed",
            errors=errors,
        )
        assert response.status == 422
        assert response.message == "Validation failed"
        assert response.errors == errors

    def test_error_validation(self):
        """Test Error validation."""
        with pytest.raises(ValidationError):
            Error()  # Missing required errors field


class TestResponseSerialization:
    """Test response serialization."""

    def test_default_response_serialization(self):
        """Test DefaultResponse serialization."""
        response = DefaultResponse(status=200, message="Success")
        data = response.model_dump()
        assert data["status"] == 200
        assert data["message"] == "Success"

    def test_success_response_serialization(self):
        """Test Success response serialization."""
        response = Success()
        data = response.model_dump()
        assert data["status"] == 200
        assert data["message"] == "Success"

    def test_error_response_serialization(self):
        """Test Error response serialization."""
        response = Error(errors=[{"detail": "Test error"}])
        data = response.model_dump()
        assert data["status"] == 400
        assert data["message"] == "Error"
        assert data["errors"] == [{"detail": "Test error"}]

    def test_paginated_response_serialization(self):
        """Test Paginated response serialization."""
        items = [{"id": "1"}]
        pagination_info = PaginatedResultsInfo(
            page=1, page_size=10, total_items=1, total_pages=1
        )

        response = Paginated[dict](
            items=items,
            pagination_info=pagination_info,
        )
        data = response.model_dump()

        assert data["status"] == 200
        assert data["message"] == "Success"
        assert data["items"] == items
        assert data["pagination_info"]["page"] == 1
        assert data["pagination_info"]["page_size"] == 10


class TestResponseDeserialization:
    """Test response deserialization."""

    def test_default_response_deserialization(self):
        """Test DefaultResponse deserialization."""
        data = {"status": 200, "message": "Success"}
        response = DefaultResponse.model_validate(data)
        assert response.status == 200
        assert response.message == "Success"

    def test_success_response_deserialization(self):
        """Test Success response deserialization."""
        data = {"status": 200, "message": "Success"}
        response = Success.model_validate(data)
        assert response.status == 200
        assert response.message == "Success"

    def test_error_response_deserialization(self):
        """Test Error response deserialization."""
        data = {
            "status": 400,
            "message": "Error",
            "errors": [{"detail": "Test error"}],
        }
        response = Error.model_validate(data)
        assert response.status == 400
        assert response.message == "Error"
        assert response.errors == [{"detail": "Test error"}]
