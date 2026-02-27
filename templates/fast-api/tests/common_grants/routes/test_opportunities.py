"""Tests for the opportunities API routes."""

from uuid import uuid4

from fastapi.testclient import TestClient

from common_grants.services.opportunity import OpportunityService


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

    def test_search_with_search_term_filters_results(self, client: TestClient):
        """Test that search term is passed to the service and used to filter results."""
        # Arrange: use same mock data as OpportunityService (see opportunity.py)
        service = OpportunityService()
        assert (
            service.opportunity_list
        ), "mock data must contain at least one opportunity"
        title = service.opportunity_list[0].title
        search_term = title.split()[0] if title else "grant"
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
