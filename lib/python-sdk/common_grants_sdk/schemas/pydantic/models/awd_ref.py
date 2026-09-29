"""DRAFT, NOT FOR MERGE. Written for the #1221-T4 validation pass.

Drafted to answer one question before ``OpportunityDetails.awards`` ships in
Core v0.5: can the award reference stack be modelled in Pydantic today, and
what does it cost? Scoped to what ``awards`` needs, not the whole award
surface, which #1156 owns.

UNEXECUTED. This machine has Python 3.9.6 with no poetry, pyenv or uv, while
the SDK needs 3.11+ (``schemas/pydantic/base.py`` imports ``typing.Self``).
So ``make checks``, ``make test`` and ``generate_models.sh`` were all
unavailable, and everything below is static review only. #1220-T5 hit the
same wall. Re-run this half on a 3.11+ environment before the v0.9 SDK
tickets rely on it.

Not wired into ``models/__init__.py``, so the published package is unchanged.
"""

from __future__ import annotations

from typing import Literal, Optional
from uuid import UUID

from pydantic import Field, HttpUrl

from ..base import CommonGrantsBaseModel
from .opp_base import OpportunityBase


class Registry(CommonGrantsBaseModel):
    """Registry-level facts shared by every record in a registry."""

    code: Optional[str] = Field(
        default=None,
        description="Canonical CommonGrants registry code, `<schema>:<scope>:<prop>`",
    )
    url: Optional[HttpUrl] = Field(
        default=None,
        description="Link to the catalog entry for this registry",
    )


class FainRegistry(Registry):
    """The FAIN registry, whose code is pinned to a single value."""

    code: Optional[Literal["awd:us:fain"]] = Field(
        default=None,
        description="Canonical CommonGrants registry code for the FAIN registry",
    )


class IdentifierValue(CommonGrantsBaseModel):
    """One known identifier value for a record in a registry."""

    id: str = Field(..., description="The identifier string")
    status: Literal["active", "archived"] = Field(
        ...,
        description="Whether the identifier is currently valid or retired",
    )


class Identifier(CommonGrantsBaseModel):
    """An identifier issued to a record by a registry.

    Every member is optional, including ``registry`` itself, because
    ``IdentifierT`` declares ``registry?`` with ``code?``
    (``lib/core/lib/core/fields/identifier.tsp``). Requiring either, which is
    the intuitive way to hand-write this, rejects records the protocol
    accepts; the Zod half of this pass found that by fuzzing.
    """

    registry: Optional[Registry] = Field(
        default=None,
        description="Registry-level facts shared by every record in this registry",
    )
    id: Optional[str] = Field(
        default=None,
        description=(
            "The primary identifier string, when the registry has a single "
            "canonical value"
        ),
    )
    all_ids: Optional[list[IdentifierValue]] = Field(
        default=None,
        description=(
            "Every known identifier for this record in this registry, "
            "including archived values"
        ),
    )


class SystemIdValue(CommonGrantsBaseModel):
    """One known system identifier value, whose value is a uuid."""

    id: UUID = Field(..., description="The identifier string")
    status: Literal["active", "archived"] = Field(
        ...,
        description="Whether the identifier is currently valid or retired",
    )


class SystemId(CommonGrantsBaseModel):
    """The hosting system's own identifier for a record."""

    registry: Optional[Registry] = Field(
        default=None,
        description="Registry-level facts shared by every record in this registry",
    )
    id: Optional[UUID] = Field(
        default=None,
        description="The record's uuid within the hosting system",
    )
    all_ids: Optional[list[SystemIdValue]] = Field(
        default=None,
        description="Every known identifier for this record in this registry",
    )


class AwdIdFain(CommonGrantsBaseModel):
    """The award's Federal Award Identification Number (FAIN)."""

    registry: Optional[FainRegistry] = Field(
        default=None,
        description="Registry-level facts for the FAIN registry",
    )
    id: Optional[str] = Field(
        default=None,
        description="The award's FAIN",
    )
    all_ids: Optional[list[IdentifierValue]] = Field(
        default=None,
        description="Every known FAIN for this award, including archived values",
    )


class AwdIds(CommonGrantsBaseModel):
    """A collection of identifiers associated with an award.

    The protocol composes this from ``IdentifierCollection`` through ``allOf``
    and seals the result, so the protocol's accepted key set is the union of
    both. This draft flattens the inherited ``systemId`` and ``otherIds`` in,
    which names the same keys.

    It does NOT reproduce the seal. ``CommonGrantsBaseModel`` sets no ``extra``
    and pydantic defaults to ``extra="ignore"``, so this model silently accepts
    unknown keys that the protocol's ``unevaluatedProperties: {not: {}}``
    rejects. That is a package-wide convention rather than a flaw in this
    draft, but it means the Python half is looser than both the protocol and
    the Zod half, which uses ``.strict()``. Closing it would mean
    ``extra="forbid"`` on the shared base, which is a decision for the v0.9
    alignment work.

    ``awd:us:fain`` is not a valid Python attribute name, so it needs an
    explicit field-level alias; the shared camelCase generator cannot produce
    it. That is a real ergonomic cost of registry-coded keys and is the main
    thing this draft establishes for the Python side.
    """

    system_id: Optional[SystemId] = Field(
        default=None,
        description="The hosting system's own identifier for this record",
    )
    fain: Optional[AwdIdFain] = Field(
        default=None,
        validation_alias="awd:us:fain",
        serialization_alias="awd:us:fain",
        description="The award's Federal Award Identification Number (FAIN)",
    )
    other_ids: Optional[dict[str, Identifier]] = Field(
        default=None,
        description=(
            "Additional identifiers keyed by their registry code, for "
            "registries the protocol does not define as a base identifier"
        ),
    )


class AwdRef(CommonGrantsBaseModel):
    """A reference to an award.

    ``id`` carries ``@visibility(Lifecycle.Read)`` in the TypeSpec, which the
    JSON Schema emitter drops entirely, so a schema-generated SDK cannot tell
    the read and write shapes apart. This models the read shape.
    """

    id: UUID = Field(..., description="Globally unique id for the award")
    title: str = Field(..., description="Title or name of the award")
    identifiers: Optional[AwdIds] = Field(
        default=None,
        description="System and registry-specific identifiers for the award",
    )


class OpportunityDetails(OpportunityBase):
    """A funding opportunity with additional details.

    ``competitions`` is left untyped on purpose: ``CompetitionBase`` has no
    Pydantic model (#1156) and typing it is not needed to answer this pass's
    question about ``awards``.

    Note the inheritance cost. Python ``OpportunityBase`` does not carry
    ``identifiers`` or ``funders`` at all, because #1219 and #1220 never
    touched this package, so this subclass is a v0.5 detail shape sitting on a
    base that is still missing two other v0.5 fields. The v0.9 alignment work
    has to land those before this class describes a real v0.5 response.
    """

    competitions: Optional[list[dict]] = Field(
        default=None,
        description="The competitions associated with the opportunity",
    )
    awards: Optional[list[AwdRef]] = Field(
        default=None,
        description="Awards that resulted from this opportunity, as references",
    )
