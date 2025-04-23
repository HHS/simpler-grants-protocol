"""Tests for status models."""

import pytest

from common_grants.schemas.models.opp_status import OppStatus, OppStatusOptions
from common_grants.schemas.models.app_status import ApplicationStatus, ApplicationStatusOptions
from common_grants.schemas.models.award_status import AwardStatus, AwardStatusOptions


def test_opportunity_status():
    """Test opportunity status model."""
    # Valid cases
    status = OppStatus(
        value=OppStatusOptions.OPEN,
        description="This opportunity is currently accepting applications"
    )
    assert status.value == "open"
    assert status.description == "This opportunity is currently accepting applications"
    
    status = OppStatus(
        value=OppStatusOptions.CLOSED,
        description="This opportunity is no longer accepting applications"
    )
    assert status.value == "closed"
    
    # Invalid cases
    with pytest.raises(ValueError):
        OppStatus(
            value="invalid",
            description="test"
        )
    
    with pytest.raises(ValueError):
        OppStatus(
            value=OppStatusOptions.OPEN,
            description=""  # Empty description
        )


def test_application_status():
    """Test application status model."""
    # Valid cases
    status = ApplicationStatus(
        value=ApplicationStatusOptions.DRAFT,
        description="Application is in draft state"
    )
    assert status.value == "draft"
    
    status = ApplicationStatus(
        value=ApplicationStatusOptions.SUBMITTED,
        description="Application has been submitted"
    )
    assert status.value == "submitted"
    
    status = ApplicationStatus(
        value=ApplicationStatusOptions.UNDER_REVIEW,
        description="Application is under review"
    )
    assert status.value == "under_review"
    
    status = ApplicationStatus(
        value=ApplicationStatusOptions.APPROVED,
        description="Application has been approved"
    )
    assert status.value == "approved"
    
    status = ApplicationStatus(
        value=ApplicationStatusOptions.REJECTED,
        description="Application has been rejected"
    )
    assert status.value == "rejected"
    
    status = ApplicationStatus(
        value=ApplicationStatusOptions.WITHDRAWN,
        description="Application has been withdrawn"
    )
    assert status.value == "withdrawn"
    
    # Test status transitions
    assert ApplicationStatusOptions.DRAFT < ApplicationStatusOptions.SUBMITTED
    assert ApplicationStatusOptions.SUBMITTED < ApplicationStatusOptions.UNDER_REVIEW
    assert ApplicationStatusOptions.UNDER_REVIEW < ApplicationStatusOptions.APPROVED
    assert ApplicationStatusOptions.UNDER_REVIEW < ApplicationStatusOptions.REJECTED
    
    # Invalid cases
    with pytest.raises(ValueError):
        ApplicationStatus(
            value="invalid",
            description="test"
        )
    
    with pytest.raises(ValueError):
        ApplicationStatus(
            value=ApplicationStatusOptions.DRAFT,
            description=""  # Empty description
        )


def test_award_status():
    """Test award status model."""
    # Valid cases
    status = AwardStatus(
        value=AwardStatusOptions.PENDING,
        description="Award is pending activation"
    )
    assert status.value == "pending"
    
    status = AwardStatus(
        value=AwardStatusOptions.ACTIVE,
        description="Award is active"
    )
    assert status.value == "active"
    
    status = AwardStatus(
        value=AwardStatusOptions.COMPLETED,
        description="Award has been completed"
    )
    assert status.value == "completed"
    
    status = AwardStatus(
        value=AwardStatusOptions.TERMINATED,
        description="Award has been terminated"
    )
    assert status.value == "terminated"
    
    status = AwardStatus(
        value=AwardStatusOptions.SUSPENDED,
        description="Award has been suspended"
    )
    assert status.value == "suspended"
    
    # Test status transitions
    assert AwardStatusOptions.PENDING < AwardStatusOptions.ACTIVE
    assert AwardStatusOptions.ACTIVE < AwardStatusOptions.COMPLETED
    assert AwardStatusOptions.ACTIVE < AwardStatusOptions.TERMINATED
    assert AwardStatusOptions.ACTIVE < AwardStatusOptions.SUSPENDED
    
    # Invalid cases
    with pytest.raises(ValueError):
        AwardStatus(
            value="invalid",
            description="test"
        )
    
    with pytest.raises(ValueError):
        AwardStatus(
            value=AwardStatusOptions.PENDING,
            description=""  # Empty description
        ) 