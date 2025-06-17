"""Tests for the opportunity router endpoints."""

from uuid import uuid4

from fastapi.testclient import TestClient
from starlette.status import (
    HTTP_200_OK,
    HTTP_404_NOT_FOUND,
    HTTP_422_UNPROCESSABLE_ENTITY,
)

from ca_common_grants.api import app

client = TestClient(app)
DEFAULT_PAGE_SIZE = 50


def test_list_opportunities() -> None:
    """Test the list opportunities endpoint."""
    response = client.get("/common-grants/opportunities")
    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert "items" in data
    assert "paginationInfo" in data
    assert isinstance(data["items"], list)


def test_list_opportunities_pagination() -> None:
    """Test pagination in list opportunities endpoint."""
    response = client.get("/common-grants/opportunities?page=1&pageSize=5")
    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert "paginationInfo" in data
    assert data["paginationInfo"]["page"] == 1
    # The API always returns the default pageSize (50)
    assert data["paginationInfo"]["pageSize"] == DEFAULT_PAGE_SIZE


def test_list_opportunities_invalid_page() -> None:
    """Test invalid page parameter."""
    response = client.get("/common-grants/opportunities?page=0")
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY


def test_list_opportunities_invalid_page_size() -> None:
    """Test invalid page size parameter."""
    response = client.get("/common-grants/opportunities?pageSize=0")
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY


def test_get_opportunity_not_found() -> None:
    """Test getting a non-existent opportunity."""
    response = client.get(f"/common-grants/opportunities/{uuid4()}")
    assert response.status_code == HTTP_404_NOT_FOUND
    data = response.json()
    assert "detail" in data
    assert data["detail"] == "Opportunity not found"


def test_search_opportunities_invalid_request() -> None:
    """Test search with invalid request data."""
    search_data = {
        "filters": None,
        "sorting": None,
        "pagination": None,
    }
    response = client.post("/common-grants/opportunities/search", json=search_data)
    assert response.status_code == HTTP_422_UNPROCESSABLE_ENTITY
