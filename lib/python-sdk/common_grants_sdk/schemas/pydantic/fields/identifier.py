"""Identifier field types for the CommonGrants API.

A record's identifiers are keyed by the registry that issued them. Core's
``IdentifierT<Id, Code>`` template is defined once here, as a generic model, and
every registry-specific identifier is an instantiation of it, so the registry and
history shapes are never copied.
"""

from enum import StrEnum
from typing import Generic, Literal, Optional
from uuid import UUID

import typing_extensions as te
from pydantic import AnyUrl, ConfigDict, Field

from .._contract import NonNullOptionals, SealedModel
from ..base import CommonGrantsBaseModel
from ..types import Duns, EmployerTaxId, SamUEI


class IdentifierStatus(StrEnum):
    """The lifecycle status of an identifier value."""

    ACTIVE = "active"
    ARCHIVED = "archived"


IdT = te.TypeVar("IdT", default=str)
CodeT = te.TypeVar("CodeT", default=str)


class IdentifierRegistry(SealedModel, Generic[CodeT]):
    """Registry-level facts shared by every record in this registry."""

    code: Optional[CodeT] = Field(
        default=None,
        description="Canonical CommonGrants registry code, `<schema>:<scope>:<prop>` (e.g. `org:us:ein`).",
    )
    url: Optional[AnyUrl] = Field(
        default=None,
        description="Link to the catalog entry for this registry.",
    )


class IdentifierValue(SealedModel, Generic[IdT]):
    """One identifier value issued to a record, current or retired."""

    id: IdT = Field(..., description="The identifier string.")
    status: IdentifierStatus = Field(
        ...,
        description="Whether the identifier is currently valid or retired.",
    )


class _IdentifierT(SealedModel, Generic[IdT, CodeT]):
    """Core ``IdentifierT``: ``IdT`` constrains every value, ``CodeT`` pins the code."""

    registry: Optional[IdentifierRegistry[CodeT]] = Field(
        default=None,
        description="Registry-level facts shared by every record in this registry.",
    )
    id: Optional[IdT] = Field(
        default=None,
        description=(
            "The primary identifier string, when the registry has a single canonical "
            "value. May be omitted for registries with no natural primary; consumers "
            "should read `allIds` in that case."
        ),
    )
    all_ids: Optional[list[IdentifierValue[IdT]]] = Field(
        default=None,
        description="Every known identifier for this record in this registry, including archived values.",
    )


class Identifier(_IdentifierT[str, str]):
    """An identifier issued to a record by a registry: any value, any registry code."""


class SystemId(_IdentifierT[UUID, str]):
    """The hosting system's own identifier for a record: the record's UUID there."""


class OrgIdEin(_IdentifierT[EmployerTaxId, Literal["org:us:ein"]]):
    """An organization's Employer Identification Number (EIN), assigned by the IRS."""


class OrgIdUei(_IdentifierT[SamUEI, Literal["org:us:uei"]]):
    """An organization's Unique Entity Identifier (UEI) from SAM.gov."""


class OrgIdDuns(_IdentifierT[Duns, Literal["org:xi:duns"]]):
    """An organization's Data Universal Numbering System (DUNS) number."""


class OppIdFon(_IdentifierT[str, Literal["opp:us:fon"]]):
    """An opportunity's Funding Opportunity Number (FON), assigned by the awarding agency."""


class OppIdAln(_IdentifierT[str, Literal["opp:us:aln"]]):
    """An opportunity's Assistance Listing Number (ALN), formerly the CFDA number."""


class IdentifierCollection(NonNullOptionals, CommonGrantsBaseModel):
    """A collection of identifiers associated with a record.

    Open like Core's unsealed ``IdentifierCollection``: properties it does not
    declare are kept. The registry-specific collections that extend it are closed.
    """

    model_config = ConfigDict(extra="allow")

    system_id: Optional[SystemId] = Field(
        default=None,
        description="The hosting system's own identifier for this record.",
    )
    other_ids: Optional[dict[str, Identifier]] = Field(
        default=None,
        description=(
            "Additional identifiers keyed by their registry code, for registries the "
            "protocol does not define as a base identifier on the model."
        ),
    )


class OrgIds(IdentifierCollection):
    """A collection of identifiers associated with an organization.

    Registry-code keys keep their exact wire spelling (``org:us:ein``); in Python
    they are the snake_case attributes ``org_us_ein``, ``org_us_uei`` and
    ``org_xi_duns``.
    """

    model_config = ConfigDict(extra="forbid")

    org_us_ein: Optional[OrgIdEin] = Field(
        default=None,
        validation_alias="org:us:ein",
        serialization_alias="org:us:ein",
        description="The organization's Employer Identification Number (EIN), assigned by the IRS.",
    )
    org_us_uei: Optional[OrgIdUei] = Field(
        default=None,
        validation_alias="org:us:uei",
        serialization_alias="org:us:uei",
        description="The organization's Unique Entity Identifier (UEI) from SAM.gov.",
    )
    org_xi_duns: Optional[OrgIdDuns] = Field(
        default=None,
        validation_alias="org:xi:duns",
        serialization_alias="org:xi:duns",
        description="The organization's Data Universal Numbering System (DUNS) number.",
    )


class OppIds(IdentifierCollection):
    """A collection of identifiers associated with an opportunity.

    Registry-code keys keep their exact wire spelling (``opp:us:fon``); in Python
    they are the snake_case attributes ``opp_us_fon`` and ``opp_us_aln``.
    """

    model_config = ConfigDict(extra="forbid")

    opp_us_fon: Optional[OppIdFon] = Field(
        default=None,
        validation_alias="opp:us:fon",
        serialization_alias="opp:us:fon",
        description="The opportunity's Funding Opportunity Number (FON).",
    )
    opp_us_aln: Optional[OppIdAln] = Field(
        default=None,
        validation_alias="opp:us:aln",
        serialization_alias="opp:us:aln",
        description="The opportunity's Assistance Listing Number (ALN).",
    )


__all__ = [
    "Identifier",
    "IdentifierCollection",
    "IdentifierRegistry",
    "IdentifierStatus",
    "IdentifierValue",
    "OppIdAln",
    "OppIdFon",
    "OppIds",
    "OrgIdDuns",
    "OrgIdEin",
    "OrgIdUei",
    "OrgIds",
    "SystemId",
]
