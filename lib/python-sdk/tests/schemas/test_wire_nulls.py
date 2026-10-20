"""No dump writes null for an optional field; required fields keep theirs."""

import json
from typing import Optional

from pydantic import Field

from common_grants_sdk.extensions import CustomFieldSet
from common_grants_sdk.extensions.specs import CustomFieldSpec
from common_grants_sdk.schemas.pydantic import (
    AwardBase,
    CustomField,
    CustomFieldType,
    OppFilters,
    OppFunding,
    OpportunityBase,
    OpportunitySearchRequest,
    OppSorting,
    PaginatedResultsInfo,
    SortedResultsInfo,
)
from common_grants_sdk.utils.custom_fields import create_custom_field_schema

OPP = {
    "id": "01912a8b-7c3d-7894-abcd-ef1234567890",
    "title": "T",
    "description": "D",
    "status": {"value": "open"},
    "createdAt": "2026-03-01T00:00:00Z",
    "lastModifiedAt": "2026-03-01T00:00:00Z",
}


def dumps(model):
    yield model.model_dump()
    yield model.model_dump(mode="json")
    yield model.model_dump(mode="json", by_alias=True)
    yield model.model_dump(mode="json", by_alias=True, exclude_unset=True)
    yield model.dump()
    yield json.loads(model.dump_json())
    yield json.loads(model.model_dump_json(by_alias=True))


def nulls(value, path=""):
    if isinstance(value, dict):
        for k, v in value.items():
            yield from nulls(v, f"{path}.{k}")
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from nulls(v, f"{path}.{i}")
    elif value is None:
        yield path


def test_unset_and_explicit_null_optionals_are_never_written():
    opp = OpportunityBase.model_validate(
        {**OPP, "funding": {"details": None}, "keyDates": None, "source": None}
    )
    for dumped in dumps(opp):
        assert list(nulls(dumped)) == []
    assert OpportunityBase.model_validate(opp.model_dump()) == opp.model_validate(
        opp.model_dump(mode="json", by_alias=True)
    )


def test_required_custom_value_still_writes_null():
    opp = OpportunityBase.model_validate(
        {
            **OPP,
            "customFields": {"x": {"name": "x", "fieldType": "string", "value": None}},
        }
    )
    for dumped in dumps(opp):
        assert [path.split(".")[-2:] for path in nulls(dumped)] == [["x", "value"]]


def test_runtime_helper_value_still_writes_null():
    defs = create_custom_field_schema(
        "Opp", {"legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER)}
    )
    field_model = defs["legacy_id"][0].__args__[0]
    field = field_model()
    assert field.model_dump(by_alias=True, exclude={"description"})["value"] is None


def test_custom_field_set_omits_unset_declared_entries():
    class Fields(CustomFieldSet):
        score: Optional[CustomField[int]] = Field(default=None, description="s")
        note: Optional[CustomField[str]] = Field(default=None, description="n")

    typed = OpportunityBase[Fields].model_validate(
        {
            **OPP,
            "customFields": {
                "score": {"name": "score", "fieldType": "integer", "value": 7}
            },
        }
    )
    for dumped in dumps(typed):
        assert list(nulls(dumped)) == []
    assert typed.model_dump(mode="json", by_alias=True)["customFields"] == {
        "score": {"name": "score", "fieldType": "integer", "value": 7}
    }


def test_nested_models_follow_the_rule():
    funding = OppFunding(details=None)
    assert funding.model_dump() == {}
    award = AwardBase.model_validate(
        {
            **OPP,
            "status": {"value": "awarded"},
            "keyDates": {
                "awardDate": {
                    "name": "Award",
                    "eventType": "singleDate",
                    "date": "2026-03-01",
                    "time": None,
                }
            },
        }
    )
    assert award.model_dump(mode="json", by_alias=True)["keyDates"] == {
        "awardDate": {"name": "Award", "eventType": "singleDate", "date": "2026-03-01"}
    }


def test_request_and_result_info_models_follow_the_rule():
    request = OpportunitySearchRequest(
        filters=OppFilters(custom_filters=None),
        sorting=OppSorting(sort_by="title", custom_sort_by=None),
    )
    sort_info = SortedResultsInfo(sort_by="title", sort_order="asc")
    page_info = PaginatedResultsInfo(total_items=0, total_pages=0)
    for model in (request, sort_info, page_info):
        for dumped in (
            model.model_dump(),
            model.model_dump(mode="json", by_alias=True),
            json.loads(model.model_dump_json(by_alias=True)),
        ):
            assert list(nulls(dumped)) == []
    assert request.model_dump(mode="json", by_alias=True) == {
        "filters": {},
        "sorting": {"sortBy": "title", "sortOrder": "desc"},
        "pagination": {"page": 1, "pageSize": 10},
    }
    assert "customSortBy" not in sort_info.model_dump(by_alias=True)
