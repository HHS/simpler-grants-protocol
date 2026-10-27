"""Award search filters, checked against the emitted Core v0.5 schemas."""

import copy
from datetime import date, datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from common_grants_sdk.schemas import (
    AwdDefaultFilters,
    AwdFilters,
    DefaultFilter,
    Money,
    StringArrayFilter,
)

from .award_fixtures import DEFAULT_FILTERS, FILTERS, wire

DATE_RANGE = FILTERS["awardDateRange"]
MONEY_RANGE = FILTERS["awardedAmountRange"]


def test_filters_round_trip_with_exact_keys():
    filters = AwdFilters.model_validate(FILTERS)

    assert wire(filters) == FILTERS
    assert filters.custom_filters is not None
    assert filters.custom_filters["clearedFlag"].value is None  # value may be null


def test_named_filters_parse_into_shared_value_models():
    filters = AwdFilters.model_validate(FILTERS)

    assert isinstance(filters.status, StringArrayFilter)
    assert filters.opportunity_id is not None
    assert filters.opportunity_id.value == FILTERS["opportunityId"]["value"]
    assert filters.award_date_range is not None
    assert filters.award_date_range.value.min == date(2026, 1, 1)
    assert filters.award_date_range.value.max == datetime(
        2026, 12, 31, 23, 59, 59, tzinfo=timezone(timedelta(hours=-5))
    )
    assert filters.awarded_amount_range is not None
    assert isinstance(filters.awarded_amount_range.value.min, Money)
    assert filters.custom_filters is not None
    assert isinstance(filters.custom_filters["fiscalYear"], DefaultFilter)


def test_default_filters_keep_extra_root_filters():
    filters = AwdDefaultFilters.model_validate(DEFAULT_FILTERS)

    assert wire(filters) == DEFAULT_FILTERS
    assert filters.model_extra is not None
    assert isinstance(filters.model_extra["region"], DefaultFilter)


@pytest.mark.parametrize("value", [None, "US-CA", {"operator": "in"}, {"value": 1}])
def test_default_filters_root_extras_must_be_default_filters(value):
    with pytest.raises(ValidationError):
        AwdDefaultFilters.model_validate({"region": value})


def test_filters_are_closed_outside_custom_filters():
    """``AwdFilters`` is sealed; extra filters belong under ``customFilters``."""
    with pytest.raises(ValidationError) as exc_info:
        AwdFilters.model_validate({"region": DEFAULT_FILTERS["region"]})
    assert exc_info.value.errors()[0]["type"] == "extra_forbidden"


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        ("2026-01-01", "2026-01-01"),
        ("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
        ("2026-01-01T00:00:00+05:30", "2026-01-01T00:00:00+05:30"),
        ("2026-01-01T12:00:00-05:00", "2026-01-01T12:00:00-05:00"),
    ],
)
def test_award_date_range_accepts_dates_and_offset_datetimes(given, expected):
    """Datetimes keep their offset; a midnight offset datetime is not a date."""
    payload = {
        "awardDateRange": {"operator": "between", "value": {"min": given, "max": given}}
    }

    out = wire(AwdFilters.model_validate(payload))

    assert out["awardDateRange"]["value"] == {"min": expected, "max": expected}


@pytest.mark.parametrize(
    "value",
    [
        {"min": "2026-01-01"},
        {"max": "2026-01-01"},
        {"min": None, "max": "2026-01-01"},
        {"min": "2026-01-01T12:00:00", "max": "2026-01-02"},  # naive datetime
        {"min": "not-a-date", "max": "2026-01-02"},
        {"min": "2026-01-01", "max": "2026-01-02", "unknown": 1},
    ],
)
def test_award_date_range_requires_both_valid_bounds(value):
    with pytest.raises(ValidationError):
        AwdFilters.model_validate(
            {"awardDateRange": {"operator": "between", "value": value}}
        )


@pytest.mark.parametrize(
    "value",
    [
        {"min": MONEY_RANGE["value"]["min"]},
        {"min": None, "max": MONEY_RANGE["value"]["max"]},
        {**MONEY_RANGE["value"], "unknown": 1},
        {
            "min": {"amount": ".5", "currency": "USD"},
            "max": MONEY_RANGE["value"]["max"],
        },
        {
            "min": {**MONEY_RANGE["value"]["min"], "unknown": 1},
            "max": MONEY_RANGE["value"]["max"],
        },
    ],
)
def test_awarded_amount_range_requires_both_valid_money_bounds(value):
    with pytest.raises(ValidationError):
        AwdFilters.model_validate(
            {"awardedAmountRange": {"operator": "between", "value": value}}
        )


@pytest.mark.parametrize(
    ("key", "filter_"),
    [
        ("status", {"operator": "in", "value": [1, 2]}),
        ("status", {"operator": "in", "value": ["awarded", None]}),
        ("status", {"operator": "eq", "value": ["awarded"]}),
        ("status", {"operator": "in", "value": ["awarded"], "unknown": 1}),
        ("opportunityId", {"operator": "notIn"}),
        ("awardDateRange", {"operator": "in", "value": DATE_RANGE["value"]}),
        ("awardDateRange", {**DATE_RANGE, "unknown": 1}),
        ("awardedAmountRange", {**MONEY_RANGE, "unknown": 1}),
        ("customFilters", {"fiscalYear": {"operator": "eq"}}),
        ("customFilters", {"fiscalYear": {"operator": "around", "value": 1}}),
        ("customFilters", {"fiscalYear": {"operator": "eq", "value": 1, "unknown": 1}}),
        ("customFilters", {"fiscalYear": None}),
    ],
)
def test_invalid_filters_are_rejected(key, filter_):
    with pytest.raises(ValidationError):
        AwdFilters.model_validate({key: filter_})


@pytest.mark.parametrize(
    "key",
    [
        "status",
        "opportunityId",
        "awardDateRange",
        "awardedAmountRange",
        "customFilters",
    ],
)
def test_explicit_null_filters_read_as_omitted(key):
    assert wire(AwdFilters.model_validate({key: None})) == {}
    if key != "customFilters":
        assert wire(AwdDefaultFilters.model_validate({key: None})) == {}


def test_shared_opportunity_filters_are_unchanged():
    """Award-local sealing does not close the shared opportunity filter models."""
    loose = copy.deepcopy(FILTERS["status"])
    loose["unknown"] = 1

    assert StringArrayFilter.model_validate(loose).value == loose["value"]
