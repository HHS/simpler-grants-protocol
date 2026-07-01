"""Tests for classify_filters, f helpers, validate_routes, and validate_filter_call
in common_grants_sdk.extensions.filters."""

from __future__ import annotations

import json
from datetime import date

import pytest
from pydantic import ValidationError

from common_grants_sdk.extensions import PluginRoutes, ResourceRoutes
from common_grants_sdk.extensions.filters import (
    classify_filters,
    f,
    validate_filter_call,
    validate_routes,
)
from common_grants_sdk.extensions.types import ClassifyResult, FilterError
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

    Includes the reserved-word workarounds: Python f.in_ / f.not_in produce
    wire operators "in" / "notIn".
    """
    flt = getattr(f, helper)(*args)
    wire = flt.model_dump(by_alias=True, mode="json")
    assert wire["operator"] == operator
    assert wire["value"] == value


# ---------------------------------------------------------------------------
# classify_filters: three-bucket classification
# ---------------------------------------------------------------------------


def test_classify_default_snake_key_lands_in_named_field():
    """Default snake_case key (e.g. "status") lands in a named OppFilters field, not customFilters."""
    consumer_filters = {"status": f.in_(["open"])}
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert isinstance(classified, ClassifyResult)
    assert classified.errors == []
    result = classified.result
    assert isinstance(result, OppFilters)
    assert result.status is not None
    assert result.custom_filters is None


def test_classify_default_camel_alias_lands_in_named_field():
    """THE LANDMINE: camelCase alias "closeDateRange" must land in named field, NOT customFilters."""
    consumer_filters = {"closeDateRange": f.between("2026-01-01", "2026-12-31")}
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert classified.errors == []
    result = classified.result
    assert isinstance(result, OppFilters)
    # The camelCase alias must normalize to the snake_case field
    assert result.close_date_range is not None
    # It must NOT appear in customFilters (a conditional check here could
    # never fail on the path it guards — assert the bucket is empty outright)
    assert result.custom_filters is None


def test_classify_registered_custom_filter_lands_in_custom_filters():
    """A registered custom filter (e.g. "agency") lands in OppFilters.custom_filters."""
    consumer_filters = {"agency": f.in_(["NSF", "NIH"])}
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert classified.errors == []
    result = classified.result
    assert isinstance(result, OppFilters)
    assert result.custom_filters is not None
    assert "agency" in result.custom_filters


def test_classify_adhoc_unregistered_filter_lands_in_custom_filters():
    """An unregistered ad-hoc key (e.g. "legacyTag") passes through to customFilters."""
    consumer_filters = {"legacyTag": f.eq("priority")}
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert classified.errors == []
    result = classified.result
    assert isinstance(result, OppFilters)
    assert result.custom_filters is not None
    assert "legacyTag" in result.custom_filters


def test_classify_escape_hatch_key_lands_in_custom_filters():
    """gov.<system>@<filter> escape-hatch keys pass through to customFilters."""
    consumer_filters = {"gov.someSystem@someFilter": f.eq("test")}
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert classified.errors == []
    result = classified.result
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
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert classified.errors == []
    request_body = classified.result.model_dump(by_alias=True, exclude_none=True)

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
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert classified.errors == []
    request_body = classified.result.model_dump(by_alias=True, exclude_none=True)
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
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert classified.errors == []
    result = classified.result
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


def test_validate_routes_non_model_filter_type_raises():
    """validate_routes raises FilterError when a registered custom filter's value
    type is not a filter value model.

    The typed carrier makes a misspelled resource/method a *static* error, so the
    only meaningful runtime check left is that each registered key is annotated
    with a ``CommonGrantsBaseModel`` subclass. A ``region: int`` annotation is the
    genuinely-invalid registration this surfaces at registration time.
    """

    class BadFilters(OpportunityFilters, total=False):
        region: int  # not a filter value model

    routes = PluginRoutes(opportunities=ResourceRoutes(search=BadFilters))
    with pytest.raises(FilterError):
        validate_routes(routes)


def test_validate_routes_valid_routes_do_not_raise():
    """validate_routes does not raise for a fully valid typed routes carrier."""
    # Should not raise
    validate_routes(SAMPLE_ROUTES)


def test_validate_routes_empty_carrier_does_not_raise():
    """The empty carrier (no registered filters) passes validation silently."""
    validate_routes(PluginRoutes(opportunities=ResourceRoutes()))


# ---------------------------------------------------------------------------
# Call-time validation (validate_filter_call) — fail-soft
# ---------------------------------------------------------------------------


def test_validate_filter_call_registered_bad_operator_returns_error():
    """validate_filter_call returns (None, FilterError) for an operator/value mismatch.

    A bad registered filter yields a FilterError, not an exception. agency is
    validated against StringArrayFilter — an "eq" with a scalar value is wrong for it.
    """
    bad_filter = f.eq("not-an-array")
    value, error = validate_filter_call(StringArrayFilter, "agency", bad_filter)
    assert value is None
    assert isinstance(error, FilterError)
    assert error.path == "filters.agency"


def test_validate_filter_call_adhoc_invalid_shape_returns_error():
    """validate_filter_call returns a FilterError when an ad-hoc filter has an invalid shape."""

    # Pass None as model_cls (ad-hoc), with something that isn't a DefaultFilter
    class _BadShape:
        operator = "not_a_real_operator"
        value = object()  # not a valid value type

    value, error = validate_filter_call(None, "legacyTag", _BadShape())  # type: ignore[arg-type]
    assert value is None
    assert isinstance(error, FilterError)
    assert error.path == "filters.legacyTag"


def test_validate_filter_call_valid_registered_returns_value_and_no_error():
    """validate_filter_call returns (DefaultFilter, None) for a valid registered filter call."""
    valid_filter = f.in_(["NSF", "NIH"])
    # agency is StringArrayFilter, in_ with list is valid
    value, error = validate_filter_call(StringArrayFilter, "agency", valid_filter)
    assert error is None
    assert value is not None
    assert value.operator == "in"


def test_validate_filter_call_money_comparison_passes_valid_money():
    """A moneyComparison filter accepts a comparison operator and Money value.

    Money.amount is a decimal STRING ("1000000"), not a number — the shape that
    drifted in the TS compile-time filter map and was locked there with
    compile-error tests; covered here at the runtime layer.
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

    Money.amount is a DecimalString — a raw number is the wrong shape.
    """
    value, error = validate_filter_call(
        MoneyComparisonFilter, "awardFloor", f.gt({"amount": 1000.5, "currency": "USD"})
    )
    assert value is None
    assert isinstance(error, FilterError)


def test_validate_filter_call_money_range_passes_valid_range():
    """A moneyRange filter accepts between with {min, max} Money values."""
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
    """A numberRange filter round-trips its NumberRange sub-model to wire dict.

    f.between(int, int) returns a NumberRangeFilter whose ``.value`` is a NumberRange
    sub-model (not a plain dict); validation must accept it and model_dump must recurse
    the sub-model to ``{min, max}``. A regression that left ``.value`` as an un-dumped
    NumberRange object — or that dropped the int payload — would ship a non-JSON body.
    The moneyRange analog above is covered; this pins the numeric path.
    """
    value, error = validate_filter_call(
        NumberRangeFilter, "awardCount", f.between(0, 1000)
    )
    assert error is None
    wire = value.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert wire["operator"] == "between"
    assert wire["value"] == {"min": 0, "max": 1000}


def test_classify_default_wrong_shape_collects_error_and_omits_key():
    """A wrong-shaped DEFAULT filter is fail-soft: omitted from result, error collected.

    "status" is a StringArrayFilter (ArrayOperator + list[str]); f.eq("open") is an
    equivalence filter. classify_filters no longer raises on a bad call-time filter
    value: the bad key is dropped from the result body and a
    single FilterError with path "filters.status" is collected.
    """
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", {"status": f.eq("open")}
    )
    # No raise; the invalid default is absent from the result body.
    assert classified.result.status is None
    # Exactly one collected error, pinpointed to filters.status.
    assert len(classified.errors) == 1
    assert classified.errors[0].path == "filters.status"
    # The underlying pydantic error is preserved as the structured cause.
    assert isinstance(classified.errors[0].cause, ValidationError)


def test_validate_filter_call_number_comparison_validates_as_number():
    """A numberComparison filter validates against NumberComparisonFilter.

    A numeric value passes; a non-numeric value fails.
    """
    value, error = validate_filter_call(NumberComparisonFilter, "awardCount", f.gt(100))
    assert error is None
    assert value is not None
    value, error = validate_filter_call(
        NumberComparisonFilter, "awardCount", f.gt("not a number")
    )
    assert value is None
    assert isinstance(error, FilterError)


def test_classify_default_camel_alias_wrong_shape_collects_error():
    """A wrong-shaped default filter via its camelCase alias is fail-soft, omitted from result.

    "closeDateRange" is a DateRangeFilter; f.eq("2026-01-01") is an equivalence
    filter — the alias normalization path must collect a FilterError (not raise)
    and omit the key. The error path uses the alias form.
    """
    classified = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {"closeDateRange": f.eq("2026-01-01")},
    )
    assert classified.result.close_date_range is None
    assert len(classified.errors) == 1
    assert classified.errors[0].path == "filters.closeDateRange"


def test_classify_default_money_range_wrong_shape_collects_error():
    """A wrong-shaped MoneyRangeFilter default is dropped and its error collected.

    "totalFundingAvailableRange" is a MoneyRangeFilter (RangeOperator + MoneyRange);
    f.eq("100") is an equivalence filter with a scalar value — a valid permissive
    DefaultFilter, but not a MoneyRangeFilter. MoneyRangeFilter is the one default
    type the sibling tests (status -> StringArrayFilter, closeDateRange ->
    DateRangeFilter) do not exercise. The regression this guards: if the money-range
    defaults were validated against the permissive DefaultFilter shape instead of
    their real type, this f.eq value would pass and a bad body would reach the server.
    """
    classified = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {"totalFundingAvailableRange": f.eq("100")},
    )
    # Fail-soft: omitted from result, error collected (not raised).
    assert classified.result.total_funding_available_range is None
    assert len(classified.errors) == 1
    assert classified.errors[0].path == "filters.totalFundingAvailableRange"
    # Same uniform error contract as the sibling default tests: the underlying
    # pydantic ValidationError is preserved as the structured cause.
    assert isinstance(classified.errors[0].cause, ValidationError)


# ---------------------------------------------------------------------------
# Wire-body integrity: the value that passed validation is the value shipped
# ---------------------------------------------------------------------------


class WireFilters(OpportunityFilters, total=False):
    """Registered wire-integrity filters: a boolean and a number comparison."""

    isOpen: BooleanComparison
    awardCount: NumberComparison


WIRE_ROUTES = PluginRoutes(opportunities=ResourceRoutes(search=WireFilters))


def test_boolean_filter_value_survives_to_wire_as_json_true():
    """f.eq(True) serializes as JSON true, not 1.

    DefaultFilter.value is Any per the core spec (filters/base.tsp `unknown`);
    a narrowed union without bool lax-coerced True -> 1 and corrupted the wire.
    """
    classified = classify_filters(
        WIRE_ROUTES, "opportunities", "search", {"isOpen": f.eq(True)}
    )
    assert classified.errors == []
    body = classified.result.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert body["customFilters"]["isOpen"]["value"] is True


def test_registered_filter_ships_validated_value_not_raw_input():
    """The classifier keeps the value that passed validation, not the raw input.

    NumberComparisonFilter lax-coerces "42" -> 42 (smart-union resolves the
    int|float union to int first); shipping the raw string would mean the
    value differs from what validation approved.
    """
    classified = classify_filters(
        WIRE_ROUTES, "opportunities", "search", {"awardCount": f.gt("42")}
    )
    assert classified.errors == []
    body = classified.result.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert body["customFilters"]["awardCount"]["value"] == 42
    assert isinstance(body["customFilters"]["awardCount"]["value"], int)


def test_number_comparison_registered_filter_rejects_bool():
    """f.eq(True) on a numberComparison-registered filter is dropped, never ships 1.

    bool subclasses int; without an explicit rejection the int|float union
    lax-coerces True -> 1 and the wire silently carries a number for a
    boolean — the corruption class the DefaultFilter.value widening fixed.
    Fail-soft: the bad registered filter is collected as an error and omitted
    from customFilters rather than raising.
    """
    classified = classify_filters(
        WIRE_ROUTES, "opportunities", "search", {"awardCount": f.eq(True)}
    )
    assert classified.result.custom_filters is None
    assert len(classified.errors) == 1
    assert classified.errors[0].path == "filters.awardCount"


@pytest.mark.filterwarnings("ignore::UserWarning")  # pydantic warns during the
# model_dump of the mutated instance, before re-validation collects the error
def test_mutated_adhoc_instance_is_revalidated_and_collected():
    """An ad-hoc DefaultFilter mutated after construction is collected, not shipped.

    The filter models are mutable; the ad-hoc branch must re-validate instances
    rather than trust isinstance. Fail-soft: the error is collected and the key
    omitted from customFilters.
    """
    flt = f.eq("x")
    flt.operator = "bogus"  # type: ignore[assignment]
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", {"legacy": flt}
    )
    assert classified.result.custom_filters is None
    assert len(classified.errors) == 1
    assert classified.errors[0].path == "filters.legacy"


def test_validate_filter_call_adhoc_accepts_raw_dict():
    """Ad-hoc validation accepts a raw operator/value dict and returns (DefaultFilter, None)."""
    validated, error = validate_filter_call(None, "x", {"operator": "eq", "value": "v"})
    assert error is None
    assert validated is not None
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
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert classified.errors == []
    assert classified.result.close_date_range is not None
    assert classified.result.custom_filters is None


def test_classify_both_forms_of_same_default_filter_collects_error():
    """Supplying snake AND camel forms of one default filter is fail-soft.

    Both keys normalize to "closeDateRange". The first form is kept; the
    duplicate is dropped and a FilterError collected (a bad call-time filter
    never raises). Without the dedup guard, dict assignment
    would silently drop whichever range the consumer's dict ordered first.
    """
    consumer_filters = {
        "close_date_range": f.between("2026-01-01", "2026-06-30"),
        "closeDateRange": f.between("2026-07-01", "2026-12-31"),
    }
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    # The first-seen value is kept on the result; the duplicate is dropped.
    assert classified.result.close_date_range is not None
    assert len(classified.errors) == 1
    assert classified.errors[0].path == "filters.closeDateRange"
    assert "more than once" in str(classified.errors[0])


@pytest.mark.parametrize(
    ("resource", "method"),
    [
        ("opportunities", "list"),  # method not declared in routes
        ("opportunity", "search"),  # resource near-miss (pluralization)
    ],
)
def test_classify_unmatched_route_treats_registered_name_as_adhoc(resource, method):
    """A (resource, method) pair with no routes entry has NO registered bucket.

    "agency" is registered as a stringArray under opportunities.search only;
    via any other route pair it is validated as permissive ad-hoc, so
    f.eq("NSF") (invalid for stringArray) passes through to customFilters.
    Discriminates both levels of the routes[resource][method] lookup — a
    regression that flattens or mis-keys it either wrongly applies the spec
    or wrongly skips it.
    """
    classified = classify_filters(
        SAMPLE_ROUTES, resource, method, {"agency": f.eq("NSF")}
    )
    assert classified.errors == []
    assert classified.result.custom_filters is not None
    assert classified.result.custom_filters["agency"].value == "NSF"

    # ...and the same filter via the declared pair IS spec-validated and dropped
    # fail-soft: omitted from result, error collected (no raise).
    declared = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", {"agency": f.eq("NSF")}
    )
    assert declared.result.custom_filters is None
    assert len(declared.errors) == 1
    assert declared.errors[0].path == "filters.agency"


def test_request_body_mode_json_round_trip():
    """The documented model_dump(mode="json") call yields a json.dumps-able body.

    Coerced date objects only serialize in json mode, which is what the
    classifier dumps.
    """
    consumer_filters = {
        "close_date_range": f.between(date(2026, 1, 1), date(2026, 12, 31)),
        "agency": f.in_(["NSF"]),
    }
    classified = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", consumer_filters
    )
    assert classified.errors == []
    body = json.loads(
        json.dumps(
            classified.result.model_dump(by_alias=True, exclude_none=True, mode="json")
        )
    )
    assert body["closeDateRange"]["operator"] == "between"
    assert body["closeDateRange"]["value"]["min"] == "2026-01-01"
    assert body["customFilters"]["agency"]["operator"] == "in"


def test_classify_empty_filters_dict_yields_empty_body():
    """An empty consumer dict produces an OppFilters with no customFilters entry."""
    classified = classify_filters(SAMPLE_ROUTES, "opportunities", "search", {})
    assert classified.errors == []
    assert classified.result.custom_filters is None
    body = classified.result.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert "customFilters" not in body


def test_collected_error_path_is_uniform_across_buckets():
    """All three buckets collect a FilterError with a filters.<name> path, none raise."""
    c1 = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", {"status": f.eq("open")}
    )
    assert len(c1.errors) == 1
    assert c1.errors[0].path == "filters.status"

    c2 = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", {"agency": f.eq("NSF")}
    )
    assert len(c2.errors) == 1
    assert c2.errors[0].path == "filters.agency"

    c3 = classify_filters(
        SAMPLE_ROUTES, "opportunities", "search", {"adhoc": {"operator": "bogus"}}
    )
    assert len(c3.errors) == 1
    assert c3.errors[0].path == "filters.adhoc"


def test_multiple_failing_defaults_collect_one_error_per_key():
    """Two failing default filters each collect their own FilterError, none raise.

    Per-key fail-soft: each invalid default is dropped and pinpointed
    individually (no single collective "filters" path), so a consumer sees
    exactly which keys failed.
    """
    classified = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {"status": f.eq("open"), "closeDateRange": f.eq("x")},
    )
    assert classified.result.status is None
    assert classified.result.close_date_range is None
    paths = sorted(e.path for e in classified.errors)
    assert paths == ["filters.closeDateRange", "filters.status"]


def test_classify_invalid_registered_and_invalid_adhoc_both_collected():
    """An invalid registered filter AND an invalid ad-hoc filter are both collected.

    Neither is shipped: both keys are omitted from customFilters and each yields
    its own FilterError. "agency" is a stringArray (f.eq scalar is wrong); the
    ad-hoc "adhoc" key has a bogus operator.
    """
    classified = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {"agency": f.eq("NSF"), "adhoc": {"operator": "bogus", "value": 1}},
    )
    assert classified.result.custom_filters is None
    paths = sorted(e.path for e in classified.errors)
    assert paths == ["filters.adhoc", "filters.agency"]


def test_classify_mixed_valid_and_invalid_keeps_valid_drops_invalid():
    """Mixed valid + invalid filters: valid keys present in result, invalid absent.

    Discriminating across all three buckets at once — a valid default (status),
    a valid registered custom (agency), a valid ad-hoc (legacyTag), plus an
    invalid default (closeDateRange) and an invalid registered (fundingProgram,
    a stringComparison given an array value). The three valid keys must survive;
    the two invalid keys must be omitted and exactly two errors collected.
    """
    classified = classify_filters(
        SAMPLE_ROUTES,
        "opportunities",
        "search",
        {
            "status": f.in_(["open"]),  # valid default
            "agency": f.in_(["NSF"]),  # valid registered (stringArray)
            "legacyTag": f.eq("priority"),  # valid ad-hoc
            "closeDateRange": f.eq("2026-01-01"),  # invalid default (not a range)
            "fundingProgram": f.in_(
                ["a", "b"]
            ),  # invalid registered (stringComparison)
        },
    )
    result = classified.result
    # Valid keys present
    assert result.status is not None
    assert result.custom_filters is not None
    assert "agency" in result.custom_filters
    assert "legacyTag" in result.custom_filters
    # Invalid keys absent
    assert result.close_date_range is None
    assert "fundingProgram" not in result.custom_filters
    # Exactly the two invalid keys collected (count discriminates).
    paths = sorted(e.path for e in classified.errors)
    assert paths == ["filters.closeDateRange", "filters.fundingProgram"]
