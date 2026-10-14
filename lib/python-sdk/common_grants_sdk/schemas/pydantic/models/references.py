"""References to other records: the key fields needed to identify and look them up.

A reference previews a record; it is not the full resource model.
"""

from typing import Optional
from uuid import UUID

from pydantic import Field

from .._contract import SealedModel
from ..fields import OppIds, OrgIds


class AppRef(SealedModel):
    """A reference to an application, such as the one an award resulted from."""

    id: UUID = Field(..., description="The unique identifier for the application")
    title: str = Field(..., description="The title of the application")


class OppRef(SealedModel):
    """A reference to an opportunity, such as the one an award resulted from."""

    id: UUID = Field(..., description="Globally unique id for the opportunity")
    title: str = Field(..., description="Title or name of the funding opportunity")
    identifiers: Optional[OppIds] = Field(
        default=None,
        description="System and registry-specific identifiers for the opportunity",
    )


class OrgRef(SealedModel):
    """A reference to an organization, such as an award's funder or recipient."""

    id: UUID = Field(..., description="The organization's unique identifier.")
    name: str = Field(
        ...,
        description="The name this organization is known by; for a legal entity, its legal name.",
    )
    identifiers: Optional[OrgIds] = Field(
        default=None,
        description="Identifiers associated with the organization, keyed by registry code.",
    )


class OrgRefCollection(SealedModel):
    """A primary organization reference plus others keyed by an implementation-defined role."""

    primary: OrgRef = Field(
        ..., description="The primary organization in the collection."
    )
    other_orgs: Optional[dict[str, OrgRef]] = Field(
        default=None,
        description="Other organizations in the collection, keyed by an implementation-defined role.",
    )


__all__ = [
    "AppRef",
    "OppRef",
    "OrgRef",
    "OrgRefCollection",
]
