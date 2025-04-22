"""Contact information models."""

from typing import Optional

from pydantic import Field, EmailStr

from common_grants.schemas.base import CommonGrantsBaseModel


class Contact(CommonGrantsBaseModel):
    """Contact information for a grant-related entity."""
    
    name: str = Field(..., description="Full name of the contact person")
    email: EmailStr = Field(..., description="Email address of the contact person")
    phone: Optional[str] = Field(
        default=None,
        description="Phone number of the contact person"
    )
    title: Optional[str] = Field(
        default=None,
        description="Job title or role of the contact person"
    )
    organization: Optional[str] = Field(
        default=None,
        description="Organization the contact person represents"
    ) 