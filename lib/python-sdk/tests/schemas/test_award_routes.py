"""Award route request and response models, checked against the Core v0.5 routes."""

from uuid import UUID

import pytest
from pydantic import ValidationError

from common_grants_sdk.schemas import (
    AwardBase,
    AwardGetRequest,
    AwardResponse,
    AwardsFilteredResponse,
    AwardsListRequest,
    AwardsListResponse,
    AwardsSortedResponse,
    AwdFilters,
    AwdRecipientIndividual,
    AwdSearchRequest,
    AwdSorting,
    AwdSortBy,
)

from .award_fixtures import (
    FILTERED_RESPONSE,
    FULL_AWARD,
    LIST_RESPONSE,
    MINIMAL_AWARD,
    PAGINATION_INFO,
    SORT_INFO,
    SORTED_RESPONSE,
    RecipientFields,
    TypedAward,
    routes,
    wire,
)

ROUTES = routes()
INT32_MAX = 2_147_483_647


@pytest.mark.parametrize("case", ROUTES.values(), ids=ROUTES.keys())
def test_route_fixtures_round_trip_unchanged(case):
    model, _schema_id, payload = case

    assert wire(model.model_validate(payload)) == payload


# ############################################################
# Requests
# ############################################################


def test_list_request_defaults_to_core_pagination_and_omits_it():
    request = AwardsListRequest()

    assert (request.page, request.page_size) == (1, 100)
    assert wire(request) == {}
    assert wire(AwardsListRequest(page_size=25)) == {"pageSize": 25}


@pytest.mark.parametrize(
    "payload",
    [
        {"page": 0},
        {"pageSize": 0},
        {"page": INT32_MAX + 1},
        {"pageSize": INT32_MAX + 1},
        {"page": None},
        {"page": 1.5},
        {"page": 1, "unknown": 1},
    ],
)
def test_invalid_list_requests_are_rejected(payload):
    with pytest.raises(ValidationError):
        AwardsListRequest.model_validate(payload)


def test_get_request_uses_the_awd_id_path_parameter():
    request = AwardGetRequest(awd_id=UUID(MINIMAL_AWARD["id"]))

    assert wire(request) == {"awdId": MINIMAL_AWARD["id"]}


@pytest.mark.parametrize(
    "payload", [{}, {"awdId": "nope"}, {"awdId": None}, {"id": MINIMAL_AWARD["id"]}]
)
def test_invalid_get_requests_are_rejected(payload):
    with pytest.raises(ValidationError):
        AwardGetRequest.model_validate(payload)


def test_search_request_adds_no_default_objects():
    """Every search property is optional; nothing is invented on the wire."""
    request = AwdSearchRequest()

    assert wire(request) == {}
    assert (
        request.filters is None
        and request.sorting is None
        and request.pagination is None
    )


def test_search_request_accepts_typed_parts():
    request = AwdSearchRequest(
        search="health",
        filters=AwdFilters(custom_filters={}),
        sorting=AwdSorting(sort_by=AwdSortBy.AWARD_DATE),
        pagination=AwardsListRequest(page=2),
    )

    assert wire(request) == {
        "search": "health",
        "filters": {"customFilters": {}},
        "sorting": {"sortBy": "keyDates.awardDate"},
        "pagination": {"page": 2},
    }


@pytest.mark.parametrize(
    "payload",
    [
        {"search": None},
        {"filters": None},
        {"sorting": None},
        {"pagination": None},
        {"pagination": {"page": 0}},
        {"sorting": {}},
        {"filters": {"region": {"operator": "eq", "value": 1}}},
        {"query": "health"},
    ],
)
def test_invalid_search_requests_are_rejected(payload):
    with pytest.raises(ValidationError):
        AwdSearchRequest.model_validate(payload)


# ############################################################
# Responses
# ############################################################


@pytest.mark.parametrize(
    "payload",
    [
        {"message": "ok", "data": MINIMAL_AWARD},  # status required
        {"status": 201, "message": "ok", "data": MINIMAL_AWARD},
        {"status": 200, "data": MINIMAL_AWARD},  # message required
        {"status": 200, "message": None, "data": MINIMAL_AWARD},
        {"status": 200, "message": "ok"},
        {"status": 200, "message": "ok", "data": MINIMAL_AWARD, "unknown": 1},
    ],
)
def test_invalid_award_responses_are_rejected(payload):
    with pytest.raises(ValidationError):
        AwardResponse.model_validate(payload)


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (AwardsListResponse, {**LIST_RESPONSE, "paginationInfo": {"page": 1}}),
        (AwardsListResponse, {**LIST_RESPONSE, "paginationInfo": {"pageSize": 1}}),
        (
            AwardsListResponse,
            {**LIST_RESPONSE, "paginationInfo": {**PAGINATION_INFO, "page": 0}},
        ),
        (
            AwardsListResponse,
            {
                **LIST_RESPONSE,
                "paginationInfo": {**PAGINATION_INFO, "totalItems": None},
            },
        ),
        (
            AwardsListResponse,
            {**LIST_RESPONSE, "paginationInfo": {**PAGINATION_INFO, "unknown": 1}},
        ),
        (AwardsListResponse, {**LIST_RESPONSE, "unknown": 1}),
        (AwardsSortedResponse, LIST_RESPONSE),  # sortInfo required
        (AwardsSortedResponse, {**SORTED_RESPONSE, "sortInfo": {"sortBy": "title"}}),
        (
            AwardsSortedResponse,
            {**SORTED_RESPONSE, "sortInfo": {**SORT_INFO, "sortOrder": "up"}},
        ),
        (
            AwardsSortedResponse,
            {**SORTED_RESPONSE, "sortInfo": {**SORT_INFO, "errors": None}},
        ),
        (
            AwardsSortedResponse,
            {**SORTED_RESPONSE, "sortInfo": {**SORT_INFO, "unknown": 1}},
        ),
        (AwardsFilteredResponse, SORTED_RESPONSE),  # filterInfo required
        (AwardsFilteredResponse, {**FILTERED_RESPONSE, "filterInfo": {}}),
        (
            AwardsFilteredResponse,
            {**FILTERED_RESPONSE, "filterInfo": {"filters": {}, "errors": None}},
        ),
        (
            AwardsFilteredResponse,
            {
                **FILTERED_RESPONSE,
                "filterInfo": {"filters": {"region": {"operator": "eq", "value": 1}}},
            },
        ),
        (
            AwardsFilteredResponse,
            {**FILTERED_RESPONSE, "filterInfo": {"filters": {}, "unknown": 1}},
        ),
    ],
)
def test_invalid_award_list_responses_are_rejected(model, payload):
    with pytest.raises(ValidationError):
        model.model_validate(payload)


def test_page_size_has_no_upper_bound_in_results():
    info = {**PAGINATION_INFO, "pageSize": INT32_MAX + 1}

    response = AwardsListResponse.model_validate(
        {**LIST_RESPONSE, "paginationInfo": info}
    )

    assert wire(response)["paginationInfo"] == info


# ############################################################
# Generic responses keep the award specialization
# ############################################################

TYPED_CASES = [
    (AwardResponse, {"status": 200, "message": "ok", "data": FULL_AWARD}),
    (AwardsListResponse, LIST_RESPONSE),
    (AwardsSortedResponse, SORTED_RESPONSE),
    (AwardsFilteredResponse, FILTERED_RESPONSE),
]


def _awards(response):
    return [response.data] if isinstance(response, AwardResponse) else response.items


@pytest.mark.parametrize(("model", "payload"), TYPED_CASES)
def test_bare_responses_default_to_untyped_awards(model, payload):
    response = model.model_validate(payload)

    for award in _awards(response):
        assert isinstance(award, AwardBase)
        recipient = award.recipient_individual
        if recipient is not None and recipient.custom_fields is not None:
            assert isinstance(recipient.custom_fields, dict)
    assert wire(response) == payload


@pytest.mark.parametrize(("model", "payload"), TYPED_CASES)
def test_typed_responses_keep_the_typed_recipient(model, payload):
    response = model[TypedAward].model_validate(payload)

    typed = [a for a in _awards(response) if a.recipient_individual is not None]
    assert typed
    for award in typed:
        assert isinstance(award, TypedAward)
        assert isinstance(
            award.recipient_individual, AwdRecipientIndividual[RecipientFields]
        )
        fields = award.recipient_individual.custom_fields
        assert isinstance(fields, RecipientFields)
        assert fields.scholarship_year is not None
        assert fields.scholarship_year.value == 2026
    assert wire(response) == payload


def test_typed_response_rejects_a_wrongly_typed_nested_value():
    payload = {"status": 200, "message": "ok", "data": FULL_AWARD}
    bad = {
        **payload,
        "data": {
            **FULL_AWARD,
            "recipientIndividual": {
                "customFields": {
                    "scholarshipYear": {
                        "name": "scholarshipYear",
                        "fieldType": "integer",
                        "value": "twenty",
                    }
                }
            },
        },
    }

    AwardResponse.model_validate(bad)
    with pytest.raises(ValidationError):
        AwardResponse[TypedAward].model_validate(bad)
