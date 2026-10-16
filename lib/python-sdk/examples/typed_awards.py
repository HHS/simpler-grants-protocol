"""Typed awards: an award whose individual recipient has typed custom fields.

Custom fields live on ``AwardBase.recipient_individual``, not on the award. Declare
them once as a ``CustomFieldSet`` and nest it::

    TypedAward = AwardBase[AwdRecipientIndividual[RecipientFields]]

The award response wrappers take the award model the same way
(``AwardResponse[TypedAward]``); bare ``AwardBase`` and bare wrappers keep the
protocol's untyped ``dict[str, CustomField]``. A plugin that registers the recipient
(``PluginSchemas(AwdRecipientIndividual=...)``) makes ``TypedAward`` the default of
``client.awards.get`` / ``list`` / ``search``; ``_typecheck_plugin_clients`` pins
those types.

Runs as a self-check without an API::

    poetry run python -m examples.typed_awards

and pyright checks the ``assert_type`` calls with the rest of ``examples/``. The
static unhappy path is ``typed_awards_failures.py`` (``make check-award-fixtures``).
"""

from __future__ import annotations

import copy
from typing import Any, Optional

from typing_extensions import assert_type

from common_grants_sdk.client import Client, Config, ListResult, SearchResult
from common_grants_sdk.client.awards import Awards
from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    PassthroughModel,
    Plugin,
    PluginMeta,
    PluginRoutes,
    PluginSchemas,
    ResourceRoutes,
    SchemaOnly,
    define_plugin,
    f,
    schema,
)
from common_grants_sdk.schemas import (
    AwardBase,
    AwardResponse,
    AwardsFilteredResponse,
    AwardsListResponse,
    AwardsSortedResponse,
    AwdRecipientIndividual,
    OpportunityBase,
)
from common_grants_sdk.schemas.pydantic.filters import (
    AwardFilters,
    OpportunityFilters,
    StringArray,
)


class RecipientFields(CustomFieldSet):
    """Custom fields this implementation publishes about an individual recipient."""

    scholarship_year: Optional[CustomField[int]] = None


TypedAward = AwardBase[AwdRecipientIndividual[RecipientFields]]

AWARD: dict[str, Any] = {
    "id": "01912a8b-7c3d-7894-abcd-ef1234567890",
    "title": "Graduate Research Fellowship",
    "description": "Supports a graduate student's research.",
    "status": {"value": "awarded"},
    "recipientIndividual": {
        "name": {"firstName": "Ada", "lastName": "Lovelace"},
        "customFields": {
            "scholarshipYear": {
                "name": "scholarshipYear",
                "fieldType": "integer",
                "value": 2026,
            },
            # Not declared on RecipientFields: kept under its exact key.
            "mentor_note": {
                "name": "mentor_note",
                "fieldType": "string",
                "value": None,
            },
        },
    },
    "createdAt": "2026-03-01T00:00:00Z",
    "lastModifiedAt": "2026-03-01T00:00:00Z",
}
PAGE = {"page": 1, "pageSize": 100}
SORT_INFO = {"sortBy": "lastModifiedAt", "sortOrder": "desc"}


def wire(model: Any) -> dict[str, Any]:
    """The wire recipe: camelCase keys, unset properties omitted, explicit nulls kept."""
    return model.model_dump(mode="json", by_alias=True, exclude_unset=True)


def scholarship_year(award: TypedAward) -> int | None:
    recipient = award.recipient_individual
    if recipient is None or recipient.custom_fields is None:
        return None
    field = recipient.custom_fields.scholarship_year
    if field is None:
        return None
    assert_type(field.value, int)
    return field.value


def bare_defaults() -> None:
    """Bare models default all the way down to the untyped custom-field map."""
    response = AwardResponse.model_validate(
        {"status": 200, "message": "Success", "data": AWARD}
    )
    assert_type(response.data, AwardBase)
    recipient = response.data.recipient_individual
    assert_type(recipient, Optional[AwdRecipientIndividual])
    assert recipient is not None and recipient.custom_fields is not None
    assert_type(recipient.custom_fields, dict[str, CustomField])
    entry = recipient.custom_fields["scholarshipYear"]
    assert_type(entry, CustomField)
    assert entry.value == 2026
    assert wire(response)["data"] == AWARD


def typed_award() -> None:
    award = TypedAward.model_validate(AWARD)
    recipient = award.recipient_individual
    assert recipient is not None
    assert_type(recipient.custom_fields, Optional[RecipientFields])
    assert scholarship_year(award) == 2026
    assert recipient.custom_fields is not None
    assert recipient.custom_fields.model_extra is not None
    assert "mentor_note" in recipient.custom_fields.model_extra
    assert wire(award) == AWARD


def typed_responses() -> None:
    get = AwardResponse[TypedAward].model_validate(
        {"status": 200, "message": "Success", "data": AWARD}
    )
    assert_type(get.data, TypedAward)
    assert scholarship_year(get.data) == 2026

    listed = AwardsListResponse[TypedAward].model_validate(
        {"status": 200, "message": "Success", "items": [AWARD], "paginationInfo": PAGE}
    )
    assert_type(listed.items, list[TypedAward])
    assert [scholarship_year(a) for a in listed.items] == [2026]

    sorted_ = AwardsSortedResponse[TypedAward].model_validate(
        {**wire(listed), "sortInfo": SORT_INFO}
    )
    assert_type(sorted_.items[0], TypedAward)

    searched = AwardsFilteredResponse[TypedAward].model_validate(
        {**wire(sorted_), "filterInfo": {"filters": {}}}
    )
    assert_type(searched.items[0], TypedAward)
    assert scholarship_year(searched.items[0]) == 2026


def invalid_values_are_rejected() -> None:
    from pydantic import ValidationError

    wrong_type = copy.deepcopy(AWARD)
    wrong_type["recipientIndividual"]["customFields"]["scholarshipYear"][
        "value"
    ] = "2026-27"
    root_fields = {**AWARD, "customFields": {}}
    null_parent = {**AWARD, "parent": None}

    AwardBase.model_validate(wrong_type)  # untyped: any value
    for payload in (wrong_type, root_fields, null_parent):
        try:
            TypedAward.model_validate(payload)
        except ValidationError:
            continue
        raise AssertionError("expected a ValidationError")


class OppFields(CustomFieldSet):
    legacy_id: Optional[CustomField[int]] = None


class FloatYearFields(CustomFieldSet):
    """A different view of the same recipient field, for per-call overrides."""

    scholarship_year: Optional[CustomField[float]] = None


class AwardSearchFilters(AwardFilters, total=False):
    program_code: StringArray


TypedOpp = OpportunityBase[OppFields]
Recipient = AwdRecipientIndividual[RecipientFields]
FloatYearAward = AwardBase[AwdRecipientIndividual[FloatYearFields]]
NO_MAPPINGS: dict[str, Any] = {"to_common": {}, "from_common": {}}
BothClient = Client[OpportunityFilters, TypedOpp, AwardFilters, TypedAward]


def _typecheck_plugin_clients(maybe: Optional[type[FloatYearAward]]) -> None:
    """Static proof of plugin award defaults (checked by pyright, never run)."""
    meta = PluginMeta(name="typed-awards", source_system="example")
    opp_only = schema(common_schema=TypedOpp)
    opp_tx = schema(
        source_schema=PassthroughModel, common_schema=TypedOpp, mappings=NO_MAPPINGS
    )
    rec_only = schema(common_schema=Recipient)
    rec_tx = schema(
        source_schema=PassthroughModel, common_schema=Recipient, mappings=NO_MAPPINGS
    )

    # Every Opportunity x recipient entry kind, schema-only or with transforms.
    assert_type(
        define_plugin(
            PluginSchemas(Opportunity=opp_only, AwdRecipientIndividual=rec_only),
            meta=meta,
        ).get_client(),
        BothClient,
    )
    assert_type(
        define_plugin(
            PluginSchemas(Opportunity=opp_only, AwdRecipientIndividual=rec_tx),
            meta=meta,
        ).get_client(),
        BothClient,
    )
    assert_type(
        define_plugin(
            PluginSchemas(Opportunity=opp_tx, AwdRecipientIndividual=rec_only),
            meta=meta,
        ).get_client(),
        BothClient,
    )
    assert_type(
        define_plugin(
            PluginSchemas(Opportunity=opp_tx, AwdRecipientIndividual=rec_tx),
            meta=meta,
        ).get_client(),
        BothClient,
    )
    # Neither or one slot: an omitted slot keeps its base model.
    assert_type(
        define_plugin(PluginSchemas(), meta=meta).get_client(),
        Client[OpportunityFilters, OpportunityBase, AwardFilters, AwardBase],
    )
    assert_type(
        define_plugin(PluginSchemas(Opportunity=opp_tx), meta=meta).get_client(),
        Client[OpportunityFilters, TypedOpp, AwardFilters, AwardBase],
    )

    # Separate inferred variables, with award routes registered alongside.
    plugin = define_plugin(
        PluginSchemas(AwdRecipientIndividual=rec_tx),
        routes=PluginRoutes(awards=ResourceRoutes(search=AwardSearchFilters)),
        meta=meta,
    )
    client = plugin.get_client()
    assert_type(
        client,
        Client[OpportunityFilters, OpportunityBase, AwardSearchFilters, TypedAward],
    )

    # Defaults: the composed award, for all three methods.
    award = client.awards.get("id")
    assert_type(award, TypedAward)
    assert_type(client.awards.get("id", schema=None), TypedAward)
    assert_type(client.awards.list(), ListResult[TypedAward])
    searched = client.awards.search(filters={"program_code": f.in_(["RESEARCH"])})
    assert_type(searched, SearchResult[TypedAward])
    recipient = award.recipient_individual
    if recipient is not None and recipient.custom_fields is not None:
        year = recipient.custom_fields.scholarship_year
        if year is not None:
            assert_type(year.value, int)

    # Explicit overrides win, by keyword or position.
    assert_type(client.awards.get("id", schema=AwardBase), AwardBase)
    assert_type(client.awards.get("id", FloatYearAward), FloatYearAward)
    assert_type(client.awards.list(schema=AwardBase), ListResult[AwardBase])
    assert_type(client.awards.list(1, 10, FloatYearAward), ListResult[FloatYearAward])
    assert_type(
        client.awards.list(page=1, schema=FloatYearAward), ListResult[FloatYearAward]
    )
    assert_type(client.awards.search(schema=AwardBase), SearchResult[AwardBase])
    assert_type(
        client.awards.search("q", 1, 10, FloatYearAward), SearchResult[FloatYearAward]
    )
    assert_type(
        client.awards.search(
            schema=FloatYearAward, filters={"program_code": f.in_(["RESEARCH"])}
        ),
        SearchResult[FloatYearAward],
    )
    # An optional schema is either the override or the plugin default.
    assert_type(client.awards.get("id", schema=maybe), TypedAward | FloatYearAward)
    assert_type(
        client.awards.list(schema=maybe),
        ListResult[TypedAward] | ListResult[FloatYearAward],
    )
    assert_type(
        client.awards.search(schema=maybe),
        SearchResult[TypedAward] | SearchResult[FloatYearAward],
    )

    # A directly built client defaults to the base award.
    assert_type(Client(Config()).awards.get("id"), AwardBase)

    # Pre-recipient spellings keep their meaning.
    _client: Client[OpportunityFilters, OpportunityBase] = Client(Config())
    _client3: Client[OpportunityFilters, OpportunityBase, AwardFilters] = Client()
    _awards: Awards[AwardFilters] = _client3.awards
    _schemas: PluginSchemas[SchemaOnly[OpportunityBase]] = PluginSchemas()
    _plugin: Plugin[PluginSchemas[SchemaOnly[OpportunityBase]], OpportunityFilters] = (
        define_plugin(_schemas, meta=meta)
    )
    _plugin3: Plugin[
        PluginSchemas[SchemaOnly[OpportunityBase]], OpportunityFilters, AwardFilters
    ] = _plugin


def main() -> None:
    bare_defaults()
    typed_award()
    typed_responses()
    invalid_values_are_rejected()
    print("typed awards: OK")


if __name__ == "__main__":
    main()
