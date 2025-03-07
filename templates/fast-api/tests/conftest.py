"""Shared test fixtures for the CommonGrants API tests."""

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from common_grants.api import app
from common_grants.schemas.opportunity import (
    Event,
    Money,
    OppFunding,
    OpportunityBase,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
)


@pytest.fixture(scope="session", name="client")
def test_client():
    """Create a test client for the CommonGrants API."""
    return TestClient(app)


@pytest.fixture
def test_opportunity():
    """Create a test opportunity for tests."""
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
