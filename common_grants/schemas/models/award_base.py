"""Base models for grant awards."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import Field, HttpUrl

from common_grants.schemas.base import CommonGrantsBaseModel
from common_grants.schemas.fields import Money
from common_grants.schemas.models.contact import Contact


class AwardBase(CommonGrantsBaseModel):
    """Base model for a grant award."""
    
    id: UUID = Field(..., description="Unique identifier for the award")
    application_id: UUID = Field(..., description="ID of the associated application")
    opportunity_id: UUID = Field(..., description="ID of the associated opportunity")
    recipient_id: UUID = Field(..., description="ID of the award recipient")
    status: str = Field(..., description="Status of the award")
    amount: Money = Field(..., description="Amount of funding awarded")
    start_date: datetime = Field(..., description="Start date of the award period")
    end_date: Optional[datetime] = Field(
        default=None,
        description="End date of the award period"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the award was created"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the award was last updated"
    )
    contact: Contact = Field(..., description="Contact information for the award recipient")
    documents: List[HttpUrl] = Field(
        default_factory=list,
        description="List of URLs to documents related to the award"
    ) 