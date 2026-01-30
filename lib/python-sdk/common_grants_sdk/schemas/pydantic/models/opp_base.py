"""Base model for funding opportunities."""

from typing import Optional, Type, Any
from uuid import UUID

from pydantic import Field, HttpUrl

from ..base import CommonGrantsBaseModel
from ..fields import CustomField, SystemMetadata
from .opp_funding import OppFunding
from .opp_status import OppStatus
from .opp_timeline import OppTimeline
from common_grants_sdk.utils.custom_fields import add_custom_fields
from common_grants_sdk.extensions.specs import CustomFieldSpec


class OpportunityBase(SystemMetadata, CommonGrantsBaseModel):
    """Base model for a funding opportunity with all core fields."""

    id: UUID = Field(..., description="Globally unique id for the opportunity")
    title: str = Field(..., description="Title or name of the funding opportunity")
    status: OppStatus = Field(..., description="Status of the opportunity")
    description: str = Field(
        ...,
        description="Description of the opportunity's purpose and scope",
    )
    funding: Optional[OppFunding] = Field(
        default=None,
        description="Details about the funding available",
    )
    key_dates: Optional[OppTimeline] = Field(
        default=None,
        alias="keyDates",
        description="Key dates for the opportunity, such as when the application opens and closes",
    )
    source: Optional[HttpUrl] = Field(
        default=None,
        description="URL for the original source of the opportunity",
    )
    custom_fields: Optional[dict[str, CustomField]] = Field(
        default=None,
        alias="customFields",
        description="Additional custom fields specific to this opportunity",
    )

    @classmethod
    def with_custom_fields(
        cls, *, custom_fields: list[CustomFieldSpec], model_name
    ) -> Type[Any]:
        """Return a new Opportunity model class with the typed custom fields added"""

        return add_custom_fields(cls, fields=custom_fields, model_name=model_name)
