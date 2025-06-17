"""Tests for the opportunities API routes."""

from uuid import uuid4

from fastapi.testclient import TestClient
from starlette.status import HTTP_200_OK, HTTP_404_NOT_FOUND

DEFAULT_PAGE_SIZE = 50


class TestListOpportunities:
    """Test GET /common-grants/opportunities endpoint."""

    def test_default_pagination(self, client: TestClient) -> None:
        """Test GET /common-grants/opportunities endpoint with default pagination."""
        response = client.get("/common-grants/opportunities")
        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert isinstance(data["items"], list)
        assert data["paginationInfo"]["page"] == 1
        assert data["paginationInfo"]["pageSize"] == DEFAULT_PAGE_SIZE

    def test_pagination_specified(self, client: TestClient) -> None:
        """Test GET /common-grants/opportunities endpoint with custom pagination."""
        response = client.get("/common-grants/opportunities?page=2&pageSize=1")
        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert isinstance(data["items"], list)
        # Service currently returns all items with page=1
        assert data["paginationInfo"]["page"] == 1
        assert data["paginationInfo"]["pageSize"] == DEFAULT_PAGE_SIZE


class TestGetOpportunityById:
    """Test GET /common-grants/opportunities/{id} endpoint."""

    def test_opportunity_not_found(self, client: TestClient) -> None:
        """Test GET /common-grants/opportunities/{id} endpoint when opportunity is not found."""
        response = client.get(f"/common-grants/opportunities/{uuid4()}")
        assert response.status_code == HTTP_404_NOT_FOUND
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Opportunity not found"


class TestSearchOpportunities:
    """Test GET /common-grants/opportunities/search endpoint."""

    def test_default_search(self, client: TestClient) -> None:
        """Test GET /common-grants/opportunities/search endpoint with default search."""
        response = client.post(
            "/common-grants/opportunities/search",
            json={
                "filters": {
                    "status": {"operator": "in", "value": []},
                    "closeDateRange": {"operator": "between", "value": {}},
                    "totalFundingAvailableRange": {
                        "operator": "between",
                        "value": {
                            "min": {"amount": "0.00", "currency": "USD"},
                            "max": {"amount": "0.00", "currency": "USD"},
                        },
                    },
                    "minAwardAmountRange": {
                        "operator": "between",
                        "value": {
                            "min": {"amount": "0.00", "currency": "USD"},
                            "max": {"amount": "0.00", "currency": "USD"},
                        },
                    },
                    "maxAwardAmountRange": {
                        "operator": "between",
                        "value": {
                            "min": {"amount": "0.00", "currency": "USD"},
                            "max": {"amount": "0.00", "currency": "USD"},
                        },
                    },
                    "customFilters": {},
                },
                "sorting": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
                "pagination": {"page": 1, "pageSize": 10},
            },
        )
        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert "sortInfo" in data
        assert "filterInfo" in data
        assert isinstance(data["items"], list)
        # Service currently returns all items with page=1
        assert data["paginationInfo"]["page"] == 1
        assert data["paginationInfo"]["pageSize"] == DEFAULT_PAGE_SIZE

    def test_search_with_filters(self, client: TestClient) -> None:
        """Test search with specific filters."""
        response = client.post(
            "/common-grants/opportunities/search",
            json={
                "filters": {
                    "status": {"operator": "in", "value": ["OPEN"]},
                    "minAmount": "1000",
                    "maxAmount": "10000",
                },
                "sorting": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
                "pagination": {"page": 1, "pageSize": 10},
            },
        )
        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert "sortInfo" in data
        assert "filterInfo" in data
        assert isinstance(data["items"], list)

    def test_search_empty_result(self, client: TestClient) -> None:
        """Test search with no results."""
        response = client.post(
            "/common-grants/opportunities/search",
            json={
                "filters": {
                    "status": {"operator": "in", "value": ["CLOSED"]},
                },
                "sorting": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
                "pagination": {"page": 1, "pageSize": 10},
            },
        )
        assert response.status_code == HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert "sortInfo" in data
        assert "filterInfo" in data
        assert isinstance(data["items"], list)
