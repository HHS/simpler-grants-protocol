"""Award sorting, checked against the emitted Core v0.5 schemas."""

import pytest
from pydantic import ValidationError

from common_grants_sdk.schemas import AwdSortBy, AwdSorting, SortOrder

from .award_fixtures import SORTING, wire


def test_sort_by_values_match_core():
    assert [s.value for s in AwdSortBy] == [
        "lastModifiedAt",
        "createdAt",
        "title",
        "status.value",
        "keyDates.awardDate",
        "funding.awardedAmount",
        "custom",
    ]


@pytest.mark.parametrize(
    "payload",
    [
        {"sortBy": "title"},
        {"sortBy": "funding.awardedAmount", "sortOrder": "desc"},
        SORTING,
        {"sortBy": "custom"},  # no customSortBy requirement in Core
    ],
)
def test_sorting_round_trips(payload):
    assert wire(AwdSorting.model_validate(payload)) == payload


def test_sorting_parses_enums_and_omits_defaults():
    sorting = AwdSorting.model_validate(SORTING)

    assert sorting.sort_by is AwdSortBy.CUSTOM
    assert sorting.sort_order is SortOrder.ASC
    assert sorting.custom_sort_by == "fiscalYear"
    assert wire(AwdSorting(sort_by=AwdSortBy.TITLE)) == {"sortBy": "title"}


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"sortBy": "keyDates.closeDate"},  # an opportunity key
        {"sortBy": None},
        {"sortBy": "title", "sortOrder": "up"},
        {"sortBy": "title", "sortOrder": None},
        {"sortBy": "title", "customSortBy": None},
        {"sortBy": "title", "unknown": 1},
    ],
)
def test_invalid_sorting_is_rejected(payload):
    with pytest.raises(ValidationError):
        AwdSorting.model_validate(payload)
