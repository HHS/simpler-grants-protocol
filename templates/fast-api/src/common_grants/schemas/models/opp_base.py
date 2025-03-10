"""Base models for funding opportunities."""

from typing import Optional
from uuid import UUID

from pydantic import Field, HttpUrl

from common_grants.schemas.fields import CustomField, SystemMetadata
from common_grants.schemas.models.opp_funding import OppFunding
from common_grants.schemas.models.opp_status import OppStatus
from common_grants.schemas.models.opp_timeline import OppTimeline


class OpportunityBase(SystemMetadata):
    """Base model for a funding opportunity with all core fields."""

    id: UUID = Field(..., description="Globally unique id for the opportunity")
    title: str = Field(..., description="Title or name of the funding opportunity")
    status: OppStatus = Field(..., description="Status of the opportunity")
    description: str = Field(
        ...,
        description="Description of the opportunity's purpose and scope",
    )
    funding: OppFunding = Field(..., description="Details about the funding available")
    key_dates: OppTimeline = Field(
        ...,
        description="Key dates for the opportunity, such as when the application opens and closes",
    )
    source: Optional[HttpUrl] = Field(
        default=None,
        description="URL for the original source of the opportunity",
    )
    custom_fields: Optional[dict[str, CustomField]] = Field(
        default=None,
        description="Additional custom fields specific to this opportunity",
    )
