"""Tests to verify compatibility between our models and the core library models."""

import json
from datetime import date, datetime, UTC
from uuid import uuid4

import pytest

from common_grants.schemas.fields import Money, Event
from common_grants.schemas.models import (
    ApplicationBase,
    ApplicationStatus,
    ApplicationStatusOptions,
    AwardBase,
    AwardStatus,
    AwardStatusOptions,
    Contact,
    OpportunityBase,
    OppFunding,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
)


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
        description="Funding for innovative research projects in renewable energy",
        status=OppStatus(
            value=OppStatusOptions.OPEN,
            description="This opportunity is currently accepting applications"
        ),
        created_at=datetime.now(UTC),
        last_modified_at=datetime.now(UTC),
        funding=OppFunding(
            total_amount_available=Money(amount="50000.00", currency="USD"),
            min_award_amount=Money(amount="10000.00", currency="USD"),
            max_award_amount=Money(amount="50000.00", currency="USD"),
            estimated_award_count=5
        ),
        key_dates=OppTimeline(
            app_opens=Event(
                name="Application Opens",
                date=date(2024, 1, 1),
                description="The date when applications will begin to be accepted"
            ),
            app_deadline=Event(
                name="Application Deadline",
                date=date(2024, 3, 31),
                description="The final date by which applications must be submitted"
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
        status=ApplicationStatus(
            value=ApplicationStatusOptions.SUBMITTED,
            description="Application has been submitted and is under review"
        ).value,
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
        status=AwardStatus(
            value=AwardStatusOptions.ACTIVE,
            description="Award is active and funding has been disbursed"
        ).value,
        amount=Money(amount="20000.00", currency="USD"),
        start_date=datetime.now(UTC),
        end_date=datetime(2025, 12, 31, tzinfo=UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        contact=sample_contact,
        documents=[]
    )


def test_opportunity_serialization(sample_opportunity):
    """Test that opportunities can be serialized and deserialized correctly."""
    # Test dictionary serialization
    opp_dict = sample_opportunity.dump()
    assert isinstance(opp_dict, dict)
    assert opp_dict["title"] == "Research Grant 2024"
    assert opp_dict["status"]["value"] == "open"
    assert opp_dict["funding"]["total_amount_available"]["amount"] == "50000.00"
    
    # Test JSON serialization
    opp_json = sample_opportunity.dump_json()
    assert isinstance(opp_json, str)
    opp_data = json.loads(opp_json)
    assert opp_data["title"] == "Research Grant 2024"
    assert opp_data["status"]["value"] == "open"
    
    # Test deserialization
    loaded_opp = OpportunityBase.from_dict(opp_dict)
    assert loaded_opp.title == sample_opportunity.title
    assert loaded_opp.status.value == sample_opportunity.status.value
    assert loaded_opp.funding.total_amount_available.amount == sample_opportunity.funding.total_amount_available.amount


def test_application_serialization(sample_application):
    """Test that applications can be serialized and deserialized correctly."""
    # Test dictionary serialization
    app_dict = sample_application.dump()
    assert isinstance(app_dict, dict)
    assert app_dict["status"] == "submitted"
    assert app_dict["amount_requested"]["amount"] == "25000.00"
    
    # Test JSON serialization
    app_json = sample_application.dump_json()
    assert isinstance(app_json, str)
    app_data = json.loads(app_json)
    assert app_data["status"] == "submitted"
    
    # Test deserialization
    loaded_app = ApplicationBase.from_dict(app_dict)
    assert loaded_app.status == sample_application.status
    assert loaded_app.amount_requested.amount == sample_application.amount_requested.amount


def test_award_serialization(sample_award):
    """Test that awards can be serialized and deserialized correctly."""
    # Test dictionary serialization
    award_dict = sample_award.dump()
    assert isinstance(award_dict, dict)
    assert award_dict["status"] == "active"
    assert award_dict["amount"]["amount"] == "20000.00"
    
    # Test JSON serialization
    award_json = sample_award.dump_json()
    assert isinstance(award_json, str)
    award_data = json.loads(award_json)
    assert award_data["status"] == "active"
    
    # Test deserialization
    loaded_award = AwardBase.from_dict(award_dict)
    assert loaded_award.status == sample_award.status
    assert loaded_award.amount.amount == sample_award.amount.amount


def test_contact_serialization(sample_contact):
    """Test that contacts can be serialized and deserialized correctly."""
    # Test dictionary serialization
    contact_dict = sample_contact.dump()
    assert isinstance(contact_dict, dict)
    assert contact_dict["name"] == "Jane Smith"
    assert contact_dict["email"] == "jane.smith@example.com"
    
    # Test JSON serialization
    contact_json = sample_contact.dump_json()
    assert isinstance(contact_json, str)
    contact_data = json.loads(contact_json)
    assert contact_data["name"] == "Jane Smith"
    
    # Test deserialization
    loaded_contact = Contact.from_dict(contact_dict)
    assert loaded_contact.name == sample_contact.name
    assert loaded_contact.email == sample_contact.email


def test_model_relationships(sample_opportunity, sample_application, sample_award):
    """Test that relationships between models are maintained correctly."""
    # Test opportunity -> application relationship
    assert sample_application.opportunity_id == sample_opportunity.id
    
    # Test application -> award relationships
    assert sample_award.application_id == sample_application.id
    assert sample_award.opportunity_id == sample_opportunity.id
    assert sample_award.recipient_id == sample_application.applicant_id


def test_status_enums():
    """Test that status enums have the correct values."""
    # Test opportunity status values
    assert OppStatusOptions.OPEN == "open"
    assert OppStatusOptions.CLOSED == "closed"
    
    # Test application status values
    assert ApplicationStatusOptions.DRAFT == "draft"
    assert ApplicationStatusOptions.SUBMITTED == "submitted"
    assert ApplicationStatusOptions.UNDER_REVIEW == "under_review"
    assert ApplicationStatusOptions.APPROVED == "approved"
    assert ApplicationStatusOptions.REJECTED == "rejected"
    assert ApplicationStatusOptions.WITHDRAWN == "withdrawn"
    
    # Test award status values
    assert AwardStatusOptions.PENDING == "pending"
    assert AwardStatusOptions.ACTIVE == "active"
    assert AwardStatusOptions.COMPLETED == "completed"
    assert AwardStatusOptions.TERMINATED == "terminated"
    assert AwardStatusOptions.SUSPENDED == "suspended"


def test_money_validation():
    """Test that money fields validate correctly."""
    # Test valid money values
    assert Money(amount="100.00", currency="USD").amount == "100.00"
    assert Money(amount="0.00", currency="USD").amount == "0.00"
    assert Money(amount="1000000.00", currency="USD").amount == "1000000.00"
    
    # Test invalid money values
    with pytest.raises(ValueError):
        Money(amount="invalid", currency="USD")
    with pytest.raises(ValueError):
        Money(amount="100.00", currency="INVALID") 