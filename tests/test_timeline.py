"""Tests for timeline validation in opportunities, applications, and awards."""

import pytest
from datetime import datetime, date, timedelta, UTC
from uuid import uuid4

from common_grants.schemas.fields import Money, Event
from common_grants.schemas.models.opp_base import OpportunityBase
from common_grants.schemas.models.app_base import ApplicationBase
from common_grants.schemas.models.award_base import AwardBase
from common_grants.schemas.models.contact import Contact
from common_grants.schemas.models.opp_status import OppStatus, OppStatusOptions
from common_grants.schemas.models.app_status import ApplicationStatus, ApplicationStatusOptions
from common_grants.schemas.models.award_status import AwardStatus, AwardStatusOptions
from common_grants.schemas.models.opp_timeline import OppTimeline
from common_grants.schemas.models.opp_funding import OppFunding


@pytest.fixture
def sample_contact():
    """Create a sample contact for testing."""
    return Contact(
        name="Jane Smith",
        email="jane.smith@example.com",
        phone="+1-555-123-4567",
        title="Research Director",
        organization="Example Research Institute"
    )


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


@pytest.fixture
def sample_application(sample_opportunity, sample_contact):
    """Create a sample application for testing."""
    # Use a fixed date within the opportunity's timeline
    submission_date = datetime(2024, 2, 15, tzinfo=UTC)  # Between Jan 1 and Mar 31, 2024
    app = ApplicationBase(
        id=uuid4(),
        opportunity_id=sample_opportunity.id,
        applicant_id=uuid4(),
        status=ApplicationStatus(
            value=ApplicationStatusOptions.SUBMITTED,
            description="Application has been submitted"
        ),
        submitted_at=submission_date,
        created_at=submission_date,
        updated_at=submission_date,
        amount_requested=Money(amount="25000.00", currency="USD"),
        contact=sample_contact,
        documents=[]
    )
    app._opportunity = sample_opportunity  # Pass the opportunity for validation
    return app


@pytest.fixture
def sample_award(sample_opportunity, sample_application, sample_contact):
    """Create a sample award for testing."""
    return AwardBase(
        id=uuid4(),
        application_id=sample_application.id,
        opportunity_id=sample_opportunity.id,
        recipient_id=sample_application.applicant_id,
        status=AwardStatus(
            value=AwardStatusOptions.ACTIVE,
            description="Award is active and funding has been disbursed"
        ),
        amount=Money(amount="25000.00", currency="USD"),
        start_date=datetime.now(UTC),
        end_date=datetime(2025, 12, 31, tzinfo=UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        contact=sample_contact,
        documents=[]
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


def test_application_submission_timing(sample_opportunity, sample_application):
    """Test application submission timing relative to opportunity dates."""
    # Test that application was submitted after opportunity opened
    assert sample_application.submitted_at.date() >= sample_opportunity.key_dates.app_opens.date
    
    # Test that application was submitted before deadline
    assert sample_application.submitted_at.date() <= sample_opportunity.key_dates.app_deadline.date


def test_award_period_validation(sample_award):
    """Test award period validation."""
    # Test that start_date is before end_date
    assert sample_award.start_date < sample_award.end_date
    
    # Test that dates are timezone-aware
    assert sample_award.start_date.tzinfo is not None
    assert sample_award.end_date.tzinfo is not None
    
    # Test that award period is reasonable (e.g., not too long)
    max_award_period = timedelta(days=365*5)  # 5 years
    assert sample_award.end_date - sample_award.start_date <= max_award_period


def test_award_timeline_consistency(sample_opportunity, sample_application, sample_award):
    """Test consistency between application and award timelines."""
    # Test that award was created after application submission
    assert sample_award.created_at >= sample_application.submitted_at
    
    # Test that award start date is after application submission
    assert sample_award.start_date.date() >= sample_application.submitted_at.date()
    
    # Test that award end date is after opportunity deadline
    assert sample_award.end_date.date() > sample_opportunity.key_dates.app_deadline.date


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
    
    # Test award with invalid period (end before start)
    with pytest.raises(ValueError):
        AwardBase(
            id=uuid4(),
            application_id=uuid4(),
            opportunity_id=uuid4(),
            recipient_id=uuid4(),
            status=AwardStatusOptions.ACTIVE,
            amount=Money(amount="25000.00", currency="USD"),
            start_date=datetime(2025, 12, 31, tzinfo=UTC),
            end_date=datetime(2024, 1, 1, tzinfo=UTC),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            contact=Contact(
                name="Test Contact",
                email="test@example.com",
                organization="Test Org"
            ),
            documents=[]
        ) 