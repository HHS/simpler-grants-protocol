"""Base model for funding opportunities."""

from typing import TYPE_CHECKING, Any, ClassVar, Optional, Type, TypeVar
from uuid import UUID

from pydantic import Field, HttpUrl

from ..base import CommonGrantsBaseModel
from ..fields import CustomField, SystemMetadata
from .opp_funding import OppFunding
from .opp_status import OppStatus
from .opp_timeline import OppTimeline
from common_grants_sdk.utils.custom_fields import (
    add_custom_fields,
    get_custom_field_value,
)
from common_grants_sdk.extensions.specs import CustomFieldSpec

if TYPE_CHECKING:
    pass

V = TypeVar("V")  # Unbound to support both BaseModel subclasses and primitives


class OpportunityBase(SystemMetadata, CommonGrantsBaseModel):
    """Base model for a funding opportunity with all core fields."""

    # Class-level registry slot for a registered plugin
    _plugin: ClassVar[Any] = None
    # Name used as the key in SchemaExtensions and on plugin.schemas (the generator
    # emits schemas under this name, which differs from cls.__name__ = "OpportunityBase")
    _schema_extension_name: ClassVar[str] = "Opportunity"

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
    def registered_schema(cls) -> "Type[Any]":
        """Return the extended model class from the registered plugin.

        Returns this class unchanged if no plugin has been registered.

        Example::

            Opportunity = opportunity_extensions.schemas.Opportunity
            opp = Opportunity.model_validate(payload)
        """
        if cls._plugin is None:
            return cls
        model = getattr(cls._plugin.schemas, cls._schema_extension_name, None)
        return model if model is not None else cls

    @classmethod
    def with_custom_fields(
        cls, *, custom_fields: dict[str, CustomFieldSpec], model_name
    ) -> Type[Any]:
        """Return a new Opportunity model class with the typed custom fields added"""

        return add_custom_fields(cls, fields=custom_fields, model_name=model_name)

    def get_custom_field_value(self, key: str, value_type: type[V]) -> Optional[V]:
        """Returns custom field object specified by key"""

        return get_custom_field_value(self, key=key, value_type=value_type)
