"""Tests for the OpportunityTransformer class."""

import pytest
from datetime import datetime, timezone
from uuid import UUID

from common_grants_sdk.schemas.fields import Event, Money
from common_grants_sdk.schemas.models import (
    OppFunding,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
    OpportunityTransformer
)


class OpportunityTransformerImpl(OpportunityTransformer):
    """Concrete implementation of OpportunityTransformer for testing."""

    def transform_opportunity_description(self) -> str:
        """Transform description data."""
        return self.source_data.get("description", "Test Description")

    def transform_opportunity_funding(self) -> OppFunding:
        """Transform funding data."""
        return OppFunding(
            total_amount_available=Money(amount="1000.00", currency="USD"),
            min_award_amount=None,
            max_award_amount=None,
            min_award_count=None,
            max_award_count=None,
            estimated_award_count=None,
        )

    def transform_opportunity_status(self) -> OppStatus:
        """Transform status data."""
        return OppStatus(
            value=OppStatusOptions.OPEN,
            custom_value=None,
            description="Opportunity is currently accepting applications",
        )

    def transform_opportunity_timeline(self) -> OppTimeline:
        """Transform timeline data."""
        return OppTimeline(
            app_opens=Event(
                name="Application Opens",
                date=datetime.now(timezone.utc).date(),
                time=None,
                description="Start accepting applications",
            ),
            app_deadline=None,
            other_dates=None,
        )

    def transform_opportunity_title(self) -> str:
        """Transform title data."""
        return self.source_data.get("title", "Test Opportunity")


@pytest.fixture
def transformer():
    """Create a transformer instance for testing."""
    return OpportunityTransformerImpl(
        source_data={
            "title": "Test Opportunity",
            "description": "Test Description",
            "amount": 1000,
            "currency": "USD",
        }
    )


def test_transform_opportunity_basic(transformer):
    """Test basic opportunity transformer with all required fields."""
    result = transformer.transform_opportunity()

    assert isinstance(result.id, UUID)
    assert result.title == "Test Opportunity"
    assert result.status.value == OppStatusOptions.OPEN
    assert result.status.description == "Opportunity is currently accepting applications"
    assert result.funding.total_amount_available is not None
    assert result.funding.total_amount_available.amount == "1000.00"
    assert result.funding.total_amount_available.currency == "USD"
    assert result.key_dates.app_opens is not None
    assert result.key_dates.app_opens.name == "Application Opens"


def test_transform_opportunity_with_custom_id(transformer):
    """Test opportunity transformer with a custom ID."""
    custom_id = UUID("12345678-1234-5678-1234-567812345678")
    result = transformer.transform_opportunity(id=custom_id)

    assert result.id == custom_id
    assert result.title == "Test Opportunity"


def test_transform_opportunity_missing_data():
    """Test opportunity transformer with missing data."""
    transformer = OpportunityTransformerImpl(source_data={})
    result = transformer.transform_opportunity()

    assert isinstance(result.id, UUID)
    assert result.title == "Test Opportunity"  # Default title
    assert result.status.value == OppStatusOptions.OPEN
    assert result.funding.total_amount_available is not None
    assert result.key_dates.app_opens is not None


def test_transform_opportunity_funding(transformer):
    """Test funding transformer."""
    funding = transformer.transform_opportunity_funding()

    assert isinstance(funding, OppFunding)
    assert funding.total_amount_available is not None
    assert funding.total_amount_available.amount == "1000.00"
    assert funding.total_amount_available.currency == "USD"


def test_transform_opportunity_status(transformer):
    """Test status transformer."""
    status = transformer.transform_opportunity_status()

    assert isinstance(status, OppStatus)
    assert status.value == OppStatusOptions.OPEN
    assert status.description == "Opportunity is currently accepting applications"


def test_transform_opportunity_timeline(transformer):
    """Test timeline transformer."""
    timeline = transformer.transform_opportunity_timeline()

    assert isinstance(timeline, OppTimeline)
    assert timeline.app_opens is not None
    assert timeline.app_opens.name == "Application Opens"
    assert timeline.app_opens.date == datetime.now(timezone.utc).date()


def test_generate_id(transformer):
    """Test ID generation."""
    id1 = transformer._generate_id()
    id2 = transformer._generate_id()

    assert isinstance(id1, UUID)
    assert isinstance(id2, UUID)
    assert id1 != id2


def test_current_timestamp(transformer):
    """Test timestamp generation."""
    timestamp = transformer._current_timestamp()

    assert isinstance(timestamp, datetime)
    assert timestamp.tzinfo == timezone.utc 
