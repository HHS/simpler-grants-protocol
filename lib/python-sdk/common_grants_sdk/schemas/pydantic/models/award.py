"""Award models for the CommonGrants API.

Custom fields live on the nested individual recipient, not on the award. Both are
generic so a consumer can type them::

    class RecipientFields(CustomFieldSet):
        scholarship_year: Optional[CustomField[int]] = None

    TypedAward = AwardBase[AwdRecipientIndividual[RecipientFields]]

Bare ``AwardBase`` defaults to ``AwdRecipientIndividual``, whose custom fields
default to the protocol's untyped ``dict[str, CustomField]``.
"""

from enum import StrEnum
from typing import Any, Generic, Literal, Optional
from uuid import UUID

import typing_extensions as te
from pydantic import AnyUrl, ConfigDict, Field

from .._contract import SealedModel
from ..fields import (
    CustomField,
    Event,
    IdentifierCollection,
    Money,
    Name,
    SystemMetadata,
)
from ..fields.identifier import _IdentifierT
from .references import AppRef, OppRef, OrgRefCollection

# ############################################################
# Status
# ############################################################


class AwdStatusOptions(StrEnum):
    """The set of values accepted for award status."""

    AWARDED = "awarded"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CUSTOM = "custom"


class AwdStatus(SealedModel):
    """The status of the award."""

    value: AwdStatusOptions = Field(
        ...,
        description="The selected value, from a predefined set of options",
    )
    custom_value: Optional[str] = Field(
        default=None,
        description="A custom value, used when the selected value is the `custom` option",
    )
    description: Optional[str] = Field(
        default=None,
        description="A human-readable description of the value",
    )


# ############################################################
# Funding and timeline
# ############################################################


class AwdFunding(SealedModel):
    """Financial details about the award: amounts requested, awarded, and disbursed."""

    details: Optional[str] = Field(
        default=None,
        description="Details about the award's funding that don't fit other fields",
    )
    requested_amount: Optional[Money] = Field(
        default=None,
        description="Amount of funding requested by the recipient",
    )
    awarded_amount: Optional[Money] = Field(
        default=None,
        description="Amount of funding awarded to the recipient",
    )
    disbursed_amount: Optional[Money] = Field(
        default=None,
        description="Amount of funding disbursed to the recipient so far",
    )


class AwdTimeline(SealedModel):
    """Key dates in the award's timeline, such as the award date and period of performance."""

    award_date: Optional[Event] = Field(
        default=None,
        description="The date (and time) on which the award was issued",
    )
    period_of_performance: Optional[Event] = Field(
        default=None,
        description="The period during which the funded work is expected to be performed",
    )
    other_dates: Optional[dict[str, Event]] = Field(
        default=None,
        description="An optional map of other key dates or events in the award timeline",
    )


# ############################################################
# Identifiers and references
# ############################################################


class AwdIdFain(_IdentifierT[str, Literal["awd:us:fain"]]):
    """An award's Federal Award Identification Number (FAIN), assigned by the awarding agency."""


class AwdIds(IdentifierCollection):
    """A collection of identifiers associated with an award.

    The ``awd:us:fain`` wire key is the ``awd_us_fain`` attribute in Python.
    """

    model_config = ConfigDict(extra="forbid")

    awd_us_fain: Optional[AwdIdFain] = Field(
        default=None,
        validation_alias="awd:us:fain",
        serialization_alias="awd:us:fain",
        description="The award's Federal Award Identification Number (FAIN).",
    )


class AwdRef(SealedModel):
    """A reference to an award, such as the parent of an amendment or tranche."""

    id: UUID = Field(..., description="Globally unique id for the award")
    title: str = Field(..., description="Title or name of the award")
    identifiers: Optional[AwdIds] = Field(
        default=None,
        description="System and registry-specific identifiers for the award",
    )


# ############################################################
# Recipient
# ############################################################

# The recipient's custom-fields container: the protocol's untyped map by default,
# or a ``CustomFieldSet`` subclass for typed access.
RecipientCF = te.TypeVar("RecipientCF", default=dict[str, CustomField])


class AwdRecipientIndividual(SealedModel, Generic[RecipientCF]):
    """An individual who received an award, when the recipient is a person."""

    name: Optional[Name] = Field(default=None, description="The individual's name.")
    identifiers: Optional[IdentifierCollection] = Field(
        default=None,
        description="Identifiers associated with the individual, keyed by registry code.",
    )
    custom_fields: Optional[RecipientCF] = Field(
        default=None,
        description="Custom fields about the individual recipient.",
    )


# ############################################################
# Award
# ############################################################

RecipientT = te.TypeVar(
    "RecipientT",
    bound=AwdRecipientIndividual[Any],
    default=AwdRecipientIndividual,
)


class AwardBase(SystemMetadata, SealedModel, Generic[RecipientT]):
    """A grant award, generic over its individual-recipient model."""

    id: UUID = Field(..., description="Globally unique id for the award")
    title: str = Field(..., description="Title or name of the award")
    identifiers: Optional[AwdIds] = Field(
        default=None,
        description="System and registry-specific identifiers for the award",
    )
    description: str = Field(..., description="Description of the award's purpose")
    status: AwdStatus = Field(..., description="Lifecycle status of the award")
    funding: Optional[AwdFunding] = Field(
        default=None,
        description="Requested, awarded, and disbursed amounts",
    )
    key_dates: Optional[AwdTimeline] = Field(
        default=None,
        description="Award date and period of performance",
    )
    opportunity: Optional[OppRef] = Field(
        default=None,
        description="The opportunity this award resulted from",
    )
    application: Optional[AppRef] = Field(
        default=None,
        description="The application this award resulted from",
    )
    funders: Optional[OrgRefCollection] = Field(
        default=None,
        description="Organization(s) that funded the award",
    )
    recipient_organizations: Optional[OrgRefCollection] = Field(
        default=None,
        description="Organization(s) that received the award, if the recipient is an organization",
    )
    recipient_individual: Optional[RecipientT] = Field(
        default=None,
        description="The individual who received the award, if the recipient is a person",
    )
    parent: Optional[AwdRef] = Field(
        default=None,
        description="Parent award, for amendments or multi-tranche awards",
    )
    source: Optional[AnyUrl] = Field(
        default=None,
        description="URL for the canonical source record of the award",
    )


__all__ = [
    "AwardBase",
    "AwdFunding",
    "AwdIdFain",
    "AwdIds",
    "AwdRecipientIndividual",
    "AwdRef",
    "AwdStatus",
    "AwdStatusOptions",
    "AwdTimeline",
]
