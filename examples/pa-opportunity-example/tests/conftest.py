"""Shared test fixtures for the CommonGrants API tests."""

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest
from common_grants_sdk.schemas.pydantic.fields import EventType, SingleDateEvent
from fastapi.testclient import TestClient

from common_grants.api import app
from common_grants.schemas import (
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
    status = OppStatus(
        value=OppStatusOptions.OPEN,
        description="Currently accepting applications",
    )
    funding = OppFunding(
        totalAmountAvailable=Money(amount="1000000.00", currency="USD"),
        minAwardAmount=Money(amount="50000.00", currency="USD"),
        maxAwardAmount=Money(amount="100000.00", currency="USD"),
        minAwardCount=None,
        maxAwardCount=None,
        estimatedAwardCount=10,
    )
    key_dates = OppTimeline(
        postDate=SingleDateEvent(
            name="Opens",
            eventType=EventType.SINGLE_DATE,
            date=date(2024, 1, 1),
            time=None,
            description="Application period begins",
        ),
        closeDate=SingleDateEvent(
            name="Closes",
            eventType=EventType.SINGLE_DATE,
            date=date(2024, 12, 31),
            time=None,
            description="Final deadline for submissions",
        ),
        otherDates=None,
    )
    opp_dict = {
        "id": str(uuid4()),
        "title": "Test Grant",
        "status": status.model_dump(by_alias=True),
        "description": "Test grant description",
        "funding": funding.model_dump(by_alias=True),
        "keyDates": key_dates.model_dump(by_alias=True),
        "source": None,
        "customFields": None,
        "createdAt": now,
        "lastModifiedAt": now,
    }
    return OpportunityBase.model_validate(opp_dict)
