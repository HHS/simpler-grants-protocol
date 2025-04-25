"""Tests for timeline validation in opportunities, applications, and awards."""

import pytest
from datetime import datetime, date, UTC
from uuid import uuid4

from common_grants.schemas.fields import Money, Event
from common_grants.schemas.models.opp_base import OpportunityBase
from common_grants.schemas.models.opp_funding import OppFunding
from common_grants.schemas.models.opp_status import OppStatus, OppStatusOptions
from common_grants.schemas.models.opp_timeline import OppTimeline


@pytest.fixture
def sample_opportunity(sample_contact):
    """Create a sample opportunity for testing."""
    return OpportunityBase(
        id=uuid4(),
        title="Research Grant 2024",
        description="Funding for innovative research projects",
        status=OppStatus(
            value=OppStatusOptions.OPEN,
            description="This opportunity is currently accepting applications"
        ),
        created_at=datetime.now(UTC),
        last_modified_at=datetime.now(UTC),
        funding=OppFunding(
            total_amount_available=Money(amount="100000.00", currency="USD"),
            min_award_amount=Money(amount="10000.00", currency="USD"),
            max_award_amount=Money(amount="50000.00", currency="USD"),
            estimated_award_count=5
        ),
        key_dates=OppTimeline(
            app_opens=Event(
                name="Application Opens",
                date=date(2024, 1, 1),
                description="Applications open"
            ),
            app_deadline=Event(
                name="Application Deadline",
                date=date(2024, 3, 31),
                description="Applications close"
            )
        )
    )


def test_opportunity_timeline_validation(sample_opportunity):
    """Test opportunity timeline validation."""
    # Test that app_opens date is before app_deadline
    assert sample_opportunity.key_dates.app_opens.date < sample_opportunity.key_dates.app_deadline.date
    
    # Test that dates are valid
    assert isinstance(sample_opportunity.key_dates.app_opens.date, date)
    assert isinstance(sample_opportunity.key_dates.app_deadline.date, date)
    
    # Test that event names are not empty
    assert sample_opportunity.key_dates.app_opens.name
    assert sample_opportunity.key_dates.app_deadline.name


def test_invalid_timeline_scenarios():
    """Test invalid timeline scenarios."""
    # Test opportunity with invalid dates (deadline before opens)
    with pytest.raises(ValueError):
        OpportunityBase(
            id=uuid4(),
            title="Invalid Timeline Opportunity",
            description="Testing invalid timeline",
            status=OppStatus(
                value=OppStatusOptions.OPEN,
                description="Testing"
            ),
            created_at=datetime.now(UTC),
            last_modified_at=datetime.now(UTC),
            funding=OppFunding(
                total_amount_available=Money(amount="100000.00", currency="USD"),
                min_award_amount=Money(amount="10000.00", currency="USD"),
                max_award_amount=Money(amount="50000.00", currency="USD"),
                estimated_award_count=5
            ),
            key_dates=OppTimeline(
                app_opens=Event(
                    name="Application Opens",
                    date=date(2024, 3, 31),
                    description="Applications open"
                ),
                app_deadline=Event(
                    name="Application Deadline",
                    date=date(2024, 1, 1),
                    description="Applications close"
                )
            )
        )
