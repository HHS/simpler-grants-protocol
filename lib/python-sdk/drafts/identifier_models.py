"""DRAFT Pydantic models for the CommonGrants identifier shapes.

Written for the #1219-T5 validation pass, not for release. Lives outside
``common_grants_sdk`` so nothing imports it by accident; the point is to have a
hand-written counterpart to diff against ``datamodel-codegen`` output before the
v0.9 SDK-alignment tickets commit to a shape.

Mirrors ``lib/ts-sdk/src/schemas/zod/identifiers.ts`` and follows the style of
``common_grants_sdk/schemas/pydantic/models/opp_base.py``. ``Optional[...]`` is
used rather than PEP 604 unions on purpose: the generated models this is
compared against emit ``Optional[...]``, and matching them keeps the diff about
semantics instead of syntax.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Generic, Literal, Optional, TypeVar
from uuid import UUID

from pydantic import ConfigDict, Field, HttpUrl

from common_grants_sdk.schemas.pydantic.base import CommonGrantsBaseModel

# The registry code pinned onto a concrete identifier (``Literal["opp:us:fon"]``
# for a typed instantiation, ``str`` for the generic form), and the identifier
# value's type (``str`` everywhere except ``SystemId``, which carries a UUID).
CodeT = TypeVar("CodeT")
IdT = TypeVar("IdT")


class IdentifierStatus(StrEnum):
    """The lifecycle status of an identifier value."""

    ACTIVE = "active"
    ARCHIVED = "archived"


class RegistryRef(CommonGrantsBaseModel, Generic[CodeT]):
    """Registry-level facts shared by every record in a registry."""

    model_config = ConfigDict(extra="forbid")

    code: Optional[CodeT] = Field(
        default=None,
        description="Canonical CommonGrants registry code, `<schema>:<scope>:<prop>`",
    )
    url: Optional[HttpUrl] = Field(
        default=None,
        description="Link to the catalog entry for this registry",
    )


class IdentifierValue(CommonGrantsBaseModel, Generic[IdT]):
    """One known identifier value and its lifecycle status."""

    model_config = ConfigDict(extra="forbid")

    id: IdT = Field(..., description="The identifier string")
    status: IdentifierStatus = Field(
        ...,
        description="Whether the identifier is currently valid or retired",
    )


class IdentifierT(CommonGrantsBaseModel, Generic[CodeT, IdT]):
    """An identifier issued to a record by a registry.

    The Pydantic equivalent of ``Fields.IdentifierT``, taking its type
    parameters in the opposite order to the TypeSpec template (``<Id, Code>``
    there) so the pinned registry code reads first at each instantiation. Every
    field is optional, matching the protocol, which declares no required
    properties on the template. ``extra="forbid"`` stands in for the
    ``unevaluatedProperties: {not: {}}`` the emitter puts on each instantiation.
    """

    model_config = ConfigDict(extra="forbid")

    registry: Optional[RegistryRef[CodeT]] = Field(
        default=None,
        description="Registry-level facts shared by every record in this registry",
    )
    id: Optional[IdT] = Field(
        default=None,
        description="The primary identifier string, when the registry has one",
    )
    all_ids: Optional[list[IdentifierValue[IdT]]] = Field(
        default=None,
        alias="allIds",
        description="Every known identifier for this record in this registry",
    )


# An identifier issued by any registry, used for extension identifiers.
Identifier = IdentifierT[str, str]

# The hosting system's own identifier for a record; its value is the record UUID.
SystemId = IdentifierT[str, UUID]

# An opportunity's Federal Opportunity Number, assigned by the awarding agency.
OppIdFon = IdentifierT[Literal["opp:us:fon"], str]

# An opportunity's Assistance Listing Number, formerly the CFDA number.
OppIdAln = IdentifierT[Literal["opp:us:aln"], str]


class IdentifierCollection(CommonGrantsBaseModel):
    """A collection of identifiers associated with a record.

    Deliberately not ``extra="forbid"``: the protocol leaves
    ``IdentifierCollection`` open and seals only the concrete collections that
    extend it.
    """

    system_id: Optional[SystemId] = Field(
        default=None,
        alias="systemId",
        description="The hosting system's own identifier for this record",
    )
    other_ids: Optional[dict[str, Identifier]] = Field(
        default=None,
        alias="otherIds",
        description="Additional identifiers keyed by their registry code",
    )


class OppIds(IdentifierCollection):
    """A collection of identifiers associated with an opportunity.

    The registry codes are not valid Python attribute names, so each base
    identifier takes a snake_case attribute and a field-level alias carrying the
    wire key. The alias survives ``CommonGrantsBaseModel``'s camelCase
    ``AliasGenerator`` because a field-level alias defaults to
    ``alias_priority=2``, which the generator does not override.
    """

    model_config = ConfigDict(extra="forbid")

    opp_us_fon: Optional[OppIdFon] = Field(
        default=None,
        alias="opp:us:fon",
        description="The opportunity's Federal Opportunity Number (FON)",
    )
    opp_us_aln: Optional[OppIdAln] = Field(
        default=None,
        alias="opp:us:aln",
        description="The opportunity's Assistance Listing Number (ALN)",
    )


class OppRef(CommonGrantsBaseModel):
    """A reference to an opportunity, previewing the fields needed to identify it."""

    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(..., description="Globally unique id for the opportunity")
    title: str = Field(..., description="Title or name of the funding opportunity")
    identifiers: Optional[OppIds] = Field(
        default=None,
        description="System and registry-specific identifiers for the opportunity",
    )
