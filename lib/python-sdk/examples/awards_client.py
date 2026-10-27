"""Awards client: get, list and search awards, with plugin-registered award filters
and typed recipient custom fields.

A plugin author registers two independent award extensions once:

- **custom fields** on the award's individual recipient (``AwdRecipientIndividual``),
  a *schema* extension: they shape the award data the client parses;
- **custom filters** on the ``awards.search`` route, a *route* extension: they
  shape the search request the client sends.

A consumer gets ``client.awards`` from ``plugin.get_client()``. Every award it
returns parses into ``AwardBase[AwdRecipientIndividual[RecipientFields]]`` by
default, so ``recipient_individual.custom_fields.scholarship_year`` is typed; a
per-call ``schema=`` overrides that. Parsing never runs the plugin's transforms:
``to_common`` / ``from_common`` convert the plugin's own source records only when
called. Search takes the four standard award filters by snake_case name and sends
them by their camelCase wire names; registered and ad-hoc custom filters go under
``customFilters`` exactly as named. Each kind of failure has its own channel:

- an invalid filter raises ``FilterError`` before any request is sent;
- a row that does not parse lands in ``result.errors`` (the rest still parse);
- an HTTP failure (e.g. a 404 from ``get``) raises ``APIError``;
- a transform failure is a ``TransformError`` in ``TransformResult.errors``.

Runs offline against an in-process mock API (an ``httpx.MockTransport``)::

    poetry run python -m examples.awards_client

and pyright checks the ``assert_type`` calls in ``_typecheck`` with the rest of
``examples/``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Optional, cast

import httpx
from pydantic import BaseModel
from typing_extensions import assert_type

from common_grants_sdk.client import Client, Config, ListResult, SearchResult
from common_grants_sdk.client.exceptions import APIError
from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    FilterError,
    PluginMeta,
    PluginRoutes,
    PluginSchemas,
    ResourceRoutes,
    TransformResult,
    define_plugin,
    f,
    schema,
)
from common_grants_sdk.schemas.pydantic.filters import (
    AwardFilters,
    OpportunityFilters,
    StringArray,
)
from common_grants_sdk.schemas.pydantic.models import (
    AwardBase,
    AwdRecipientIndividual,
    OpportunityBase,
)


# 1. RECIPIENT CUSTOM FIELDS — award custom fields live on the individual
#    recipient, not on the award. Declare them once as a ``CustomFieldSet``.
class RecipientFields(CustomFieldSet):
    scholarship_year: Optional[CustomField[int]] = None


Recipient = AwdRecipientIndividual[RecipientFields]
TypedAward = AwardBase[Recipient]


# The plugin's own (source-system) recipient record, and the mappings between it
# and the CommonGrants recipient. Mappings are optional: ``schema(common_schema=
# Recipient)`` registers the custom fields alone.
class ScholarshipRecipient(BaseModel):
    first_name: str
    last_name: str
    award_year: int


recipient_extension = schema(
    source_schema=ScholarshipRecipient,
    common_schema=Recipient,
    mappings={
        "to_common": {
            "name": {
                "firstName": {"field": "first_name"},
                "lastName": {"field": "last_name"},
            },
            "customFields": {
                "scholarshipYear": {
                    "name": "scholarshipYear",
                    "fieldType": "integer",
                    "value": {"field": "award_year"},
                },
            },
        },
        "from_common": {
            "first_name": {"field": "name.firstName"},
            "last_name": {"field": "name.lastName"},
            "award_year": {"field": "customFields.scholarshipYear.value"},
        },
    },
)


# 2. CUSTOM AWARD FILTERS — declared once by subclassing ``AwardFilters``. The same
#    type registers the filter (below) AND types ``client.awards.search(filters=...)``.
class AwardSearchFilters(AwardFilters, total=False):
    program_code: StringArray


# 3. ASSEMBLE — the recipient registers as a schema, the filters on the awards
#    route; opportunities need no entry and keep their base schema and filters.
awards_plugin = define_plugin(
    PluginSchemas(AwdRecipientIndividual=recipient_extension),
    routes=PluginRoutes(awards=ResourceRoutes(search=AwardSearchFilters)),
    meta=PluginMeta(name="Example", source_system="example"),
)


def _typecheck() -> None:
    """Static proof of the consumer typing (checked by pyright, never run)."""
    client = awards_plugin.get_client()
    assert_type(
        client,
        Client[OpportunityFilters, OpportunityBase, AwardSearchFilters, TypedAward],
    )

    result = client.awards.search(
        filters={
            "program_code": f.in_(["RESEARCH"]),  # registered: typed StringArray
            "opportunity_id": f.in_(["00000000-0000-4000-8000-000000000001"]),
        }
    )
    assert_type(result, SearchResult[TypedAward])
    award = client.awards.get(AWARD_ID)
    assert_type(award, TypedAward)
    assert_type(client.awards.list(), ListResult[TypedAward])
    recipient = award.recipient_individual
    if recipient is not None and recipient.custom_fields is not None:
        year = recipient.custom_fields.scholarship_year
        if year is not None:
            assert_type(year.value, int)
    # A per-call schema wins over the plugin default.
    assert_type(client.awards.get(AWARD_ID, schema=AwardBase), AwardBase)

    # Transforms are explicit and typed by the registered schemas.
    source = ScholarshipRecipient(first_name="Ada", last_name="Lovelace", award_year=1)
    to_common = awards_plugin.schemas.AwdRecipientIndividual.to_common(source)
    assert_type(to_common, TransformResult[Recipient])

    # A client built directly takes only the standard award filters (plus ad-hoc)
    # and parses the base award.
    direct = Client(Config())
    assert_type(direct.awards.search(page=1), SearchResult[AwardBase])


# ---------------------------------------------------------------------------
# Offline mock API
# ---------------------------------------------------------------------------

AWARD_ID = "01912a8b-7c3d-7894-abcd-ef1234567890"
AWARD: dict[str, Any] = {
    "id": AWARD_ID,
    "title": "Community Health Center Capital Improvement Grant",
    "description": "Supports facility upgrades at federally qualified health centers.",
    "status": {"value": "awarded"},
    "recipientIndividual": {
        "name": {"firstName": "Ada", "lastName": "Lovelace"},
        "customFields": {
            "scholarshipYear": {
                "name": "scholarshipYear",
                "fieldType": "integer",
                "value": 2026,
            },
        },
    },
    "createdAt": "2026-03-01T00:00:00Z",
    "lastModifiedAt": "2026-06-01T00:00:00Z",
}


def _page(items: list[dict[str, Any]], pagination: dict[str, int]) -> dict[str, Any]:
    return {
        "status": 200,
        "message": "Success",
        "items": items,
        "paginationInfo": {**pagination, "totalItems": len(items), "totalPages": 1},
        "sortInfo": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
        "filterInfo": {"filters": {}, "errors": []},
    }


def mock_api(request: httpx.Request) -> httpx.Response:
    """Serve the awards routes: one award, one malformed list row, 404 otherwise."""
    path = request.url.path
    if request.method == "POST" and path == "/common-grants/awards/search":
        pagination = json.loads(request.content)["pagination"]
        return httpx.Response(200, json=_page([AWARD], pagination))
    if path == "/common-grants/awards":
        pagination = {"page": 1, "pageSize": int(request.url.params["pageSize"])}
        return httpx.Response(200, json=_page([AWARD, {"id": "bad"}], pagination))
    if path == f"/common-grants/awards/{AWARD_ID}":
        return httpx.Response(200, json={"status": 200, "data": AWARD})
    return httpx.Response(
        404, json={"status": 404, "message": "Not found", "errors": []}
    )


@dataclass
class Outcome:
    search_body: dict[str, Any]
    search: SearchResult[TypedAward]
    listed: ListResult[TypedAward]
    filter_error_path: Optional[str]
    missing_status: int
    award: TypedAward
    base_award: AwardBase
    to_common: TransformResult[Recipient]
    from_common: TransformResult[ScholarshipRecipient]


def scholarship_year(award: TypedAward) -> Optional[int]:
    """Read the typed recipient field; the recipient and each field are optional."""
    recipient = award.recipient_individual
    if recipient is None or recipient.custom_fields is None:
        return None
    year = recipient.custom_fields.scholarship_year
    return year.value if year is not None else None


def demo() -> Outcome:
    """Run the consumer scenario against the mock API and return what happened."""
    sent: list[httpx.Request] = []

    def transport(request: httpx.Request) -> httpx.Response:
        sent.append(request)
        return mock_api(request)

    client = awards_plugin.get_client(
        Config(base_url="https://api.example.invalid", api_key="unused")
    )
    client.http = httpx.Client(transport=httpx.MockTransport(transport))

    search = client.awards.search(
        search="research",
        page=2,
        page_size=25,
        filters={
            "status": f.in_(["awarded"]),
            "opportunity_id": f.in_(["00000000-0000-4000-8000-000000000001"]),
            "award_date_range": f.between("2026-01-01", "2026-12-31"),
            "awarded_amount_range": f.between(
                {"amount": "10000", "currency": "USD"},
                {"amount": "500000", "currency": "USD"},
            ),
            "program_code": f.in_(["RESEARCH"]),  # registered custom filter
            "experimental_tag": f.eq("pilot"),  # ad-hoc custom filter
        },
    )
    search_body = json.loads(sent[-1].content)

    listed = client.awards.list(page=1)  # the malformed row lands in listed.errors

    filter_error_path = None
    # cast: a dynamic/untyped filter dict bypasses the static check; the runtime
    # guard still rejects a StringArray filter given a scalar comparison.
    bad = cast(AwardSearchFilters, {"program_code": f.eq("RESEARCH")})
    try:
        client.awards.search(filters=bad)
    except FilterError as exc:
        filter_error_path = exc.path

    try:
        client.awards.get("00000000-0000-4000-8000-00000000dead")
        missing_status = 200
    except APIError as exc:
        missing_status = exc.error.status

    award = client.awards.get(AWARD_ID)  # the plugin's typed award, by default
    base_award = client.awards.get(AWARD_ID, schema=AwardBase)  # per-call override

    # Transforms convert the plugin's own records; the client never runs them.
    recipients = awards_plugin.schemas.AwdRecipientIndividual
    to_common = recipients.to_common(
        ScholarshipRecipient(first_name="Grace", last_name="Hopper", award_year=2027)
    )
    recipient = award.recipient_individual
    assert recipient is not None  # this mock award names an individual recipient
    from_common = recipients.from_common(recipient)

    return Outcome(
        search_body,
        search,
        listed,
        filter_error_path,
        missing_status,
        award,
        base_award,
        to_common,
        from_common,
    )


def main() -> None:
    outcome = demo()
    print("search request body:", json.dumps(outcome.search_body, indent=2))
    for award in outcome.search.items:
        print("found:", award.id, award.title, "year:", scholarship_year(award))
    for failure in outcome.listed.errors:
        print("unparsed list row", failure.index, failure.raw)
    print("invalid filter rejected before sending:", outcome.filter_error_path)
    print("missing award:", outcome.missing_status)
    print("base override recipient fields:", outcome.base_award.recipient_individual)
    print("to_common:", outcome.to_common.result, outcome.to_common.errors)
    print("from_common:", outcome.from_common.result, outcome.from_common.errors)


if __name__ == "__main__":
    main()
