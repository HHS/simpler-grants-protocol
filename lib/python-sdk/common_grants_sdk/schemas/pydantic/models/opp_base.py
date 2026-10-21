"""Base model for funding opportunities."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Generic, Optional, Type, TypeVar
from uuid import UUID

import typing_extensions as te
from pydantic import ConfigDict, Field, HttpUrl, model_validator

from ..base import CommonGrantsBaseModel
from ..fields import CustomField, OppIds, SystemMetadata
from .opp_applicant_type import ApplicantType
from .opp_funding import OppFunding
from .opp_status import OppStatus
from .opp_timeline import OppTimeline
from .references import OrgRefCollection
from common_grants_sdk.utils.custom_fields import (
    add_custom_fields,
    get_custom_field_value,
)

if TYPE_CHECKING:
    from common_grants_sdk.extensions.specs import CustomFieldSpec

V = TypeVar("V")  # Unbound to support both BaseModel subclasses and primitives

# Field and wire names of the Core v0.5 additions (they are the same).
_V05_ADDITIONS = frozenset({"identifiers", "funders"})

# The opportunity's custom-fields container. Defaults to the protocol's untyped
# representation (``dict[str, CustomField]``), so the bare ``OpportunityBase``
# behaves exactly as a concrete model; plugin authors parameterize it with a typed
# ``CustomFieldSet`` (``OpportunityBase[OpportunityFields]``) for concrete access.
CF = te.TypeVar("CF", default="dict[str, CustomField]")


class OpportunityBase(SystemMetadata, CommonGrantsBaseModel, Generic[CF]):
    """Base model for a funding opportunity, generic over its custom-fields container."""

    # Unknown properties are still ignored here; only the inherited metadata closes.
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: UUID = Field(..., description="Globally unique id for the opportunity")
    title: str = Field(..., description="Title or name of the funding opportunity")
    identifiers: Optional[OppIds] = Field(
        default=None,
        description="System and registry-specific identifiers for the opportunity",
    )
    status: OppStatus = Field(..., description="Status of the opportunity")
    description: str = Field(
        ...,
        description="Description of the opportunity's purpose and scope",
    )
    funding: Optional[OppFunding] = Field(
        default=None,
        description="Details about the funding available",
    )
    funders: Optional[OrgRefCollection] = Field(
        default=None,
        description="Organization(s) offering the funding for this opportunity",
    )
    key_dates: Optional[OppTimeline] = Field(
        default=None,
        description="Key dates for the opportunity, such as when the application opens and closes",
    )
    source: Optional[HttpUrl] = Field(
        default=None,
        description="URL for the original source of the opportunity",
    )
    custom_fields: Optional[CF] = Field(
        default=None,
        description="Additional custom fields specific to this opportunity",
    )
    accepted_applicant_types: Optional[list[ApplicantType]] = Field(
        default=None,
        description="The type of applicant for the opportunity",
    )

    # Core v0.5 additions may be omitted but not null, so a null reads as omitted.
    # Scoped to these fields so the older optional fields keep a null as a value.
    @model_validator(mode="before")
    @classmethod
    def _null_v05_additions_as_omitted(cls, data: Any) -> Any:
        if isinstance(data, dict) and any(
            data.get(key, ...) is None for key in _V05_ADDITIONS
        ):
            return {
                k: v
                for k, v in data.items()
                if v is not None or k not in _V05_ADDITIONS
            }
        return data

    @classmethod
    def with_custom_fields(
        cls, *, custom_fields: dict[str, CustomFieldSpec], model_name
    ) -> Type[Any]:
        """Return a new Opportunity model class with the typed custom fields added"""

        return add_custom_fields(cls, fields=custom_fields, model_name=model_name)

    def get_custom_field_value(self, key: str, value_type: type[V]) -> Optional[V]:
        """Returns custom field object specified by key"""

        return get_custom_field_value(self, key=key, value_type=value_type)
