"""Base models for grant applications."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import Field, HttpUrl

from common_grants.schemas.base import CommonGrantsBaseModel
from common_grants.schemas.fields import Money
from common_grants.schemas.models.contact import Contact


class ApplicationBase(CommonGrantsBaseModel):
    """Base model for a grant application."""
    
    id: UUID = Field(..., description="Unique identifier for the application")
    opportunity_id: UUID = Field(..., description="ID of the associated opportunity")
    applicant_id: UUID = Field(..., description="ID of the applicant")
    status: str = Field(..., description="Status of the application")
    submitted_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when the application was submitted"
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