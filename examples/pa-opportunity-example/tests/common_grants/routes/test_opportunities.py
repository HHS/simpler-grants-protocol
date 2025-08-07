"""Tests for the opportunities API routes."""

from uuid import uuid4

from fastapi.testclient import TestClient


class TestListOpportunities:
    """Test /common-grants/opportunities endpoint."""

    def test_default_pagination(self, client: TestClient):
        """Test GET /common-grants/opportunities endpoint with default pagination."""
        response = client.get("/common-grants/opportunities")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert isinstance(data["items"], list)
        assert data["paginationInfo"]["page"] == 1
        assert data["paginationInfo"]["pageSize"] == 10
        assert data["paginationInfo"]["totalItems"] == 3
        assert data["paginationInfo"]["totalPages"] == 1

    def test_pagination_specified(self, client: TestClient):
        """Test GET /common-grants/opportunities endpoint with custom pagination."""
        response = client.get("/common-grants/opportunities?page=2&pageSize=1")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert isinstance(data["items"], list)
        assert data["paginationInfo"]["page"] == 2
        assert data["paginationInfo"]["pageSize"] == 1
        assert data["paginationInfo"]["totalItems"] == 3
        assert data["paginationInfo"]["totalPages"] == 3


class TestGetOpportunityById:
    """Test /common-grants/opportunities/{id} endpoint."""

    def test_opportunity_not_found(self, client: TestClient):
        """Test GET /common-grants/opportunities/{id} endpoint when opportunity is not found."""
        response = client.get(f"/common-grants/opportunities/{uuid4()}")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Opportunity not found"


class TestSearchOpportunities:
    """Test /common-grants/opportunities/search endpoint."""

    def test_default_search(self, client: TestClient):
        """Test POST /common-grants/opportunities/search endpoint with default search."""
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
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert "sortInfo" in data
        assert "filterInfo" in data
        assert isinstance(data["items"], list)
        assert data["paginationInfo"]["page"] == 1
        assert data["paginationInfo"]["pageSize"] == 10
