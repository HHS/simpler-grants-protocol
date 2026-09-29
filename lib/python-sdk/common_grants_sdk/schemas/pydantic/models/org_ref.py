"""Organization reference models.

DRAFT (#1220-T5 validation pass). Not exported from the package and not
intended to merge as-is. The purpose is to find out what a typed
``OrgRefCollection`` costs in Pydantic before the v0.9 SDK alignment tickets
commit to one.
"""

from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from pydantic import Field

from ..base import CommonGrantsBaseModel


class OrgRef(CommonGrantsBaseModel):
    """A reference to an organization.

    ``identifiers`` is left untyped. The protocol types it as ``OrgIds``, which
    seals the object to three base registry codes plus ``systemId`` and
    ``otherIds``. Modeling that needs the identifier models the SDK does not
    have yet, so this draft accepts any mapping.
    """

    id: UUID = Field(..., description="The organization's unique identifier.")
    name: str = Field(
        ...,
        description=(
            "The organization's legal name as registered with relevant authorities."
        ),
    )
    identifiers: Optional[dict[str, Any]] = Field(
        default=None,
        description="Identifiers associated with the organization, keyed by registry code.",
    )


class OrgRefCollection(CommonGrantsBaseModel):
    """A group of organization references, with a primary and optional others."""

    primary: OrgRef = Field(
        ...,
        description="The primary organization in the collection.",
    )
    other_orgs: Optional[dict[str, OrgRef]] = Field(
        default=None,
        description=(
            "Other organizations in the collection, keyed by an "
            "implementation-defined role."
        ),
    )
