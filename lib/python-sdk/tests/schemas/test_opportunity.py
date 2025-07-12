"""Tests for timeline validation in opportunities, applications, and awards."""

import pytest
from datetime import datetime, date, UTC
from uuid import uuid4

from common_grants_sdk.schemas.fields import Money, EventType, SingleDateEvent
from common_grants_sdk.schemas.models.opp_base import OpportunityBase
from common_grants_sdk.schemas.models.opp_funding import OppFunding
from common_grants_sdk.schemas.models.opp_status import OppStatus, OppStatusOptions
from common_grants_sdk.schemas.models.opp_timeline import OppTimeline


@pytest.fixture
def sample_opportunity():
    """Create a sample opportunity for testing."""
    return OpportunityBase.model_validate(
        {
            "id": uuid4(),
            "title": "Research Grant 2024",
            "description": "Funding for innovative research projects",
            "status": {
                "value": OppStatusOptions.OPEN,
                "description": "This opportunity is currently accepting applications",
            },
            "createdAt": datetime.now(UTC),
            "lastModifiedAt": datetime.now(UTC),
            "funding": {
                "totalAmountAvailable": {"amount": "100000.00", "currency": "USD"},
                "minAwardAmount": {"amount": "10000.00", "currency": "USD"},
                "maxAwardAmount": {"amount": "50000.00", "currency": "USD"},
                "estimatedAwardCount": 5,
            },
            "keyDates": {
                "postDate": {
                    "name": "Application Posted",
                    "eventType": "singleDate",
                    "date": date(2024, 1, 1),
                    "description": "Applications posted",
                },
                "closeDate": {
                    "name": "Application Deadline",
                    "eventType": "singleDate",
                    "date": date(2024, 3, 31),
                    "description": "Applications close",
                },
            },
        }
    )


@pytest.fixture
def minimal_opportunity():
    """Create a minimal opportunity with only required fields."""
    return OpportunityBase.model_validate(
        {
            "id": uuid4(),
            "title": "Minimal Research Grant",
            "description": "Funding for innovative research projects",
            "status": {
                "value": OppStatusOptions.OPEN,
            },
            "createdAt": datetime.now(UTC),
            "lastModifiedAt": datetime.now(UTC),
        }
    )


def test_opportunity_timeline_validation(sample_opportunity):
    """Test opportunity timeline validation."""
    # Test that post_date is before close_date
    assert (
        sample_opportunity.key_dates.post_date.date
        < sample_opportunity.key_dates.close_date.date
    )

    # Test that dates are valid
    assert isinstance(sample_opportunity.key_dates.post_date.date, date)
    assert isinstance(sample_opportunity.key_dates.close_date.date, date)

    # Test that event names are not empty
    assert sample_opportunity.key_dates.post_date.name
    assert sample_opportunity.key_dates.close_date.name

    # Test that event types are correct
    assert sample_opportunity.key_dates.post_date.event_type == EventType.SINGLE_DATE
    assert sample_opportunity.key_dates.close_date.event_type == EventType.SINGLE_DATE


def test_minimal_opportunity_validation(minimal_opportunity):
    """Test that minimal opportunity with only required fields works."""
    assert minimal_opportunity.id is not None
    assert minimal_opportunity.title == "Minimal Research Grant"
    assert minimal_opportunity.description == "Funding for innovative research projects"
    assert minimal_opportunity.status.value == OppStatusOptions.OPEN
    assert minimal_opportunity.funding is None
    assert minimal_opportunity.key_dates is None
    assert minimal_opportunity.source is None
    assert minimal_opportunity.custom_fields is None


def test_optional_funding_fields():
    """Test that funding fields are optional."""
    funding = OppFunding(
        totalAmountAvailable=Money(amount="100000.00", currency="USD"),
        details="Additional funding information",
    )
    assert funding.total_amount_available is not None
    assert funding.details == "Additional funding information"
    assert funding.min_award_amount is None
    assert funding.max_award_amount is None
    assert funding.min_award_count is None
    assert funding.max_award_count is None
    assert funding.estimated_award_count is None


def test_optional_status_description():
    """Test that status description is optional."""
    status = OppStatus(value=OppStatusOptions.OPEN)
    assert status.value == OppStatusOptions.OPEN
    assert status.description is None
    assert status.custom_value is None

    status_with_desc = OppStatus(
        value=OppStatusOptions.OPEN,
        description="This opportunity is currently accepting applications",
    )
    assert (
        status_with_desc.description
        == "This opportunity is currently accepting applications"
    )


def test_optional_timeline_fields():
    """Test that timeline fields are optional."""
    timeline = OppTimeline()
    assert timeline.post_date is None
    assert timeline.close_date is None
    assert timeline.other_dates is None

    timeline_with_post = OppTimeline(
        postDate=SingleDateEvent(
            name="Application Posted",
            event_type=EventType.SINGLE_DATE,
            date=date(2024, 1, 1),
        )
    )
    assert timeline_with_post.post_date is not None
    assert timeline_with_post.close_date is None
    assert timeline_with_post.other_dates is None


def test_opportunity_with_custom_fields():
    """Test opportunity with custom fields."""
    from common_grants_sdk.schemas.fields import CustomFieldType

    opportunity = OpportunityBase.model_validate(
        {
            "id": uuid4(),
            "title": "Custom Field Test",
            "description": "Testing custom fields",
            "status": {
                "value": OppStatusOptions.OPEN,
            },
            "createdAt": datetime.now(UTC),
            "lastModifiedAt": datetime.now(UTC),
            "customFields": {
                "programArea": {
                    "name": "programArea",
                    "fieldType": CustomFieldType.STRING,
                    "value": "Healthcare Innovation",
                    "description": "Primary focus area of the grant program",
                    "schema": "https://example.com/schema",
                }
            },
        }
    )

    assert opportunity.custom_fields is not None
    assert "programArea" in opportunity.custom_fields
    custom_field = opportunity.custom_fields["programArea"]
    assert custom_field.name == "programArea"
    assert custom_field.field_type == CustomFieldType.STRING
    assert custom_field.value == "Healthcare Innovation"
    assert str(custom_field.schema_url) == "https://example.com/schema"
