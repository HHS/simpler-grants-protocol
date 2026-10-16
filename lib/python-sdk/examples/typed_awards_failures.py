"""Negative type fixtures for the award models: these SHOULD fail pyright.

Excluded from the main type gate (``pyrightconfig.json``); its own config,
``pyrightconfig.awards-fixtures.json``, and::

    cd lib/python-sdk && make check-award-fixtures

verify that pyright reports exactly one error per marked line, no more. Each
proves a typing guarantee the award models or a plugin's award client make,
including that the bare defaults are the untyped custom-field map rather than
``Any``.
"""

from __future__ import annotations

from typing import Optional

from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    PluginMeta,
    PluginRoutes,
    PluginSchemas,
    ResourceRoutes,
    define_plugin,
    f,
    schema,
)
from common_grants_sdk.schemas import (
    AwardBase,
    AwardResponse,
    AwardsListResponse,
    AwdRecipientIndividual,
    OpportunityBase,
)
from common_grants_sdk.schemas.pydantic.filters import AwardFilters, StringArray


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


class AwardSearchFilters(AwardFilters, total=False):
    program_code: StringArray


META = PluginMeta(name="typed-awards", source_system="example")
recipient = schema(common_schema=AwdRecipientIndividual[RecipientFields])

# 6. The recipient slot is AwdRecipientIndividual; there is no "Recipient" slot.
PluginSchemas(Recipient=recipient)  # EXPECT-ERROR: no such slot

# 7. An Opportunity extension in the recipient slot has no award client.
define_plugin(
    PluginSchemas(AwdRecipientIndividual=schema(common_schema=OpportunityBase)),
    meta=META,
).get_client()  # EXPECT-ERROR: no get_client overload for this slot

client = define_plugin(
    PluginSchemas(AwdRecipientIndividual=recipient),
    routes=PluginRoutes(awards=ResourceRoutes(search=AwardSearchFilters)),
    meta=META,
).get_client()


def plugin_default() -> None:
    award = client.awards.search().items[0]
    individual = award.recipient_individual
    assert individual is not None and individual.custom_fields is not None
    field = individual.custom_fields.scholarship_year
    assert field is not None

    # 8. The plugin default keeps the recipient's typed value.
    _year: str = field.value  # EXPECT-ERROR: int is not str

    # 9. Undeclared recipient fields are not typed attributes.
    individual.custom_fields.mentor_note  # EXPECT-ERROR: not declared

    # 10. Still no award-level custom fields on the plugin default.
    client.awards.get("id").custom_fields  # EXPECT-ERROR: no custom_fields on award


def override() -> None:
    individual = client.awards.get("id", schema=AwardBase).recipient_individual
    assert individual is not None and individual.custom_fields is not None

    # 11. A base override is the untyped map, not the plugin default.
    individual.custom_fields.scholarship_year  # EXPECT-ERROR: dict has no attribute

    # 12. A per-call schema must be an award model (pyright reports the call and
    #     the argument).
    client.awards.get(  # EXPECT-ERROR: no overload takes a non-award schema
        "id", schema=OpportunityBase  # EXPECT-ERROR: not an AwardBase
    )


# 13. Award filters stay typed by the registered route, not the recipient.
client.awards.search(
    filters={"program_code": f.eq("RESEARCH")}  # EXPECT-ERROR: StringArray filter
)
