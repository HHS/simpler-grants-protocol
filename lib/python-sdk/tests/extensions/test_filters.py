"""Tests for classify_filters, f helpers, validate_routes, and validate_filter_call
in common_grants_sdk.extensions.filters."""

from __future__ import annotations

import json
from datetime import date

import pytest
from pydantic import ValidationError

from common_grants_sdk.extensions.filters import (
    FILTER_TYPE_SCHEMAS,
    classify_filters,
    f,
    validate_filter_call,
    validate_routes,
)
from common_grants_sdk.extensions.specs import CustomFilterSpec, CustomFilterType
from common_grants_sdk.extensions.types import FilterError
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
            "filters": {
                "agency": AGENCY_SPEC,
                "fundingProgram": FUNDING_PROGRAM_SPEC,
            }
        }
    }
}


# ---------------------------------------------------------------------------
# f.* helpers
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("helper", "args", "operator", "value"),
    [
        ("eq", ("open",), "eq", "open"),
        ("neq", ("x",), "neq", "x"),
        ("gt", (1,), "gt", 1),
        ("gte", (1,), "gte", 1),
        ("lt", (1,), "lt", 1),
        ("lte", (1,), "lte", 1),
        ("in_", (["a"],), "in", ["a"]),
        ("not_in", (["a"],), "notIn", ["a"]),
        ("like", ("%x%",), "like", "%x%"),
        ("not_like", ("%x%",), "notLike", "%x%"),
        ("between", (0, 1), "between", {"min": 0, "max": 1}),
        ("outside", (0, 1), "outside", {"min": 0, "max": 1}),
    ],
)
def test_f_helper_wire_values(helper, args, operator, value):
    """Every f helper produces its documented wire operator and value shape.

    Includes the reserved-word workarounds: Python f.in_ / f.not_in produce
    wire operators "in" / "notIn".
    """
    flt = getattr(f, helper)(*args)
    assert flt.operator == operator
    assert flt.value == value


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
    # It must NOT appear in customFilters (a conditional check here could
    # never fail on the path it guards — assert the bucket is empty outright)
    assert result.custom_filters is None


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

    # Nothing landed in customFilters — assert the bucket is absent outright
    # (a conditional check could never fail on the path it guards)
    assert "customFilters" not in request_body


# ---------------------------------------------------------------------------
# Registration-time validation (validate_routes) — RAISES FilterError
# ---------------------------------------------------------------------------


def test_validate_routes_unknown_filter_type_raises():
    """validate_routes raises FilterError when filter_type is not in FILTER_TYPE_SCHEMAS."""
    # Dataclasses don't validate field types at runtime, so a bogus filter_type
    # can be passed directly (the annotation is for type checkers only).
    bad_spec = CustomFilterSpec(filter_type="unknownType")  # type: ignore[arg-type]

    routes = {"opportunities": {"search": {"filters": {"myFilter": bad_spec}}}}
    with pytest.raises(FilterError, match="Unknown filter_type"):
        validate_routes(routes)


def test_validate_routes_collision_with_default_filter_name_raises():
    """validate_routes raises FilterError when a custom filter name collides with a CORE DEFAULT name.

    This is the escape-hatch collision check. E.g. naming a custom filter "status"
    would shadow the core default "status" field — must be caught at registration time.
    """
    routes = {
        "opportunities": {
            "search": {
                "filters": {
                    "status": CustomFilterSpec(
                        filter_type=CustomFilterType.STRING_ARRAY,
                        description="Should collide with default",
                    ),
                }
            }
        }
    }
    with pytest.raises(FilterError, match="collides"):
        validate_routes(routes)


def test_validate_routes_collision_with_camel_alias_raises():
    """validate_routes raises FilterError for camelCase alias collision (e.g. "closeDateRange")."""
    routes = {
        "opportunities": {
            "search": {
                "filters": {
                    "closeDateRange": CustomFilterSpec(
                        filter_type=CustomFilterType.DATE_RANGE,
                        description="Should collide with default alias",
                    ),
                }
            }
        }
    }
    with pytest.raises(FilterError, match="collides"):
        validate_routes(routes)


def test_validate_routes_valid_routes_do_not_raise():
    """validate_routes does not raise for a fully valid routes dict."""
    # Should not raise
    validate_routes(SAMPLE_ROUTES)


# ---------------------------------------------------------------------------
# Call-time validation (validate_filter_call) — RAISES FilterError
# ---------------------------------------------------------------------------


def test_validate_filter_call_registered_bad_operator_raises():
    """validate_filter_call raises FilterError when a registered filter has an operator/value mismatch."""
    # AGENCY_SPEC is STRING_ARRAY — an "eq" with a scalar value is wrong for StringArrayFilter
    bad_filter = f.eq("not-an-array")
    with pytest.raises(FilterError):
        validate_filter_call(AGENCY_SPEC, "agency", bad_filter)


def test_validate_filter_call_adhoc_invalid_shape_raises():
    """validate_filter_call raises FilterError when an ad-hoc filter has an invalid DefaultFilter shape."""

    # Pass None as spec (ad-hoc), with something that isn't a DefaultFilter
    class _BadShape:
        operator = "not_a_real_operator"
        value = object()  # not a valid value type

    with pytest.raises(FilterError):
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
    """A registered moneyComparison filter raises FilterError for an array operator."""
    spec = CustomFilterSpec(filter_type=CustomFilterType.MONEY_COMPARISON)
    with pytest.raises(FilterError):
        validate_filter_call(
            spec, "awardFloor", f.in_([{"amount": "1000000", "currency": "USD"}])
        )


def test_validate_filter_call_money_comparison_rejects_numeric_amount():
    """A registered moneyComparison filter raises FilterError for a numeric amount.

    Money.amount is a DecimalString — a raw number is the wrong shape.
    """
    spec = CustomFilterSpec(filter_type=CustomFilterType.MONEY_COMPARISON)
    with pytest.raises(FilterError):
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
    """A registered moneyRange filter raises FilterError for a comparison operator."""
    spec = CustomFilterSpec(filter_type=CustomFilterType.MONEY_RANGE)
    with pytest.raises(FilterError):
        validate_filter_call(
            spec, "awardRange", f.gt({"amount": "10000", "currency": "USD"})
        )


def test_classify_default_wrong_shape_raises_plugin_error():
    """A wrong-shaped DEFAULT filter raises FilterError, not a raw pydantic ValidationError.

    "status" is a StringArrayFilter (ArrayOperator + list[str]); f.eq("open") is an
    equivalence filter. The error contract must be uniform across all three buckets:
    consumers following the documented `except FilterError` pattern must catch this.
    """
    with pytest.raises(FilterError) as exc_info:
        classify_filters(
            SAMPLE_ROUTES, "opportunities", "search", {"status": f.eq("open")}
        )
    # The underlying pydantic error is preserved as cause for programmatic access
    assert isinstance(exc_info.value.__cause__, ValidationError)


def test_validate_filter_call_integer_comparison_validates_as_number():
    """A registered integerComparison filter validates against NumberComparisonFilter.

    The spec defines no integer filter model, so the int constraint is not
    schema-enforced (same as the TS SDK); a numeric value passes, a non-numeric
    value fails.
    """
    spec = CustomFilterSpec(filter_type=CustomFilterType.INTEGER_COMPARISON)
    validate_filter_call(spec, "awardCount", f.gt(100))
    with pytest.raises(FilterError):
        validate_filter_call(spec, "awardCount", f.gt("not a number"))


def test_classify_default_camel_alias_wrong_shape_raises_plugin_error():
    """A wrong-shaped default filter via its camelCase alias also raises FilterError.

    "closeDateRange" is a DateRangeFilter; f.eq("2026-01-01") is an equivalence
    filter — the alias normalization path must surface the same FilterError.
    """
    with pytest.raises(FilterError):
        classify_filters(
            SAMPLE_ROUTES,
            "opportunities",
            "search",
            {"closeDateRange": f.eq("2026-01-01")},
        )


# ---------------------------------------------------------------------------
# Wire-body integrity: the value that passed validation is the value shipped
# ---------------------------------------------------------------------------

WIRE_ROUTES = {
    "opportunities": {
        "search": {
            "filters": {
                "isOpen": CustomFilterSpec(
                    filter_type=CustomFilterType.BOOLEAN_COMPARISON
                ),
                "awardCount": CustomFilterSpec(
                    filter_type=CustomFilterType.NUMBER_COMPARISON
                ),
            }
        }
    }
}


def test_boolean_filter_value_survives_to_wire_as_json_true():
    """f.eq(True) serializes as JSON true, not 1.

    DefaultFilter.value is Any per the core spec (filters/base.tsp `unknown`);
    a narrowed union without bool lax-coerced True -> 1 and corrupted the wire.
    """
    result = classify_filters(
        WIRE_ROUTES, "opportunities", "search", {"isOpen": f.eq(True)}
    )
    body = result.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert body["customFilters"]["isOpen"]["value"] is True


def test_registered_filter_ships_validated_value_not_raw_input():
    """The wire body carries the value that passed validation, not the raw input.

    NumberComparisonFilter lax-coerces "42" -> 42 (smart-union resolves the
    int|float union to int first); shipping the raw string would mean the
    payload differs from what validation approved.
    """
    result = classify_filters(
        WIRE_ROUTES, "opportunities", "search", {"awardCount": f.gt("42")}
    )
    body = result.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert body["customFilters"]["awardCount"]["value"] == 42
    assert isinstance(body["customFilters"]["awardCount"]["value"], int)


def test_number_comparison_registered_filter_rejects_bool():
    """f.eq(True) on a numberComparison-registered filter raises, never ships 1.

    bool subclasses int; without an explicit rejection the int|float union
    lax-coerces True -> 1 and the wire silently carries a number for a
    boolean — the corruption class the DefaultFilter.value widening fixed.
    """
    with pytest.raises(FilterError):
        classify_filters(
            WIRE_ROUTES, "opportunities", "search", {"awardCount": f.eq(True)}
        )


@pytest.mark.filterwarnings("ignore::UserWarning")  # pydantic warns during the
# model_dump of the mutated instance, before re-validation raises
def test_mutated_adhoc_instance_is_revalidated_and_raises():
    """An ad-hoc DefaultFilter mutated after construction raises instead of shipping.

    The filter models are mutable; the ad-hoc branch must re-validate instances
    rather than trust isinstance.
    """
    flt = f.eq("x")
    flt.operator = "bogus"  # type: ignore[assignment]
    with pytest.raises(FilterError):
        classify_filters(SAMPLE_ROUTES, "opportunities", "search", {"legacy": flt})


def test_unknown_filter_type_raises_plugin_error_not_key_error():
    """A spec whose filter_type never passed validate_routes raises FilterError.

    The uniform error contract holds even when registration-time validation was
    skipped — consumers catching `except FilterError` must not see a KeyError.
    """
    spec = CustomFilterSpec(filter_type="bogusType")  # type: ignore[arg-type]
    with pytest.raises(FilterError):
        validate_filter_call(spec, "x", f.eq(1))


def test_validate_filter_call_adhoc_accepts_raw_dict():
    """Ad-hoc validation accepts a raw operator/value dict and returns a DefaultFilter."""
    validated = validate_filter_call(None, "x", {"operator": "eq", "value": "v"})
    assert validated.operator == "eq"
    assert validated.value == "v"


# ---------------------------------------------------------------------------
# Alias normalization (snake form), serialization contract, error paths
# ---------------------------------------------------------------------------


def test_classify_default_snake_form_of_aliased_key_normalizes_to_alias():
    """Snake_case key for an ALIASED field lands in the named field, not customFilters.

    Exercises the _SNAKE_TO_ALIAS hit branch: without normalization,
    OppFilters(close_date_range=...) is silently dropped by pydantic
    (populate_by_name is not set) and the field stays None.
    """
    consumer_filters = {"close_date_range": f.between("2026-01-01", "2026-12-31")}
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert result.close_date_range is not None
    assert result.custom_filters is None


def test_classify_both_forms_of_same_default_filter_raises():
    """Supplying snake AND camel forms of one default filter raises FilterError.

    Both keys normalize to "closeDateRange"; without the guard, dict
    assignment silently drops whichever range the consumer's dict ordered
    first (plausible when merging filter dicts from two naming conventions).
    """
    consumer_filters = {
        "close_date_range": f.between("2026-01-01", "2026-06-30"),
        "closeDateRange": f.between("2026-07-01", "2026-12-31"),
    }
    with pytest.raises(FilterError, match="more than once") as exc_info:
        classify_filters(SAMPLE_ROUTES, "opportunities", "search", consumer_filters)
    assert exc_info.value.path == "filters.closeDateRange"


@pytest.mark.parametrize(
    ("resource", "method"),
    [
        ("opportunities", "list"),  # method not declared in routes
        ("opportunity", "search"),  # resource near-miss (pluralization)
    ],
)
def test_classify_unmatched_route_treats_registered_name_as_adhoc(resource, method):
    """A (resource, method) pair with no routes entry has NO registered bucket.

    "agency" is registered as STRING_ARRAY under opportunities.search only;
    via any other route pair it is validated as permissive ad-hoc, so
    f.eq("NSF") (invalid for STRING_ARRAY) passes through to customFilters.
    Discriminates both levels of the routes[resource][method] lookup — a
    regression that flattens or mis-keys it either wrongly applies the spec
    or wrongly skips it.
    """
    result = classify_filters(SAMPLE_ROUTES, resource, method, {"agency": f.eq("NSF")})
    assert result.custom_filters is not None
    assert result.custom_filters["agency"].value == "NSF"

    # ...and the same filter via the declared pair IS spec-validated and rejected
    with pytest.raises(FilterError):
        classify_filters(
            SAMPLE_ROUTES, "opportunities", "search", {"agency": f.eq("NSF")}
        )


def test_request_body_mode_json_round_trip():
    """The documented model_dump(mode="json") call yields a json.dumps-able body.

    Coerced date objects only serialize in json mode — this is the ADR-0012
    wire body the classifier exists to produce.
    """
    consumer_filters = {
        "close_date_range": f.between(date(2026, 1, 1), date(2026, 12, 31)),
        "agency": f.in_(["NSF"]),
    }
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    body = json.loads(
        json.dumps(result.model_dump(by_alias=True, exclude_none=True, mode="json"))
    )
    assert body["closeDateRange"]["operator"] == "between"
    assert body["closeDateRange"]["value"]["min"] == "2026-01-01"
    assert body["customFilters"]["agency"]["operator"] == "in"


def test_classify_empty_filters_dict_yields_empty_body():
    """An empty consumer dict produces an OppFilters with no customFilters entry."""
    result = classify_filters(SAMPLE_ROUTES, "opportunities", "search", {})
    assert result.custom_filters is None
    body = result.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert "customFilters" not in body


def test_filter_type_schemas_covers_every_custom_filter_type():
    """Every CustomFilterType member has a validation model.

    A catalog member without a FILTER_TYPE_SCHEMAS entry would reject valid
    registrations in validate_routes — this assert turns that drift into a
    CI failure at the moment the enum and the map diverge.
    """
    assert set(FILTER_TYPE_SCHEMAS) == set(CustomFilterType)


def test_plugin_error_path_is_uniform_across_buckets():
    """All three buckets raise FilterError with a filters.<name> path."""
    with pytest.raises(FilterError) as exc1:
        classify_filters(
            SAMPLE_ROUTES, "opportunities", "search", {"status": f.eq("open")}
        )
    assert exc1.value.path == "filters.status"

    with pytest.raises(FilterError) as exc2:
        classify_filters(
            SAMPLE_ROUTES, "opportunities", "search", {"agency": f.eq("NSF")}
        )
    assert exc2.value.path == "filters.agency"

    with pytest.raises(FilterError) as exc3:
        classify_filters(
            SAMPLE_ROUTES, "opportunities", "search", {"adhoc": {"operator": "bogus"}}
        )
    assert exc3.value.path == "filters.adhoc"


def test_multiple_failing_defaults_use_collective_path():
    """Two failing default filters produce the collective path "filters"."""
    with pytest.raises(FilterError) as exc_info:
        classify_filters(
            SAMPLE_ROUTES,
            "opportunities",
            "search",
            {"status": f.eq("open"), "closeDateRange": f.eq("x")},
        )
    assert exc_info.value.path == "filters"
