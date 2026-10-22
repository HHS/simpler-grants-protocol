"""Tests for the awards resource (``client.awards``).

Requests go through a real ``httpx.Client`` on a ``MockTransport``, so each test
sees the exact URL, query string and JSON body the client sends.
"""

import copy
import json
from typing import Any, Optional
from uuid import UUID, uuid4

import httpx
import pytest
from pydantic import ValidationError

from common_grants_sdk.client import Client, Config, ListResult, SearchResult
from common_grants_sdk.client.exceptions import APIError
from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    FilterError,
    PassthroughModel,
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
    NumberArray,
    StringArray,
)
from common_grants_sdk.schemas.pydantic.filters.opportunity import OpportunityFilters
from common_grants_sdk.schemas.pydantic.models import (
    AwardBase,
    AwdRecipientIndividual,
    OpportunityBase,
    OpportunityDetails,
)
from tests.schemas.award_fixtures import (
    AWARD_ID,
    INDIVIDUAL_ONLY_AWARD,
    MINIMAL_AWARD,
    RecipientFields,
    TypedAward,
)

BASE_URL = "https://api.example.com"
OPP_ID = "00000000-0000-4000-8000-000000000001"


class AwardSearchFilters(AwardFilters, total=False):
    program_code: StringArray


class OppSearchFilters(OpportunityFilters, total=False):
    region: StringArray


def _award(**changes):
    return {**MINIMAL_AWARD, "id": str(uuid4()), **changes}


def _envelope(items, page=1, page_size=100, total_pages=1, **extra):
    return {
        "status": 200,
        "message": "Success",
        "items": items,
        "paginationInfo": {
            "page": page,
            "pageSize": page_size,
            "totalItems": len(items),
            "totalPages": total_pages,
        },
        **extra,
    }


def _search_envelope(items, **extra):
    return _envelope(
        items,
        **{
            "sortInfo": {"sortBy": "lastModifiedAt", "sortOrder": "desc", "errors": []},
            "filterInfo": {"filters": {}, "errors": []},
            **extra,
        },
    )


def _serve(client, respond):
    """Route every request to ``respond(request)``; return the captured requests."""
    seen: list[httpx.Request] = []

    def handler(request):
        seen.append(request)
        status, payload = respond(request)
        return httpx.Response(status, json=payload)

    client.http = httpx.Client(transport=httpx.MockTransport(handler))
    return seen


@pytest.fixture
def client():
    return Client(config=Config(base_url=BASE_URL, api_key="test-key"))


NOT_FOUND = {"status": 404, "message": "Award not found", "errors": []}


class TestAwardGet:
    @pytest.mark.parametrize("awd_id", [AWARD_ID, UUID(AWARD_ID)])
    def test_get_parses_award_base_by_default(self, client, awd_id):
        seen = _serve(client, lambda r: (200, {"status": 200, "data": MINIMAL_AWARD}))

        award = client.awards.get(awd_id)

        assert type(award) is AwardBase
        assert str(award.id) == AWARD_ID
        assert seen[0].method == "GET"
        assert str(seen[0].url) == f"{BASE_URL}/common-grants/awards/{AWARD_ID}"
        assert seen[0].headers["X-API-Key"] == "test-key"

    def test_get_schema_override_types_recipient_custom_fields(self, client):
        _serve(client, lambda r: (200, {"status": 200, "data": INDIVIDUAL_ONLY_AWARD}))

        award = client.awards.get(AWARD_ID, schema=TypedAward)

        assert isinstance(award, TypedAward)
        recipient = award.recipient_individual
        assert recipient is not None and recipient.custom_fields is not None
        year = recipient.custom_fields.scholarship_year
        assert year is not None and year.value == 2026

    def test_get_404_raises_api_error(self, client):
        _serve(client, lambda r: (404, NOT_FOUND))

        with pytest.raises(APIError) as exc:
            client.awards.get(AWARD_ID)
        assert exc.value.error.status == 404

    def test_get_invalid_award_raises(self, client):
        bad = {k: v for k, v in MINIMAL_AWARD.items() if k != "title"}
        _serve(client, lambda r: (200, {"status": 200, "data": bad}))

        with pytest.raises(ValidationError):
            client.awards.get(AWARD_ID)


class TestAwardList:
    def test_list_page_sends_query_pagination_and_partitions_rows(self, client):
        good = _award()
        seen = _serve(
            client, lambda r: (200, _envelope([good, {"id": "not-an-award"}]))
        )

        result = client.awards.list(page=1, page_size=25)

        assert isinstance(result, ListResult)
        assert [str(item.id) for item in result.items] == [good["id"]]
        assert all(type(item) is AwardBase for item in result.items)
        assert [e.index for e in result.errors] == [1]
        assert result.errors[0].raw == {"id": "not-an-award"}
        assert seen[0].method == "GET"
        assert seen[0].url.path == "/common-grants/awards"
        assert dict(seen[0].url.params) == {"page": "1", "pageSize": "25"}

    def test_list_all_invalid_rows_are_errors_not_exceptions(self, client):
        _serve(client, lambda r: (200, _envelope([{"id": 1}, {"title": "x"}])))

        result = client.awards.list(page=1)

        assert result.items == []
        assert [e.index for e in result.errors] == [0, 1]

    def test_list_aggregates_every_page(self, client):
        pages = [[_award(), _award()], [_award()]]

        def respond(request):
            page = int(request.url.params["page"])
            return 200, _envelope(
                pages[page - 1], page=page, page_size=2, total_pages=2
            )

        seen = _serve(client, respond)

        result = client.awards.list(page_size=2)

        assert [str(i.id) for i in result.items] == [a["id"] for p in pages for a in p]
        assert [r.url.params["page"] for r in seen] == ["1", "2"]
        assert result.pagination_info.total_items == 3

    def test_list_schema_override(self, client):
        _serve(client, lambda r: (200, _envelope([INDIVIDUAL_ONLY_AWARD])))

        result = client.awards.list(page=1, schema=TypedAward)

        assert isinstance(result.items[0], TypedAward)

    def test_list_http_error_raises_api_error(self, client):
        _serve(client, lambda r: (404, NOT_FOUND))

        with pytest.raises(APIError):
            client.awards.list(page=1)


class TestAwardSearch:
    def test_search_sends_core_award_body_and_returns_typed_result(self, client):
        good = _award()
        server_errors = ["status filter is not supported"]

        def respond(request):
            return 200, _search_envelope(
                [good, {"id": "bad"}],
                filterInfo={"filters": {}, "errors": server_errors},
            )

        seen = _serve(client, respond)

        result = client.awards.search(
            search="research",
            page=2,
            page_size=25,
            filters={
                "status": f.in_(["awarded"]),
                "opportunity_id": f.in_([OPP_ID]),
                "award_date_range": f.between("2026-01-01", "2026-12-31"),
                "awarded_amount_range": f.between(
                    {"amount": "1000", "currency": "USD"},
                    {"amount": "5000", "currency": "USD"},
                ),
                "experimental_tag": f.eq("pilot"),
            },
        )

        request = seen[0]
        assert request.method == "POST"
        assert request.url.path == "/common-grants/awards/search"
        assert not request.url.params
        filters = {
            "status": {"operator": "in", "value": ["awarded"]},
            "opportunityId": {"operator": "in", "value": [OPP_ID]},
            "awardDateRange": {
                "operator": "between",
                "value": {"min": "2026-01-01", "max": "2026-12-31"},
            },
            "awardedAmountRange": {
                "operator": "between",
                "value": {
                    "min": {"amount": "1000", "currency": "USD"},
                    "max": {"amount": "5000", "currency": "USD"},
                },
            },
            "customFilters": {"experimental_tag": {"operator": "eq", "value": "pilot"}},
        }
        assert json.loads(request.content) == {
            "search": "research",
            "filters": filters,
            "pagination": {"page": 2, "pageSize": 25},
        }
        assert isinstance(result, SearchResult)
        assert [str(i.id) for i in result.items] == [good["id"]]
        assert [e.index for e in result.errors] == [1]
        assert result.filter_info.filters == filters
        assert result.filter_info.errors == server_errors
        assert result.sort_info is not None
        assert result.sort_info.sort_by == "lastModifiedAt"

    def test_search_without_inputs_sends_only_pagination(self, client):
        seen = _serve(client, lambda r: (200, _search_envelope([])))

        result = client.awards.search(page=1)

        assert json.loads(seen[0].content) == {
            "pagination": {"page": 1, "pageSize": 100}
        }
        assert result.items == [] and result.errors == []
        assert result.pagination_info.total_items == 0

    def test_search_page_two_differs_from_page_one(self, client, paged_search):
        page1, page2 = [_award(), _award()], [_award()]
        seen = paged_search(client, [page1, page2])

        everything = client.awards.search(search="x", page_size=2)
        second = client.awards.search(search="x", page=2, page_size=2)

        assert [str(i.id) for i in everything.items] == [a["id"] for a in page1 + page2]
        assert [str(i.id) for i in second.items] == [page2[0]["id"]]
        assert [json.loads(r.content)["pagination"] for r in seen] == [
            {"page": 1, "pageSize": 2},
            {"page": 2, "pageSize": 2},
            {"page": 2, "pageSize": 2},
        ]

    def test_search_schema_override(self, client):
        _serve(client, lambda r: (200, _search_envelope([INDIVIDUAL_ONLY_AWARD])))

        result = client.awards.search(page=1, schema=TypedAward)

        assert isinstance(result.items[0], TypedAward)

    @pytest.mark.parametrize(
        "filters",
        [
            {"opportunity_id": f.eq(OPP_ID)},
            {
                "award_date_range": {
                    "operator": "between",
                    "value": {"min": "2026-01-01"},
                }
            },
            {"experimental_tag": {"operator": "in", "value": "pilot"}},
            {"status": f.in_(["awarded"]), "STATUS_typo": {"operator": "nope"}},
        ],
    )
    def test_invalid_filter_raises_before_any_request(self, client, filters):
        seen = _serve(client, lambda r: (200, _search_envelope([])))

        with pytest.raises(FilterError):
            client.awards.search(filters=filters)
        assert seen == []

    def test_search_http_error_raises_api_error(self, client):
        _serve(client, lambda r: (404, NOT_FOUND))

        with pytest.raises(APIError) as exc:
            client.awards.search(page=1)
        assert exc.value.error.status == 404


class TestAwardPluginFilters:
    def test_registered_award_filter_is_validated_and_sent_literally(self):
        plugin = define_plugin(
            PluginSchemas(),
            routes=PluginRoutes(awards=ResourceRoutes(search=AwardSearchFilters)),
            meta=PluginMeta(name="test", source_system="test"),
        )
        client = plugin.get_client(Config(base_url=BASE_URL, api_key="k"))
        seen = _serve(client, lambda r: (200, _search_envelope([])))

        client.awards.search(page=1, filters={"program_code": f.in_(["RESEARCH"])})

        assert json.loads(seen[0].content)["filters"] == {
            "customFilters": {"program_code": {"operator": "in", "value": ["RESEARCH"]}}
        }
        with pytest.raises(FilterError):
            client.awards.search(page=1, filters={"program_code": f.eq("RESEARCH")})
        assert len(seen) == 1

    def test_custom_filter_under_a_core_wire_name_is_rejected(self, client):
        """Registered as a number array, but ``opportunityId`` is classified as the
        core string-array filter: reject it at definition and when a client binds."""

        class Collision(AwardFilters, total=False):
            opportunityId: NumberArray

        routes = PluginRoutes(awards=ResourceRoutes(search=Collision))
        with pytest.raises(FilterError, match="reserved") as defined:
            define_plugin(
                PluginSchemas(),
                routes=routes,
                meta=PluginMeta(name="test", source_system="test"),
            )
        with pytest.raises(FilterError, match="reserved") as bound:
            client._bind_routes(routes)
        assert defined.value.path == "routes.awards.search.opportunityId"
        assert bound.value.path == "routes.awards.search.opportunityId"

    def test_plugin_client_accepts_core_wire_names_from_consumers(self):
        plugin = define_plugin(
            PluginSchemas(),
            routes=PluginRoutes(awards=ResourceRoutes(search=AwardSearchFilters)),
            meta=PluginMeta(name="test", source_system="test"),
        )
        client = plugin.get_client(Config(base_url=BASE_URL, api_key="k"))
        seen = _serve(client, lambda r: (200, _search_envelope([])))
        usd = (
            {"amount": "1000", "currency": "USD"},
            {"amount": "5000", "currency": "USD"},
        )

        client.awards.search(
            page=1,
            filters={
                "opportunityId": f.in_([OPP_ID]),
                "awardDateRange": f.between("2026-01-01", "2026-12-31"),
                "awardedAmountRange": f.between(*usd),
            },
        )

        assert json.loads(seen[0].content)["filters"] == {
            "opportunityId": {"operator": "in", "value": [OPP_ID]},
            "awardDateRange": {
                "operator": "between",
                "value": {"min": "2026-01-01", "max": "2026-12-31"},
            },
            "awardedAmountRange": {
                "operator": "between",
                "value": {"min": usd[0], "max": usd[1]},
            },
        }

    def test_both_routes_keep_opportunity_filtering_unchanged(self):
        plugin = define_plugin(
            PluginSchemas(),
            routes=PluginRoutes(
                opportunities=ResourceRoutes(search=OppSearchFilters),
                awards=ResourceRoutes(search=AwardSearchFilters),
            ),
            meta=PluginMeta(name="test", source_system="test"),
        )
        client = plugin.get_client(Config(base_url=BASE_URL, api_key="k"))
        seen = _serve(client, lambda r: (200, _search_envelope([])))

        client.opportunities.search(
            page=1, filters={"region": f.in_(["US-CA"]), "program_code": f.eq("X")}
        )
        with pytest.raises(FilterError):  # region is a StringArray on opportunities
            client.opportunities.search(page=1, filters={"region": f.eq("US-CA")})
        # ... but on awards it is an unregistered (ad-hoc) filter
        client.awards.search(page=1, filters={"region": f.eq("US-CA")})

        opp_body, award_body = (json.loads(r.content) for r in seen)
        assert opp_body["filters"] == {
            "customFilters": {
                "region": {"operator": "in", "value": ["US-CA"]},
                "program_code": {"operator": "eq", "value": "X"},
            }
        }
        assert opp_body["sorting"] == {"sortBy": "lastModifiedAt", "sortOrder": "desc"}
        assert award_body["filters"] == {
            "customFilters": {"region": {"operator": "eq", "value": "US-CA"}}
        }


# ---------------------------------------------------------------------------
# Plugin recipient custom fields: the default award parse schema
# ---------------------------------------------------------------------------

META = PluginMeta(name="test", source_system="test")
TypedRecipient = AwdRecipientIndividual[RecipientFields]


class FloatYearFields(CustomFieldSet):
    """A different consumer's view of the same recipient field."""

    scholarship_year: Optional[CustomField[float]] = None


FloatYearAward = AwardBase[AwdRecipientIndividual[FloatYearFields]]


class OppFields(CustomFieldSet):
    legacy_id: Optional[CustomField[int]] = None


OPPORTUNITY = {
    "id": "00000000-0000-4000-8000-0000000000aa",
    "title": "Opportunity",
    "description": "d",
    "status": {"value": "open"},
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
    "customFields": {
        "legacyId": {"name": "legacyId", "fieldType": "integer", "value": 7}
    },
}


def _recipient_plugin(**schemas: Any):
    return define_plugin(
        PluginSchemas(
            AwdRecipientIndividual=schema(common_schema=TypedRecipient), **schemas
        ),
        meta=META,
    )


def _plugin_client(plugin):
    return plugin.get_client(Config(base_url=BASE_URL, api_key="k"))


def _recipient_award(year: Any = 2026) -> dict[str, Any]:
    award = copy.deepcopy(INDIVIDUAL_ONLY_AWARD)
    award["id"] = str(uuid4())
    award["recipientIndividual"]["customFields"]["scholarshipYear"]["value"] = year
    return award


def _awards_api(items, opportunity=OPPORTUNITY):
    """Serve get/list/search for awards (and get for one opportunity)."""

    def respond(request):
        if "/opportunities/" in request.url.path:
            return 200, {"status": 200, "data": opportunity}
        if request.method == "POST":
            return 200, _search_envelope(items)
        if request.url.path == "/common-grants/awards":
            return 200, _envelope(items)
        return 200, {"status": 200, "data": items[0]}

    return respond


def _year(award) -> Any:
    recipient = award.recipient_individual
    assert recipient is not None and recipient.custom_fields is not None
    year = recipient.custom_fields.scholarship_year
    assert year is not None
    return year.value


class TestAwardPluginRecipient:
    def test_get_list_search_parse_into_the_plugin_recipient_by_default(self):
        client = _plugin_client(_recipient_plugin())
        award = _recipient_award()
        _serve(client, _awards_api([award]))

        got = client.awards.get(AWARD_ID)
        listed = client.awards.list(page=1)
        searched = client.awards.search(page=1)

        for item in (got, *listed.items, *searched.items):
            assert type(item) is TypedAward
            assert _year(item) == 2026
            fields = item.recipient_individual.custom_fields
            assert set(fields.model_extra or {}) == {"mentorNote", "vendor_payload"}
        assert listed.errors == [] and searched.errors == []

    def test_explicit_none_schema_uses_the_plugin_default(self):
        client = _plugin_client(_recipient_plugin())
        _serve(client, _awards_api([_recipient_award()]))

        assert type(client.awards.get(AWARD_ID, schema=None)) is TypedAward
        assert type(client.awards.list(page=1, schema=None).items[0]) is TypedAward
        assert type(client.awards.search(page=1, schema=None).items[0]) is TypedAward

    def test_without_a_recipient_extension_awards_parse_into_award_base(self):
        plugin = define_plugin(
            PluginSchemas(Opportunity=schema(common_schema=OpportunityBase[OppFields])),
            meta=META,
        )
        client = _plugin_client(plugin)
        _serve(client, _awards_api([_recipient_award()]))

        got = client.awards.get(AWARD_ID)
        items = [*client.awards.list(page=1).items, *client.awards.search(page=1).items]

        for item in (got, *items):
            assert type(item) is AwardBase
            recipient = item.recipient_individual
            assert recipient is not None and recipient.custom_fields is not None
            assert recipient.custom_fields["scholarshipYear"].value == 2026

    def test_per_call_schema_overrides_the_plugin_default(self):
        client = _plugin_client(_recipient_plugin())
        _serve(client, _awards_api([_recipient_award()]))

        for schema_, year_type in ((AwardBase, None), (FloatYearAward, float)):
            got = client.awards.get(AWARD_ID, schema=schema_)
            listed = client.awards.list(page=1, schema=schema_).items
            searched = client.awards.search(page=1, schema=schema_).items
            for item in (got, *listed, *searched):
                assert type(item) is schema_
                if year_type is not None:
                    assert type(_year(item)) is year_type and _year(item) == 2026

    def test_rows_invalid_for_the_plugin_recipient_are_batch_errors(self):
        client = _plugin_client(_recipient_plugin())
        good, bad = _recipient_award(), _recipient_award(year="2026-27")
        _serve(client, _awards_api([good, bad]))

        for result in (client.awards.list(page=1), client.awards.search(page=1)):
            assert [str(i.id) for i in result.items] == [good["id"]]
            assert [e.index for e in result.errors] == [1]
            assert result.errors[0].raw == bad
            assert "scholarshipYear" in result.errors[0].message
        # The same row is a valid base award: the plugin default was applied.
        assert len(client.awards.list(page=1, schema=AwardBase).items) == 2

    def test_empty_batches_parse_cleanly(self):
        client = _plugin_client(_recipient_plugin())
        _serve(client, _awards_api([]))

        for result in (client.awards.list(page=1), client.awards.search(page=1)):
            assert result.items == [] and result.errors == []

    def test_get_with_invalid_recipient_fields_raises(self):
        client = _plugin_client(_recipient_plugin())
        _serve(client, _awards_api([_recipient_award(year="2026-27")]))

        with pytest.raises(ValidationError, match="scholarshipYear"):
            client.awards.get(AWARD_ID)
        assert type(client.awards.get(AWARD_ID, schema=AwardBase)) is AwardBase

    def test_parsing_never_runs_the_author_transforms(self):
        calls: list[str] = []

        def to_common(src: PassthroughModel) -> TransformResult[TypedRecipient]:
            calls.append("to_common")
            raise AssertionError("parsing must not transform")

        def from_common(rec: TypedRecipient) -> TransformResult[PassthroughModel]:
            calls.append("from_common")
            raise AssertionError("parsing must not transform")

        entry = schema(
            source_schema=PassthroughModel,
            common_schema=TypedRecipient,
            to_common=to_common,
            from_common=from_common,
        )
        client = _plugin_client(
            define_plugin(PluginSchemas(AwdRecipientIndividual=entry), meta=META)
        )
        _serve(client, _awards_api([_recipient_award()]))

        assert type(client.awards.get(AWARD_ID)) is TypedAward
        assert type(client.awards.list(page=1).items[0]) is TypedAward
        assert type(client.awards.search(page=1).items[0]) is TypedAward
        assert calls == []

    def test_differently_configured_clients_keep_their_own_defaults(self):
        typed = _plugin_client(_recipient_plugin())
        floats = _plugin_client(
            define_plugin(
                PluginSchemas(
                    AwdRecipientIndividual=schema(
                        common_schema=AwdRecipientIndividual[FloatYearFields]
                    )
                ),
                meta=META,
            )
        )
        direct = Client(config=Config(base_url=BASE_URL, api_key="k"))
        for client in (typed, floats, direct):
            _serve(client, _awards_api([_recipient_award()]))

        assert type(typed.awards.get(AWARD_ID)) is TypedAward
        assert type(floats.awards.get(AWARD_ID)) is FloatYearAward
        assert type(direct.awards.get(AWARD_ID)) is AwardBase

    def test_opportunities_keep_their_own_schema(self):
        both = _plugin_client(
            _recipient_plugin(
                Opportunity=schema(common_schema=OpportunityBase[OppFields])
            )
        )
        recipient_only = _plugin_client(_recipient_plugin())
        for client in (both, recipient_only):
            _serve(client, _awards_api([_recipient_award()]))

        opp = both.opportunities.get(OPPORTUNITY["id"])
        assert isinstance(opp, OpportunityDetails[OppFields])
        assert isinstance(opp, OpportunityBase[OppFields])
        assert opp.custom_fields is not None and opp.custom_fields.legacy_id is not None
        assert opp.custom_fields.legacy_id.value == 7
        assert type(both.awards.get(AWARD_ID)) is TypedAward
        untyped = recipient_only.opportunities.get(OPPORTUNITY["id"])
        assert type(untyped) is OpportunityDetails

    def test_recipient_extension_leaves_award_and_opportunity_filters_unchanged(
        self,
    ):
        plugin = define_plugin(
            PluginSchemas(AwdRecipientIndividual=schema(common_schema=TypedRecipient)),
            routes=PluginRoutes(
                opportunities=ResourceRoutes(search=OppSearchFilters),
                awards=ResourceRoutes(search=AwardSearchFilters),
            ),
            meta=META,
        )
        assert plugin.routes.awards.search is AwardSearchFilters
        client = _plugin_client(plugin)
        seen = _serve(client, lambda r: (200, _search_envelope([_recipient_award()])))

        result = client.awards.search(
            page=1,
            filters={
                "status": f.in_(["awarded"]),
                "program_code": f.in_(["RESEARCH"]),
                "region": f.eq("US-CA"),
            },
        )
        client.opportunities.search(page=1, filters={"region": f.in_(["US-CA"])})
        with pytest.raises(FilterError):
            client.awards.search(page=1, filters={"program_code": f.eq("X")})

        assert type(result.items[0]) is TypedAward
        award_body, opp_body = (json.loads(r.content) for r in seen)
        assert award_body["filters"] == {
            "status": {"operator": "in", "value": ["awarded"]},
            "customFilters": {
                "program_code": {"operator": "in", "value": ["RESEARCH"]},
                "region": {"operator": "eq", "value": "US-CA"},
            },
        }
        assert opp_body["filters"] == {
            "customFilters": {"region": {"operator": "in", "value": ["US-CA"]}}
        }
