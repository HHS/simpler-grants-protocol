"""Tests for classify_filters, f helpers, validate_routes, and validate_filter_call
in common_grants_sdk.extensions.filters."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from common_grants_sdk.extensions.filters import (
    classify_filters,
    f,
    validate_filter_call,
    validate_routes,
)
from common_grants_sdk.extensions.specs import CustomFilterSpec, CustomFilterType
from common_grants_sdk.extensions.types import PluginError
from common_grants_sdk.schemas.pydantic.filters.opportunity import OppFilters

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

AGENCY_SPEC = CustomFilterSpec(filter_type=CustomFilterType.STRING_ARRAY)
FUNDING_PROGRAM_SPEC = CustomFilterSpec(
    filter_type=CustomFilterType.STRING_COMPARISON,
    description="Program name filter",
)

SAMPLE_ROUTES = {
    "opportunities": {
        "search": {
            "agency": AGENCY_SPEC,
            "fundingProgram": FUNDING_PROGRAM_SPEC,
        }
    }
}


# ---------------------------------------------------------------------------
# f.* helpers
# ---------------------------------------------------------------------------


def test_f_eq():
    """f.eq returns DefaultFilter with operator "eq"."""
    flt = f.eq("open")
    assert flt.operator == "eq"
    assert flt.value == "open"


def test_f_neq():
    """f.neq returns DefaultFilter with operator "neq"."""
    flt = f.neq("closed")
    assert flt.operator == "neq"
    assert flt.value == "closed"


def test_f_gt():
    """f.gt returns DefaultFilter with operator "gt"."""
    flt = f.gt(100)
    assert flt.operator == "gt"
    assert flt.value == 100


def test_f_like():
    """f.like returns DefaultFilter with operator "like"."""
    flt = f.like("%grants%")
    assert flt.operator == "like"
    assert flt.value == "%grants%"


def test_f_in_uses_wire_value():
    """f.in_ uses reserved-word workaround; wire operator is "in" (not "in_")."""
    flt = f.in_(["NSF", "NIH"])
    assert flt.operator == "in"
    assert flt.value == ["NSF", "NIH"]


def test_f_not_in_uses_camel_wire_value():
    """f.not_in produces wire operator "notIn" (Python f.not_in vs TS F.notIn divergence)."""
    flt = f.not_in(["archived"])
    assert flt.operator == "notIn"
    assert flt.value == ["archived"]


def test_f_between():
    """f.between produces operator "between" and {"min": a, "max": b} value."""
    flt = f.between("2026-01-01", "2026-12-31")
    assert flt.operator == "between"
    assert flt.value == {"min": "2026-01-01", "max": "2026-12-31"}


def test_f_outside():
    """f.outside produces operator "outside" and {"min": a, "max": b} value."""
    flt = f.outside(0, 50)
    assert flt.operator == "outside"
    assert flt.value == {"min": 0, "max": 50}


# ---------------------------------------------------------------------------
# classify_filters: three-bucket classification
# ---------------------------------------------------------------------------


def test_classify_default_snake_key_lands_in_named_field():
    """Default snake_case key (e.g. "status") lands in a named OppFilters field, not customFilters."""
    consumer_filters = {"status": f.in_(["open"])}
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert isinstance(result, OppFilters)
    assert result.status is not None
    assert result.custom_filters is None


def test_classify_default_camel_alias_lands_in_named_field():
    """THE LANDMINE: camelCase alias "closeDateRange" must land in named field, NOT customFilters."""
    consumer_filters = {"closeDateRange": f.between("2026-01-01", "2026-12-31")}
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert isinstance(result, OppFilters)
    # The camelCase alias must normalize to the snake_case field
    assert result.close_date_range is not None
    # It must NOT appear in customFilters
    if result.custom_filters:
        assert "closeDateRange" not in result.custom_filters


def test_classify_registered_custom_filter_lands_in_custom_filters():
    """A registered custom filter (e.g. "agency") lands in OppFilters.custom_filters."""
    consumer_filters = {"agency": f.in_(["NSF", "NIH"])}
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert isinstance(result, OppFilters)
    assert result.custom_filters is not None
    assert "agency" in result.custom_filters


def test_classify_adhoc_unregistered_filter_lands_in_custom_filters():
    """An unregistered ad-hoc key (e.g. "legacyTag") passes through to customFilters."""
    consumer_filters = {"legacyTag": f.eq("priority")}
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert isinstance(result, OppFilters)
    assert result.custom_filters is not None
    assert "legacyTag" in result.custom_filters


def test_classify_escape_hatch_key_lands_in_custom_filters():
    """gov.<system>@<filter> escape-hatch keys pass through to customFilters."""
    consumer_filters = {"gov.someSystem@someFilter": f.eq("test")}
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert isinstance(result, OppFilters)
    assert result.custom_filters is not None
    assert "gov.someSystem@someFilter" in result.custom_filters


# ---------------------------------------------------------------------------
# Request-body shape
# ---------------------------------------------------------------------------


def test_request_body_has_default_fields_at_top_level_and_custom_filters_nested():
    """model_dump(by_alias=True, exclude_none=True) yields the ADR-0012 request-body shape.

    Default filters appear at top level; custom/ad-hoc appear under "customFilters".
    """
    consumer_filters = {
        "status": f.in_(["open"]),
        "agency": f.in_(["NSF"]),
        "legacyTag": f.eq("priority"),
    }
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    request_body = result.model_dump(by_alias=True, exclude_none=True)

    # Default field appears at top level
    assert "status" in request_body
    # Custom and ad-hoc filters are nested under customFilters
    assert "customFilters" in request_body
    assert "agency" in request_body["customFilters"]
    assert "legacyTag" in request_body["customFilters"]
    # customFilters is NOT a top-level key for a default filter
    assert "status" not in request_body.get("customFilters", {})


def test_request_body_no_custom_filters_key_when_all_defaults():
    """customFilters key is absent from the request body when all filters are default fields."""
    consumer_filters = {"status": f.in_(["open"])}
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    request_body = result.model_dump(by_alias=True, exclude_none=True)
    assert "customFilters" not in request_body


def test_oppfilters_mixed_case_roundtrip():
    """Alias-normalization round-trip proof.

    A mix of snake_case and camelCase default keys — including 'closeDateRange' as
    a camelCase alias — must normalize to the correct snake_case field names and
    produce the correct ADR-0012 request JSON via model_dump(by_alias=True, exclude_none=True).

    Asserts:
    - closeDateRange lands in its named default field (close_date_range), NOT in customFilters.
    - request-body output uses camelCase aliases (by_alias=True).
    """
    consumer_filters = {
        "status": f.in_(["open", "forecasted"]),  # snake_case default
        "closeDateRange": f.between(
            "2026-01-01", "2026-12-31"
        ),  # camelCase alias default
    }
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert isinstance(result, OppFilters)

    # camelCase alias must land in named field
    assert result.close_date_range is not None

    request_body = result.model_dump(by_alias=True, exclude_none=True)

    # Both named fields appear at top level with their alias names
    assert "status" in request_body
    assert "closeDateRange" in request_body

    # closeDateRange is NOT in customFilters
    assert "customFilters" not in request_body or "closeDateRange" not in request_body.get(
        "customFilters", {}
    )


# ---------------------------------------------------------------------------
# Registration-time validation (validate_routes) — RAISES PluginError
# ---------------------------------------------------------------------------


def test_validate_routes_unknown_filter_type_raises():
    """validate_routes raises PluginError when filter_type is not in FILTER_TYPE_SCHEMAS."""
    # Manually construct a spec with a bogus filter_type bypassing the enum
    bad_spec = CustomFilterSpec.__new__(CustomFilterSpec)
    object.__setattr__(bad_spec, "filter_type", "unknownType")  # type: ignore[arg-type]
    object.__setattr__(bad_spec, "description", None)

    routes = {"opportunities": {"search": {"myFilter": bad_spec}}}
    with pytest.raises(PluginError, match="Unknown filter_type"):
        validate_routes(routes)


def test_validate_routes_collision_with_default_filter_name_raises():
    """validate_routes raises PluginError when a custom filter name collides with a CORE DEFAULT name.

    This is the escape-hatch collision check. E.g. naming a custom filter "status"
    would shadow the core default "status" field — must be caught at registration time.
    """
    routes = {
        "opportunities": {
            "search": {
                "status": CustomFilterSpec(
                    filter_type=CustomFilterType.STRING_ARRAY,
                    description="Should collide with default",
                ),
            }
        }
    }
    with pytest.raises(PluginError, match="collides"):
        validate_routes(routes)


def test_validate_routes_collision_with_camel_alias_raises():
    """validate_routes raises PluginError for camelCase alias collision (e.g. "closeDateRange")."""
    routes = {
        "opportunities": {
            "search": {
                "closeDateRange": CustomFilterSpec(
                    filter_type=CustomFilterType.DATE_RANGE,
                    description="Should collide with default alias",
                ),
            }
        }
    }
    with pytest.raises(PluginError, match="collides"):
        validate_routes(routes)


def test_validate_routes_valid_routes_do_not_raise():
    """validate_routes does not raise for a fully valid routes dict."""
    # Should not raise
    validate_routes(SAMPLE_ROUTES)


# ---------------------------------------------------------------------------
# Call-time validation (validate_filter_call) — RAISES PluginError
# ---------------------------------------------------------------------------


def test_validate_filter_call_registered_bad_operator_raises():
    """validate_filter_call raises PluginError when a registered filter has an operator/value mismatch."""
    # AGENCY_SPEC is STRING_ARRAY — an "eq" with a scalar value is wrong for StringArrayFilter
    bad_filter = f.eq("not-an-array")
    with pytest.raises(PluginError):
        validate_filter_call(AGENCY_SPEC, "agency", bad_filter)


def test_validate_filter_call_adhoc_invalid_shape_raises():
    """validate_filter_call raises PluginError when an ad-hoc filter has an invalid DefaultFilter shape."""

    # Pass None as spec (ad-hoc), with something that isn't a DefaultFilter
    class _BadShape:
        operator = "not_a_real_operator"
        value = object()  # not a valid value type

    with pytest.raises(PluginError):
        validate_filter_call(None, "legacyTag", _BadShape())  # type: ignore[arg-type]


def test_validate_filter_call_valid_registered_does_not_raise():
    """validate_filter_call does not raise for a valid registered filter call."""
    valid_filter = f.in_(["NSF", "NIH"])
    # Should not raise — agency is STRING_ARRAY, in_ with list is valid
    validate_filter_call(AGENCY_SPEC, "agency", valid_filter)


def test_validate_filter_call_money_comparison_passes_valid_money():
    """A registered moneyComparison filter accepts a comparison operator and Money value.

    Money.amount is a decimal STRING ("1000000"), not a number — the shape that
    drifted in the TS compile-time filter map and was locked there with
    compile-error tests; covered here at the runtime layer.
    """
    spec = CustomFilterSpec(filter_type=CustomFilterType.MONEY_COMPARISON)
    validate_filter_call(
        spec, "awardFloor", f.gt({"amount": "1000000", "currency": "USD"})
    )


def test_validate_filter_call_money_comparison_rejects_array_operator():
    """A registered moneyComparison filter raises PluginError for an array operator."""
    spec = CustomFilterSpec(filter_type=CustomFilterType.MONEY_COMPARISON)
    with pytest.raises(PluginError):
        validate_filter_call(
            spec, "awardFloor", f.in_([{"amount": "1000000", "currency": "USD"}])
        )


def test_validate_filter_call_money_comparison_rejects_numeric_amount():
    """A registered moneyComparison filter raises PluginError for a numeric amount.

    Money.amount is a DecimalString — a raw number is the wrong shape.
    """
    spec = CustomFilterSpec(filter_type=CustomFilterType.MONEY_COMPARISON)
    with pytest.raises(PluginError):
        validate_filter_call(
            spec, "awardFloor", f.gt({"amount": 1000.5, "currency": "USD"})
        )


def test_validate_filter_call_money_range_passes_valid_range():
    """A registered moneyRange filter accepts between with {min, max} Money values."""
    spec = CustomFilterSpec(filter_type=CustomFilterType.MONEY_RANGE)
    validate_filter_call(
        spec,
        "awardRange",
        f.between(
            {"amount": "10000", "currency": "USD"},
            {"amount": "500000", "currency": "USD"},
        ),
    )


def test_validate_filter_call_money_range_rejects_comparison_operator():
    """A registered moneyRange filter raises PluginError for a comparison operator."""
    spec = CustomFilterSpec(filter_type=CustomFilterType.MONEY_RANGE)
    with pytest.raises(PluginError):
        validate_filter_call(
            spec, "awardRange", f.gt({"amount": "10000", "currency": "USD"})
        )


def test_classify_default_wrong_shape_raises_plugin_error():
    """A wrong-shaped DEFAULT filter raises PluginError, not a raw pydantic ValidationError.

    "status" is a StringArrayFilter (ArrayOperator + list[str]); f.eq("open") is an
    equivalence filter. The error contract must be uniform across all three buckets:
    consumers following the documented `except PluginError` pattern must catch this.
    """
    with pytest.raises(PluginError) as exc_info:
        classify_filters(
            SAMPLE_ROUTES, "opportunities", "search", {"status": f.eq("open")}
        )
    # The underlying pydantic error is preserved as cause for programmatic access
    assert isinstance(exc_info.value.__cause__, ValidationError)


def test_validate_filter_call_integer_comparison_rejects_non_integer():
    """A registered integerComparison filter raises PluginError for a fractional value.

    integerComparison validates against IntegerComparisonFilter (strict int),
    not the looser NumberComparisonFilter.
    """
    spec = CustomFilterSpec(filter_type=CustomFilterType.INTEGER_COMPARISON)
    with pytest.raises(PluginError):
        validate_filter_call(spec, "awardCount", f.gt(100.5))


def test_validate_filter_call_integer_comparison_passes_valid_int():
    """A registered integerComparison filter accepts an integer value."""
    spec = CustomFilterSpec(filter_type=CustomFilterType.INTEGER_COMPARISON)
    validate_filter_call(spec, "awardCount", f.gt(100))


def test_classify_default_camel_alias_wrong_shape_raises_plugin_error():
    """A wrong-shaped default filter via its camelCase alias also raises PluginError.

    "closeDateRange" is a DateRangeFilter; f.eq("2026-01-01") is an equivalence
    filter — the alias normalization path must surface the same PluginError.
    """
    with pytest.raises(PluginError):
        classify_filters(
            SAMPLE_ROUTES,
            "opportunities",
            "search",
            {"closeDateRange": f.eq("2026-01-01")},
        )
