"""Opportunity details: ``get`` returns the awards an opportunity resulted in.

``client.opportunities.get`` parses the detail form of the plugin's Opportunity
schema, ``OpportunityDetails[OpportunityFields]`` for a plugin registering
``OpportunityBase[OpportunityFields]``, so the plugin's custom fields stay typed
and ``awards`` is added. Plugin authors register nothing new. ``list`` and
``search`` keep parsing the registered base model, and an explicit ``schema=``
is used exactly as given.

A server can build ``OpportunityResponse`` from the ``OpportunityBase`` instance it
already has; ``data`` is validated as ``OpportunityDetails`` without turning unset
properties into ``null``.

Each ``awards`` entry is an ``AwdRef``: a reference (id, title, identifiers), not
the award record. An omitted ``awards`` means the link is not published, ``[]``
means no awards are known, and ``null`` is rejected. Entries are unordered.

Runs as a self-check against an in-process mock transport, no API or key::

    poetry run python -m examples.typed_opportunity_details

and pyright checks the ``assert_type`` calls with the rest of ``examples/``.
"""

from __future__ import annotations

from typing import Any, Optional

import httpx
from pydantic import ValidationError
from typing_extensions import assert_type

from common_grants_sdk import Client, Config, PluginSchemas, define_plugin, schema
from common_grants_sdk.extensions import CustomField, CustomFieldSet, PluginMeta
from common_grants_sdk.schemas import (
    AwdRef,
    OpportunityBase,
    OpportunityDetails,
    OpportunityResponse,
)


class OpportunityFields(CustomFieldSet):
    """Custom fields this implementation publishes about an opportunity."""

    priority_score: Optional[CustomField[int]] = None


TypedOpportunity = OpportunityBase[OpportunityFields]

plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=TypedOpportunity)),
    meta=PluginMeta(name="research", source_system="example"),
)

AWARD_REF: dict[str, Any] = {
    "id": "aa1b2c3d-4e5f-4061-8a7b-8c9d0e1f2032",
    "title": "Clean Energy Innovation Demonstration Award",
    "identifiers": {"awd:us:fain": {"id": "DE0000101"}},
}
OPPORTUNITY: dict[str, Any] = {
    "id": "4c5d6e7f-8091-42a3-9d4e-5f6a7b8c9d0e",
    "title": "Clean Energy Innovation",
    "description": "Supporting research and deployment of clean energy technologies.",
    "status": {"value": "open"},
    "createdAt": "2025-03-01T00:00:00Z",
    "lastModifiedAt": "2025-03-12T00:00:00Z",
    "customFields": {
        "priorityScore": {"name": "priorityScore", "fieldType": "integer", "value": 7}
    },
    "awards": [AWARD_REF],
}


def wire(model: Any) -> dict[str, Any]:
    """The wire recipe: camelCase keys, unset properties omitted, explicit nulls kept."""
    return model.model_dump(mode="json", by_alias=True, exclude_unset=True)


def mock_api(opportunity: dict[str, Any]) -> httpx.MockTransport:
    """Serve ``opportunity`` from get, and as the only row of list and search."""

    def handle(request: httpx.Request) -> httpx.Response:
        body: dict[str, Any] = {"status": 200, "message": "Success"}
        if request.url.path.endswith(opportunity["id"]):
            return httpx.Response(200, json={**body, "data": opportunity})
        body["items"] = [opportunity]
        body["paginationInfo"] = {
            "page": 1,
            "pageSize": 10,
            "totalItems": 1,
            "totalPages": 1,
        }
        if request.method == "POST":
            body["sortInfo"] = {"sortBy": "lastModifiedAt", "sortOrder": "desc"}
            body["filterInfo"] = {"filters": {}}
        return httpx.Response(200, json=body)

    return httpx.MockTransport(handle)


CONFIG = Config(base_url="https://api.example.org", api_key="example")


def plugin_client(opportunity: dict[str, Any] = OPPORTUNITY):
    client = plugin.get_client(CONFIG)
    client.http = httpx.Client(transport=mock_api(opportunity))
    return client


def default_get() -> None:
    detail = plugin_client().opportunities.get(OPPORTUNITY["id"])
    assert_type(detail, OpportunityDetails[OpportunityFields])
    assert detail.awards is not None
    for award_ref in detail.awards:
        assert_type(award_ref, AwdRef)
        assert award_ref.title == AWARD_REF["title"]
    assert detail.custom_fields is not None
    score = detail.custom_fields.priority_score
    assert score is not None
    assert_type(score.value, int)
    assert score.value == 7
    assert wire(detail) == OPPORTUNITY


def explicit_schemas() -> None:
    client = plugin_client()
    base = client.opportunities.get(OPPORTUNITY["id"], schema=TypedOpportunity)
    assert_type(base, OpportunityBase[OpportunityFields])
    assert not isinstance(base, OpportunityDetails)
    assert "awards" not in wire(base)

    detail_type = OpportunityDetails[OpportunityFields]
    explicit = client.opportunities.get(OPPORTUNITY["id"], schema=detail_type)
    assert_type(explicit, OpportunityDetails[OpportunityFields])
    assert wire(explicit) == OPPORTUNITY


def collections_stay_base() -> None:
    client = plugin_client()
    rows = client.opportunities.list(page=1)
    matches = client.opportunities.search(page=1)
    assert_type(rows.items, list[OpportunityBase[OpportunityFields]])
    assert_type(matches.items, list[OpportunityBase[OpportunityFields]])
    for item in (*rows.items, *matches.items):
        assert "awards" not in wire(item)


def unscoped_client() -> None:
    client = Client(CONFIG)
    client.http = httpx.Client(transport=mock_api(OPPORTUNITY))
    detail = client.opportunities.get(OPPORTUNITY["id"])
    assert_type(detail.awards, Optional[list[AwdRef]])
    assert isinstance(detail.custom_fields, dict)
    assert detail.custom_fields["priorityScore"].value == 7


def omitted_empty_null() -> None:
    omitted = {k: v for k, v in OPPORTUNITY.items() if k != "awards"}
    detail = plugin_client(omitted).opportunities.get(OPPORTUNITY["id"])
    assert detail.awards is None and "awards" not in wire(detail)

    empty = plugin_client({**OPPORTUNITY, "awards": []})
    assert wire(empty.opportunities.get(OPPORTUNITY["id"]))["awards"] == []

    null = plugin_client({**OPPORTUNITY, "awards": None})
    try:
        null.opportunities.get(OPPORTUNITY["id"])
    except ValidationError as exc:
        assert "optional property must be omitted, not null" in str(exc)
    else:
        raise AssertionError("expected a ValidationError for null awards")


def server_envelope() -> None:
    """A server builds the get envelope from the opportunity model it already has."""
    base = TypedOpportunity.model_validate(
        {k: v for k, v in OPPORTUNITY.items() if k != "awards"}
    )
    response = OpportunityResponse(status=200, message="Success", data=base)
    assert_type(response.data, OpportunityDetails)
    assert isinstance(response.data, OpportunityDetails)
    assert wire(response)["data"] == wire(base)


def main() -> None:
    default_get()
    explicit_schemas()
    collections_stay_base()
    unscoped_client()
    omitted_empty_null()
    server_envelope()
    print("typed opportunity details: OK")


if __name__ == "__main__":
    main()
