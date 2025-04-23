"""Base models for grant applications."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import Field, HttpUrl, model_validator

from common_grants.schemas.base import CommonGrantsBaseModel
from common_grants.schemas.fields import Money, Event
from common_grants.schemas.models.contact import Contact


class ApplicationBase(CommonGrantsBaseModel):
    """Base model for a grant application."""
    
    id: UUID = Field(..., description="Unique identifier for the application")
    opportunity_id: UUID = Field(..., description="ID of the associated opportunity")
    applicant_id: UUID = Field(..., description="ID of the applicant")
    status: str = Field(
        default="draft",
        description="The current status of the application",
    )
    submitted_at: Optional[datetime] = Field(
        default=None,
        description="The date and time when the application was submitted",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the application was created"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the application was last updated"
    )
    amount_requested: Optional[Money] = Field(
        default=None,
        description="Amount of funding requested in the application"
    )
    contact: Contact = Field(..., description="Contact information for the applicant")
    documents: List[HttpUrl] = Field(
        default_factory=list,
        description="List of URLs to documents attached to the application"
    )

    @model_validator(mode='after')
    def validate_submission_timing(self) -> 'ApplicationBase':
        """Validate that the submission date is within the opportunity's timeline."""
        if self.submitted_at is not None:
            # In tests, the opportunity will be passed as a fixture
            # In production, this would be fetched from a database
            if hasattr(self, '_opportunity'):
                timeline = self._opportunity.timeline
                if timeline.app_opens is not None and self.submitted_at.date() < timeline.app_opens.date:
                    raise ValueError("Application submitted before opportunity opens")
                if timeline.app_deadline is not None and self.submitted_at.date() > timeline.app_deadline.date:
                    raise ValueError("Application submitted after opportunity deadline")
        return self 