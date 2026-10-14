"""Negative type fixtures for the award models: these SHOULD fail pyright.

Excluded from the main type gate (``pyrightconfig.json``); its own config,
``pyrightconfig.awards-fixtures.json``, and::

    cd lib/python-sdk && make check-award-fixtures

verify that pyright reports exactly one error per marked line, no more. Each
proves a typing guarantee the award models make, including that the bare defaults
are the untyped custom-field map rather than ``Any``.
"""

from __future__ import annotations

from typing import Optional

from common_grants_sdk.extensions import CustomField, CustomFieldSet
from common_grants_sdk.schemas import (
    AwardBase,
    AwardResponse,
    AwardsListResponse,
    AwdRecipientIndividual,
)


class RecipientFields(CustomFieldSet):
    scholarship_year: Optional[CustomField[int]] = None


TypedAward = AwardBase[AwdRecipientIndividual[RecipientFields]]


def typed(award: TypedAward) -> None:
    recipient = award.recipient_individual
    assert recipient is not None and recipient.custom_fields is not None
    field = recipient.custom_fields.scholarship_year
    assert field is not None

    # 1. A typed value keeps its type: an int is not a str.
    _year: str = field.value  # EXPECT-ERROR: int is not str

    # 2. There is no award-level custom_fields; they live on the recipient.
    award.custom_fields  # EXPECT-ERROR: no custom_fields on AwardBase


# 3. AwardBase is parameterized by the recipient model, not the field container.
WrongNesting = AwardBase[RecipientFields]  # EXPECT-ERROR: not an AwdRecipientIndividual


def bare(response: AwardResponse) -> None:
    recipient = response.data.recipient_individual
    assert recipient is not None and recipient.custom_fields is not None

    # 4. The bare default is a dict of CustomField, not Any: no typed attributes.
    recipient.custom_fields.scholarship_year  # EXPECT-ERROR: dict has no such attribute


def listed(response: AwardsListResponse[TypedAward]) -> None:
    recipient = response.items[0].recipient_individual
    assert recipient is not None and recipient.custom_fields is not None
    field = recipient.custom_fields.scholarship_year
    assert field is not None

    # 5. List wrappers keep the specialization too.
    _label: str = field.value  # EXPECT-ERROR: int is not str
