"""Tests for the opportunities API routes."""

from uuid import uuid4

from fastapi.testclient import TestClient


class TestListOpportunities:
    """Test GET /common-grants/opportunities endpoint."""

    def test_default_pagination(self, client: TestClient):
        """Test GET /common-grants/opportunities endpoint with default pagination."""
        response = client.get("/common-grants/opportunities")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert isinstance(data["items"], list)
        assert data["paginationInfo"]["page"] == 1
        assert data["paginationInfo"]["page_size"] == 10

    def test_pagination_specified(self, client: TestClient):
        """Test GET /common-grants/opportunities endpoint with custom pagination."""
        response = client.get("/common-grants/opportunities?page=2&page_size=1")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert isinstance(data["items"], list)
        assert data["paginationInfo"]["page"] == 2
        assert data["paginationInfo"]["page_size"] == 1


class TestGetOpportunityById:
    """Test GET /common-grants/opportunities/{id} endpoint."""

    def test_opportunity_not_found(self, client: TestClient):
        """Test GET /common-grants/opportunities/{id} endpoint when opportunity is not found."""
        response = client.get(f"/common-grants/opportunities/{uuid4()}")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Opportunity not found"


class TestSearchOpportunities:
    """Test GET /common-grants/opportunities/search endpoint."""

    def test_default_search(self, client: TestClient):
        """Test GET /common-grants/opportunities/search endpoint with default search."""
        response = client.post("/common-grants/opportunities/search")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data
        assert "sortInfo" in data
        assert "filterInfo" in data
        assert isinstance(data["items"], list)
        assert data["paginationInfo"]["page"] == 1
        assert data["paginationInfo"]["page_size"] == 10
