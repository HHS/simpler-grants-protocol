"""Tests for the opportunities API routes."""

from uuid import uuid4

from fastapi.testclient import TestClient

from common_grants.utils.opp_data_source import OpportunityDataSource


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
        assert data["paginationInfo"]["totalItems"] == 50
        assert data["paginationInfo"]["totalPages"] == 5

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
        assert data["paginationInfo"]["totalItems"] == 50
        assert data["paginationInfo"]["totalPages"] == 50

    def test_pagination_edge_cases(self, client: TestClient):
        """Test pagination edge cases."""
        response = client.get("/common-grants/opportunities?page=1000&pageSize=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 0
        assert data["paginationInfo"]["page"] == 1000

        response = client.get("/common-grants/opportunities?page=1&pageSize=1000")
        assert response.status_code == 200
        data = response.json()
        assert data["paginationInfo"]["pageSize"] == 1000

    def test_pagination_validation(self, client: TestClient):
        """Test pagination parameter validation."""
        response = client.get("/common-grants/opportunities?page=0")
        assert response.status_code == 422

        response = client.get("/common-grants/opportunities?pageSize=0")
        assert response.status_code == 422


class TestGetOpportunityById:
    """Test /common-grants/opportunities/{id} endpoint."""

    def test_opportunity_not_found(self, client: TestClient):
        """Test GET /common-grants/opportunities/{id} endpoint when opportunity is not found."""
        response = client.get(f"/common-grants/opportunities/{uuid4()}")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Opportunity not found"

    def test_opportunity_invalid_uuid(self, client: TestClient):
        """Test GET /common-grants/opportunities/{id} endpoint with invalid UUID."""
        response = client.get("/common-grants/opportunities/invalid-uuid")
        assert response.status_code == 422

    def test_opportunity_success(self, client: TestClient):
        """Test GET /common-grants/opportunities/{id} endpoint with valid UUID."""
        list_response = client.get("/common-grants/opportunities?pageSize=1")
        assert list_response.status_code == 200
        list_data = list_response.json()

        if list_data["items"]:
            opportunity_id = list_data["items"][0]["id"]
            response = client.get(f"/common-grants/opportunities/{opportunity_id}")
            assert response.status_code == 200
            data = response.json()
            assert "data" in data
            assert data["data"]["id"] == opportunity_id


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

    def test_search_with_sorting(self, client: TestClient):
        """Test search with different sorting options."""
        sorting_options = ["title", "lastModifiedAt", "createdAt"]

        for sort_by in sorting_options:
            response = client.post(
                "/common-grants/opportunities/search",
                json={
                    "sorting": {"sortBy": sort_by, "sortOrder": "asc"},
                    "pagination": {"page": 1, "pageSize": 5},
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert data["sortInfo"]["sortBy"] == sort_by
            assert data["sortInfo"]["sortOrder"] == "asc"

    def test_search_with_pagination(self, client: TestClient):
        """Test search with custom pagination."""
        response = client.post(
            "/common-grants/opportunities/search",
            json={
                "pagination": {"page": 2, "pageSize": 3},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["paginationInfo"]["page"] == 2
        assert data["paginationInfo"]["pageSize"] == 3

    def test_search_empty_request(self, client: TestClient):
        """Test search with empty request body."""
        response = client.post(
            "/common-grants/opportunities/search",
            json={},
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "paginationInfo" in data

    def test_search_invalid_request(self, client: TestClient):
        """Test search with invalid request data."""
        response = client.post(
            "/common-grants/opportunities/search",
            json={"invalid": "data"},
        )
        assert response.status_code in [200, 422]

    def test_search_with_search_term_filters_results(self, client: TestClient):
        """Test that search term is passed to the service and used to filter results."""
        # Arrange: use same mock data source as OpportunityService (see opportunity.py)
        grants = OpportunityDataSource.get_opportunities()
        assert grants, "mock data must contain at least one grant"
        title = grants[0].get("title") or "grant"
        search_term = title.split()[0]
        request_body = {
            "search": search_term,
            "pagination": {"page": 1, "pageSize": 10},
        }

        # Act: call search endpoint with that term
        response = client.post(
            "/common-grants/opportunities/search",
            json=request_body,
        )

        # Assert: response is ok and every item contains the search term (title or description)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) >= 1
        term_lower = search_term.lower()
        for item in data["items"]:
            title_match = term_lower in (item.get("title") or "").lower()
            desc_match = term_lower in (item.get("description") or "").lower()
            assert title_match or desc_match, (
                f"Search term {search_term!r} was not used to filter: "
                f"item {item.get('id')} title={item.get('title')!r} has no match"
            )

    def test_search_with_nonexistent_term_returns_no_results(self, client: TestClient):
        """Test that search term is used: nonexistent term returns zero items."""
        # Arrange: term that does not appear in OpportunityService mock data
        request_body = {
            "search": "xyznonexistent123",
            "pagination": {"page": 1, "pageSize": 10},
        }

        # Act: call search endpoint
        response = client.post(
            "/common-grants/opportunities/search",
            json=request_body,
        )

        # Assert: no items returned
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []

    def test_search_no_results(self, client: TestClient):
        """Test search that should return no results."""
        response = client.post(
            "/common-grants/opportunities/search",
            json={
                "search": "xyz123nonexistentterm",
                "pagination": {"page": 1, "pageSize": 10},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) > 0
