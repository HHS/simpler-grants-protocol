"""Tests for the OpportunityBase model."""

from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from common_grants_sdk.schemas.fields import Event, Money
from common_grants_sdk.schemas.models import (
    OppFunding,
    OpportunityBase,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
)


def test_opportunity_base_model():
    """Test the OpportunityBase model."""
    now = datetime.now(timezone.utc)
    opp = OpportunityBase(
        id=uuid4(),
        title="Research Grant 2024",
        status=OppStatus(
            value=OppStatusOptions.OPEN,
            custom_value=None,
            description="Opportunity is currently accepting applications",
        ),
        description="Funding for innovative research projects",
        funding=OppFunding(
            total_amount_available=Money(amount="1000000.00", currency="USD"),
            min_award_amount=Money(amount="50000.00", currency="USD"),
            max_award_amount=Money(amount="100000.00", currency="USD"),
            min_award_count=None,
            max_award_count=None,
            estimated_award_count=None,
        ),
        key_dates=OppTimeline(
            app_opens=Event(
                name="Application Opens",
                date=date(2024, 1, 1),
                time=None,
                description=None,
            ),
            app_deadline=Event(
                name="Application Deadline",
                date=date(2024, 12, 31),
                time=None,
                description=None,
            ),
            other_dates=None,
        ),
        source=None,
        custom_fields=None,
        created_at=now,
        last_modified_at=now,
    )
    assert isinstance(opp.id, UUID)
    assert opp.title == "Research Grant 2024"
    assert opp.status.value == OppStatusOptions.OPEN
    assert opp.funding.total_amount_available is not None
    assert opp.funding.total_amount_available.amount == "1000000.00"
    assert opp.key_dates.app_opens is not None
    assert opp.key_dates.app_opens.date == date(2024, 1, 1)
    assert opp.created_at == now
    assert opp.last_modified_at == now
