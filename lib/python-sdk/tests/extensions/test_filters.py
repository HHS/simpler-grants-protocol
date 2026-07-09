"""Tests for classify_filters, f helpers, validate_routes, and validate_filter_call
in common_grants_sdk.extensions.filters."""

from __future__ import annotations

import json
from datetime import date

import pytest
from pydantic import ValidationError

from common_grants_sdk.extensions import PluginRoutes, ResourceRoutes
from common_grants_sdk.extensions.filters import (
    VALID_FILTER_MODELS,
    classify_filters,
    f,
    validate_filter_call,
    validate_routes,
)
from common_grants_sdk.extensions.types import FilterError
from common_grants_sdk.schemas.pydantic.filters.integer import IntegerComparisonFilter
from common_grants_sdk.schemas.pydantic.filters.money import (
    MoneyComparisonFilter,
    MoneyRangeFilter,
)
from common_grants_sdk.schemas.pydantic.filters.numeric import (
    NumberComparisonFilter,
    NumberRangeFilter,
)
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    BooleanComparison,
    IntegerComparison,
    NumberComparison,
    OpportunityFilters,
    OppFilters,
    StringArray,
    StringComparison,
)
from common_grants_sdk.schemas.pydantic.filters.string import StringArrayFilter

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


class OppSearchFilters(OpportunityFilters, total=False):
    """The registered custom filters for opportunities.search.

    ``agency`` is a stringArray filter; ``fundingProgram`` a stringComparison —
    each key's value model *is* its declared type, recovered at classify time.
    """

    agency: StringArray
    fundingProgram: StringComparison


SAMPLE_ROUTES = PluginRoutes(opportunities=ResourceRoutes(search=OppSearchFilters))


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

    Asserts the JSON wire dump, not the in-memory ``.value``: the builders return
    precise filter models whose ``.value`` may be a sub-model (e.g. ``NumberRange``).
    ``f.in_`` and ``f.not_in`` use trailing underscores because ``in`` is a Python
    keyword, and produce the wire operators "in" and "notIn".
    """
    flt = getattr(f, helper)(*args)
    wire = flt.model_dump(by_alias=True, mode="json")
    assert wire["operator"] == operator
    assert wire["value"] == value


# ---------------------------------------------------------------------------
# VALID_FILTER_MODELS registry
# ---------------------------------------------------------------------------


def test_valid_filter_models_includes_integer_comparison():
    """IntegerComparisonFilter is registered as one of the valid filter models."""
    assert IntegerComparisonFilter in VALID_FILTER_MODELS


# ---------------------------------------------------------------------------
# classify_filters: three-bucket classification (happy paths)
# ---------------------------------------------------------------------------


def test_classify_default_snake_key_lands_in_named_field():
    """A standard snake_case key (e.g. "status") lands in a named OppFilters field, not customFilters."""
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", {"status": f.in_(["open"])}
    )
    assert isinstance(result, OppFilters)
    assert result.status is not None
    assert result.custom_filters is None


def test_classify_default_camel_alias_lands_in_named_field():
    """A camelCase alias (e.g. "closeDateRange") lands in its named field, not customFilters."""
    result = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {"closeDateRange": f.between("2026-01-01", "2026-12-31")},
    )
    assert isinstance(result, OppFilters)
    assert result.close_date_range is not None
    assert result.custom_filters is None


def test_classify_registered_custom_filter_lands_in_custom_filters():
    """A registered custom filter (e.g. "agency") lands in OppFilters.custom_filters."""
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", {"agency": f.in_(["NSF", "NIH"])}
    )
    assert result.custom_filters is not None
    assert "agency" in result.custom_filters


def test_classify_adhoc_unregistered_filter_lands_in_custom_filters():
    """An unregistered ad-hoc key (e.g. "legacyTag") passes through to customFilters."""
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", {"legacyTag": f.eq("priority")}
    )
    assert result.custom_filters is not None
    assert "legacyTag" in result.custom_filters


def test_classify_escape_hatch_key_lands_in_custom_filters():
    """gov.<system>@<filter> escape-hatch keys pass through to customFilters."""
    result = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {"gov.someSystem@someFilter": f.eq("test")},
    )
    assert result.custom_filters is not None
    assert "gov.someSystem@someFilter" in result.custom_filters


def test_classify_registered_integer_comparison_filter():
    """A registered integerComparison filter validates and lands in customFilters."""

    class IntFilters(OpportunityFilters, total=False):
        awardCount: IntegerComparison

    routes = PluginRoutes(opportunities=ResourceRoutes(search=IntFilters))
    result = classify_filters(
        routes, "opportunities", "search", {"awardCount": f.gt(5)}
    )
    assert result.custom_filters is not None
    assert "awardCount" in result.custom_filters


# ---------------------------------------------------------------------------
# Request-body shape
# ---------------------------------------------------------------------------


def test_request_body_has_default_fields_at_top_level_and_custom_filters_nested():
    """model_dump(by_alias=True, exclude_none=True) yields the ADR-0012 request-body shape.

    Default filters appear at top level; custom and ad-hoc filters appear under
    "customFilters".
    """
    result = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {
            "status": f.in_(["open"]),
            "agency": f.in_(["NSF"]),
            "legacyTag": f.eq("priority"),
        },
    )
    request_body = result.model_dump(by_alias=True, exclude_none=True)

    assert "status" in request_body
    assert "customFilters" in request_body
    assert "agency" in request_body["customFilters"]
    assert "legacyTag" in request_body["customFilters"]
    assert "status" not in request_body.get("customFilters", {})


def test_request_body_no_custom_filters_key_when_all_defaults():
    """customFilters key is absent from the request body when all filters are default fields."""
    result = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", {"status": f.in_(["open"])}
    )
    request_body = result.model_dump(by_alias=True, exclude_none=True)
    assert "customFilters" not in request_body


def test_oppfilters_mixed_case_roundtrip():
    """A mix of snake_case and camelCase default keys normalizes to the correct fields.

    "closeDateRange" is given as a camelCase alias; it must land in its named field
    (close_date_range) rather than customFilters, and the request body must use the
    camelCase aliases.
    """
    result = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {
            "status": f.in_(["open", "forecasted"]),
            "closeDateRange": f.between("2026-01-01", "2026-12-31"),
        },
    )
    assert result.close_date_range is not None
    request_body = result.model_dump(by_alias=True, exclude_none=True)
    assert "status" in request_body
    assert "closeDateRange" in request_body
    assert "customFilters" not in request_body


def test_request_body_mode_json_round_trip():
    """model_dump(mode="json") yields a body that json.dumps can serialize.

    Coerced date objects only serialize in json mode, which is the mode the
    classifier output is dumped with.
    """
    result = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {
            "close_date_range": f.between(date(2026, 1, 1), date(2026, 12, 31)),
            "agency": f.in_(["NSF"]),
        },
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


def test_classify_default_snake_form_of_aliased_key_normalizes_to_alias():
    """A snake_case key for an aliased field lands in the named field, not customFilters.

    Without the alias normalization, OppFilters(close_date_range=...) would be
    silently dropped by pydantic (populate_by_name is not set) and the field would
    stay None.
    """
    result = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {"close_date_range": f.between("2026-01-01", "2026-12-31")},
    )
    assert result.close_date_range is not None
    assert result.custom_filters is None


# ---------------------------------------------------------------------------
# Wire-body integrity: the value that passed validation is the value shipped
# ---------------------------------------------------------------------------


class WireFilters(OpportunityFilters, total=False):
    """Registered wire-integrity filters: a boolean and a number comparison."""

    isOpen: BooleanComparison
    awardCount: NumberComparison


WIRE_ROUTES = PluginRoutes(opportunities=ResourceRoutes(search=WireFilters))


def test_boolean_filter_value_survives_to_wire_as_json_true():
    """f.eq(True) on a booleanComparison filter serializes as JSON true, not 1.

    DefaultFilter.value is Any (the core spec models it as ``unknown``), which keeps
    a boolean from being coerced to a number on its way to the wire.
    """
    result = classify_filters(
        WIRE_ROUTES, "opportunities", "search", {"isOpen": f.eq(True)}
    )
    body = result.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert body["customFilters"]["isOpen"]["value"] is True


def test_registered_filter_ships_validated_value_not_raw_input():
    """The classifier keeps the value that passed validation, not the raw input.

    A numberComparison filter coerces the string "42" to the integer 42, so the
    value that reaches the wire is the validated 42, not the original string.
    """
    result = classify_filters(
        WIRE_ROUTES, "opportunities", "search", {"awardCount": f.gt("42")}
    )
    body = result.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert body["customFilters"]["awardCount"]["value"] == 42
    assert isinstance(body["customFilters"]["awardCount"]["value"], int)


# ---------------------------------------------------------------------------
# classify_filters: fail-fast on an invalid filter value
# ---------------------------------------------------------------------------


def test_classify_invalid_default_raises():
    """An invalid standard filter raises FilterError before a request body is built.

    "status" is a StringArrayFilter (an array operator with a list of strings), so
    f.eq("open") (an equivalence operator with a scalar) does not fit it.
    """
    with pytest.raises(FilterError) as exc:
        classify_filters(
            SAMPLE_ROUTES, "opportunities", "search", {"status": f.eq("open")}
        )
    assert exc.value.path == "filters.status"
    assert isinstance(exc.value.cause, ValidationError)


def test_classify_invalid_default_via_alias_raises():
    """An invalid standard filter given by its camelCase alias raises, using the alias in the path.

    "closeDateRange" is a DateRangeFilter; f.eq("2026-01-01") does not fit it.
    """
    with pytest.raises(FilterError) as exc:
        classify_filters(
            SAMPLE_ROUTES,
            "opportunities",
            "search",
            {"closeDateRange": f.eq("2026-01-01")},
        )
    assert exc.value.path == "filters.closeDateRange"


def test_classify_invalid_money_range_default_raises():
    """An invalid moneyRange standard filter raises.

    "totalFundingAvailableRange" is a MoneyRangeFilter (a range operator with min
    and max Money values); f.eq("100") is a valid permissive DefaultFilter but not a
    MoneyRangeFilter. This confirms the money-range defaults are validated against
    their real type rather than the permissive DefaultFilter shape.
    """
    with pytest.raises(FilterError) as exc:
        classify_filters(
            SAMPLE_ROUTES,
            "opportunities",
            "search",
            {"totalFundingAvailableRange": f.eq("100")},
        )
    assert exc.value.path == "filters.totalFundingAvailableRange"


def test_classify_invalid_registered_raises():
    """An invalid registered custom filter raises before a request body is built.

    "agency" is a stringArray; f.eq("NSF") (a scalar equivalence) does not fit it.
    """
    with pytest.raises(FilterError) as exc:
        classify_filters(
            SAMPLE_ROUTES, "opportunities", "search", {"agency": f.eq("NSF")}
        )
    assert exc.value.path == "filters.agency"


def test_classify_registered_number_filter_rejects_bool():
    """A boolean given to a numberComparison filter raises rather than shipping 1.

    bool is a subclass of int, so without an explicit rejection True would be
    coerced to 1 and the request would carry a number where a boolean was passed.
    """
    with pytest.raises(FilterError) as exc:
        classify_filters(
            WIRE_ROUTES, "opportunities", "search", {"awardCount": f.eq(True)}
        )
    assert exc.value.path == "filters.awardCount"


def test_classify_adhoc_value_incompatible_with_operator_raises():
    """An ad-hoc filter whose value does not fit its operator raises FilterError.

    "in" expects a list, so {"operator": "in", "value": "NSF"} (a plain string) is
    rejected instead of passing through unchecked to the request.
    """
    with pytest.raises(FilterError) as exc:
        classify_filters(
            SAMPLE_ROUTES,
            "opportunities",
            "search",
            {"legacyTag": {"operator": "in", "value": "NSF"}},
        )
    assert exc.value.path == "filters.legacyTag"


def test_classify_adhoc_unknown_operator_raises():
    """An ad-hoc filter with an unknown operator raises FilterError."""
    with pytest.raises(FilterError) as exc:
        classify_filters(
            SAMPLE_ROUTES,
            "opportunities",
            "search",
            {"adhoc": {"operator": "bogus", "value": 1}},
        )
    assert exc.value.path == "filters.adhoc"


@pytest.mark.filterwarnings("ignore::UserWarning")
def test_classify_mutated_adhoc_instance_is_revalidated_and_raises():
    """An ad-hoc filter mutated after construction is re-validated and raises.

    The filter models are mutable, so the classifier validates the value at call
    time rather than trusting that it was valid when it was built.
    """
    flt = f.eq("x")
    flt.operator = "bogus"  # type: ignore[assignment]
    with pytest.raises(FilterError) as exc:
        classify_filters(SAMPLE_ROUTES, "opportunities", "search", {"legacy": flt})
    assert exc.value.path == "filters.legacy"


def test_classify_both_forms_of_same_default_filter_raises():
    """Supplying the snake_case and camelCase forms of one default filter raises.

    Both keys normalize to "closeDateRange"; supplying both is ambiguous, so it
    raises rather than silently dropping one of the two values.
    """
    with pytest.raises(FilterError) as exc:
        classify_filters(
            SAMPLE_ROUTES,
            "opportunities",
            "search",
            {
                "close_date_range": f.between("2026-01-01", "2026-06-30"),
                "closeDateRange": f.between("2026-07-01", "2026-12-31"),
            },
        )
    assert exc.value.path == "filters.closeDateRange"
    assert "more than once" in str(exc.value)


def test_classify_raises_on_the_first_invalid_filter():
    """When several filters are invalid, classify raises on the first one it reaches.

    The whole call fails; no partial request body is produced.
    """
    with pytest.raises(FilterError) as exc:
        classify_filters(
            SAMPLE_ROUTES,
            "opportunities",
            "search",
            {"status": f.eq("open"), "closeDateRange": f.eq("x")},
        )
    assert exc.value.path in {"filters.status", "filters.closeDateRange"}


def test_classify_mixed_valid_and_invalid_raises():
    """A mix of valid and invalid filters raises; a valid filter does not rescue the call."""
    with pytest.raises(FilterError):
        classify_filters(
            SAMPLE_ROUTES,
            "opportunities",
            "search",
            {
                "status": f.in_(["open"]),
                "agency": f.in_(["NSF"]),
                "fundingProgram": f.in_(["a", "b"]),  # stringComparison, not an array
            },
        )


def test_classify_all_valid_mixed_buckets_returns_all_keys():
    """A mix of valid standard, registered, and ad-hoc filters classifies all of them."""
    result = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {
            "status": f.in_(["open"]),
            "agency": f.in_(["NSF"]),
            "legacyTag": f.eq("priority"),
        },
    )
    assert result.status is not None
    assert result.custom_filters is not None
    assert "agency" in result.custom_filters
    assert "legacyTag" in result.custom_filters


@pytest.mark.parametrize(
    ("resource", "method"),
    [
        ("opportunities", "list"),  # method not declared in routes
        ("opportunity", "search"),  # resource near-miss (pluralization)
    ],
)
def test_classify_unmatched_route_treats_registered_name_as_adhoc(resource, method):
    """A (resource, method) pair with no routes entry has no registered bucket.

    "agency" is registered as a stringArray under opportunities.search only. Via any
    other pair it is validated as an ad-hoc filter, so f.eq("NSF") (a valid string
    comparison) passes through to customFilters. This exercises both levels of the
    routes lookup: a mis-keyed lookup would either apply the spec where it should
    not, or skip it where it should apply.
    """
    result = classify_filters(SAMPLE_ROUTES, resource, method, {"agency": f.eq("NSF")})
    assert result.custom_filters is not None
    assert result.custom_filters["agency"].value == "NSF"

    # Via the declared pair, "agency" is validated against its stringArray model and
    # f.eq("NSF") raises.
    with pytest.raises(FilterError) as exc:
        classify_filters(
            SAMPLE_ROUTES, "opportunities", "search", {"agency": f.eq("NSF")}
        )
    assert exc.value.path == "filters.agency"


# ---------------------------------------------------------------------------
# Registration-time validation (validate_routes) — RAISES FilterError
# ---------------------------------------------------------------------------


def test_validate_routes_non_filter_model_type_raises():
    """validate_routes raises when a registered filter is annotated with a type that
    is not a valid filter model.

    The typed carrier makes a misspelled resource or method a static error, so the
    remaining runtime check is that each registered key is annotated with one of the
    valid filter models. A ``region: int`` annotation is rejected here.
    """

    class BadFilters(OpportunityFilters, total=False):
        region: int  # not a filter value model

    with pytest.raises(FilterError):
        validate_routes(PluginRoutes(opportunities=ResourceRoutes(search=BadFilters)))


def test_validate_routes_redeclared_standard_key_wrong_type_raises():
    """validate_routes raises when a route redeclares a standard key with a different type.

    The call site would see the override while the classifier validates against the
    real standard field type, so the two would disagree.
    """

    class RedeclaresStatus(OpportunityFilters, total=False):
        status: StringComparison  # standard "status" is a StringArray filter

    with pytest.raises(FilterError):
        validate_routes(
            PluginRoutes(opportunities=ResourceRoutes(search=RedeclaresStatus))
        )


def test_validate_routes_redeclared_standard_key_same_type_ok():
    """Redeclaring a standard key with its same type is a harmless override."""

    class RedeclaresStatusSame(OpportunityFilters, total=False):
        status: StringArray  # same as the standard type

    validate_routes(
        PluginRoutes(opportunities=ResourceRoutes(search=RedeclaresStatusSame))
    )


def test_validate_routes_valid_routes_do_not_raise():
    """validate_routes does not raise for a fully valid typed routes carrier."""
    validate_routes(SAMPLE_ROUTES)


def test_validate_routes_empty_carrier_does_not_raise():
    """The empty carrier (no registered filters) passes validation silently."""
    validate_routes(PluginRoutes(opportunities=ResourceRoutes()))


# ---------------------------------------------------------------------------
# Call-time validation (validate_filter_call) — returns (value, error)
# ---------------------------------------------------------------------------


def test_validate_filter_call_registered_bad_operator_returns_error():
    """validate_filter_call returns (None, FilterError) for an operator/value mismatch.

    "agency" is validated against StringArrayFilter, so an equivalence operator with
    a scalar value does not fit it.
    """
    value, error = validate_filter_call(StringArrayFilter, "agency", f.eq("not-a-list"))
    assert value is None
    assert isinstance(error, FilterError)
    assert error.path == "filters.agency"


def test_validate_filter_call_valid_registered_returns_value_and_no_error():
    """validate_filter_call returns (DefaultFilter, None) for a valid registered filter call."""
    value, error = validate_filter_call(StringArrayFilter, "agency", f.in_(["NSF"]))
    assert error is None
    assert value is not None
    assert value.operator == "in"


def test_validate_filter_call_adhoc_accepts_valid_operator_value():
    """Ad-hoc validation accepts a raw operator/value dict that matches a known model."""
    value, error = validate_filter_call(None, "x", {"operator": "eq", "value": "v"})
    assert error is None
    assert value is not None
    assert value.operator == "eq"
    assert value.value == "v"


def test_validate_filter_call_adhoc_incompatible_value_returns_error():
    """Ad-hoc validation returns a FilterError when the value does not fit the operator.

    "in" expects a list, so a plain string does not match any valid filter model.
    """
    value, error = validate_filter_call(
        None, "legacyTag", {"operator": "in", "value": "NSF"}
    )
    assert value is None
    assert isinstance(error, FilterError)
    assert error.path == "filters.legacyTag"


def test_validate_filter_call_integer_comparison_rejects_non_integer():
    """An integerComparison filter accepts an integer and rejects a non-integer value."""
    value, error = validate_filter_call(IntegerComparisonFilter, "awardCount", f.gt(5))
    assert error is None
    assert value is not None

    value, error = validate_filter_call(
        IntegerComparisonFilter, "awardCount", {"operator": "gt", "value": 3.5}
    )
    assert value is None
    assert isinstance(error, FilterError)


def test_validate_filter_call_money_comparison_passes_valid_money():
    """A moneyComparison filter accepts a comparison operator and a Money value.

    Money.amount is a decimal string ("1000000"), not a number.
    """
    value, error = validate_filter_call(
        MoneyComparisonFilter,
        "awardFloor",
        f.gt({"amount": "1000000", "currency": "USD"}),
    )
    assert error is None
    assert value is not None


def test_validate_filter_call_money_comparison_rejects_array_operator():
    """A moneyComparison filter returns a FilterError for an array operator."""
    value, error = validate_filter_call(
        MoneyComparisonFilter,
        "awardFloor",
        f.in_([{"amount": "1000000", "currency": "USD"}]),
    )
    assert value is None
    assert isinstance(error, FilterError)


def test_validate_filter_call_money_comparison_rejects_numeric_amount():
    """A moneyComparison filter returns a FilterError for a numeric amount.

    Money.amount is a decimal string, so a raw number is the wrong shape.
    """
    value, error = validate_filter_call(
        MoneyComparisonFilter, "awardFloor", f.gt({"amount": 1000.5, "currency": "USD"})
    )
    assert value is None
    assert isinstance(error, FilterError)


def test_validate_filter_call_money_range_passes_valid_range():
    """A moneyRange filter accepts between with min and max Money values."""
    value, error = validate_filter_call(
        MoneyRangeFilter,
        "awardRange",
        f.between(
            {"amount": "10000", "currency": "USD"},
            {"amount": "500000", "currency": "USD"},
        ),
    )
    assert error is None
    assert value is not None


def test_validate_filter_call_money_range_rejects_comparison_operator():
    """A moneyRange filter returns a FilterError for a comparison operator."""
    value, error = validate_filter_call(
        MoneyRangeFilter, "awardRange", f.gt({"amount": "10000", "currency": "USD"})
    )
    assert value is None
    assert isinstance(error, FilterError)


def test_validate_filter_call_number_range_value_submodel_survives_to_wire():
    """A numberRange filter round-trips its NumberRange sub-model to a wire dict.

    f.between(int, int) returns a NumberRangeFilter whose ``.value`` is a NumberRange
    sub-model rather than a plain dict; validation must accept it and model_dump must
    recurse into the sub-model to produce ``{min, max}``.
    """
    value, error = validate_filter_call(
        NumberRangeFilter, "awardCount", f.between(0, 1000)
    )
    assert error is None
    wire = value.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert wire["operator"] == "between"
    assert wire["value"] == {"min": 0, "max": 1000}


def test_validate_filter_call_number_comparison_validates_as_number():
    """A numberComparison filter accepts a number and rejects a non-number value."""
    value, error = validate_filter_call(NumberComparisonFilter, "awardCount", f.gt(100))
    assert error is None
    assert value is not None

    value, error = validate_filter_call(
        NumberComparisonFilter, "awardCount", f.gt("not a number")
    )
    assert value is None
    assert isinstance(error, FilterError)
