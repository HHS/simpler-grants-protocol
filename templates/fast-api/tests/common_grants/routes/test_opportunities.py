"""Tests for the opportunities API routes."""

from datetime import date, datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from common_grants.schemas import (
    Event,
    Money,
    OppFunding,
    OpportunityBase,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
)


def create_test_opportunity():
    """Create a test opportunity for API tests."""
    now = datetime.now(timezone.utc)
    return OpportunityBase(
        id=uuid4(),
        title="Test Grant",
        status=OppStatus(
            value=OppStatusOptions.OPEN,
            custom_value=None,
            description="Currently accepting applications",
        ),
        description="Test grant description",
        funding=OppFunding(
            total_amount_available=Money(amount="1000000.00", currency="USD"),
            min_award_amount=Money(amount="50000.00", currency="USD"),
            max_award_amount=Money(amount="100000.00", currency="USD"),
            min_award_count=None,
            max_award_count=None,
            estimated_award_count=10,
        ),
        key_dates=OppTimeline(
            app_opens=Event(
                name="Opens",
                date=date(2024, 1, 1),
                time=None,
                description="Application period begins",
            ),
            app_deadline=Event(
                name="Closes",
                date=date(2024, 12, 31),
                time=None,
                description="Final deadline for submissions",
            ),
            other_dates=None,
        ),
        source=None,
        custom_fields=None,
        created_at=now,
        last_modified_at=now,
    )


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
