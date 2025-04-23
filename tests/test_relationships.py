"""Tests for model relationships between opportunities, applications, and awards."""

import pytest
from datetime import datetime, date, UTC
from uuid import UUID, uuid4

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
    return ApplicationBase(
        id=uuid4(),
        opportunity_id=sample_opportunity.id,
        applicant_id=uuid4(),
        status=ApplicationStatusOptions.SUBMITTED,
        submitted_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        amount_requested=Money(amount="25000.00", currency="USD"),
        contact=sample_contact,
        documents=[]
    )


@pytest.fixture
def sample_award(sample_opportunity, sample_application, sample_contact):
    """Create a sample award for testing."""
    return AwardBase(
        id=uuid4(),
        application_id=sample_application.id,
        opportunity_id=sample_opportunity.id,
        recipient_id=sample_application.applicant_id,
        status=AwardStatusOptions.ACTIVE,
        amount=Money(amount="25000.00", currency="USD"),
        start_date=datetime.now(UTC),
        end_date=datetime(2025, 12, 31, tzinfo=UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        contact=sample_contact,
        documents=[]
    )


def test_opportunity_application_relationship(sample_opportunity, sample_application):
    """Test the relationship between opportunity and application."""
    # Test ID relationships
    assert sample_application.opportunity_id == sample_opportunity.id
    
    # Test funding constraints
    assert float(sample_application.amount_requested.amount) <= float(sample_opportunity.funding.max_award_amount.amount)
    assert float(sample_application.amount_requested.amount) >= float(sample_opportunity.funding.min_award_amount.amount)
    
    # Test currency consistency
    assert sample_application.amount_requested.currency == sample_opportunity.funding.total_amount_available.currency
    
    # Test application can only be submitted when opportunity is open
    assert sample_opportunity.status.value == OppStatusOptions.OPEN
    assert sample_application.status == ApplicationStatusOptions.SUBMITTED


def test_application_award_relationship(sample_application, sample_award):
    """Test the relationship between application and award."""
    # Test ID relationships
    assert sample_award.application_id == sample_application.id
    assert sample_award.recipient_id == sample_application.applicant_id
    
    # Test amount consistency
    assert sample_award.amount == sample_application.amount_requested
    
    # Test status consistency
    assert sample_application.status == ApplicationStatusOptions.SUBMITTED
    assert sample_award.status == AwardStatusOptions.ACTIVE


def test_opportunity_award_relationship(sample_opportunity, sample_award):
    """Test the relationship between opportunity and award."""
    # Test ID relationships
    assert sample_award.opportunity_id == sample_opportunity.id
    
    # Test funding constraints
    assert float(sample_award.amount.amount) <= float(sample_opportunity.funding.max_award_amount.amount)
    assert float(sample_award.amount.amount) >= float(sample_opportunity.funding.min_award_amount.amount)
    
    # Test currency consistency
    assert sample_award.amount.currency == sample_opportunity.funding.total_amount_available.currency


def test_contact_consistency(sample_opportunity, sample_application, sample_award):
    """Test contact information consistency across models."""
    # All contacts should be valid
    assert sample_application.contact.email is not None
    assert sample_award.contact.email is not None
    
    # Contact information should be consistent between application and award
    assert sample_application.contact.organization == sample_award.contact.organization 