"""Tests for the plugin framework types in common_grants_sdk.extensions.types."""

from typing import get_type_hints

from common_grants_sdk.extensions.types import (
    PassthroughModel,
    PluginMeta,
    PluginRoutes,
    ResourceRoutes,
    TransformError,
    TransformResult,
)
from common_grants_sdk.schemas.pydantic.filters import AwardFilters, StringArray

# --- TransformError ---


def test_transform_error_is_exception_with_defaults():
    err = TransformError("something went wrong")
    assert isinstance(err, Exception)
    assert str(err) == "something went wrong"
    assert err.path is None
    assert err.handler is None
    assert err.source_value is None
    assert err.cause is None


def test_transform_error_structured_fields():
    cause = ValueError("root cause")
    err = TransformError(
        "msg",
        path="status.value",
        handler="switch",
        source_value={"x": 1},
        cause=cause,
    )
    assert err.path == "status.value"
    assert err.handler == "switch"
    assert err.source_value == {"x": 1}
    assert err.cause is cause


def test_transform_error_source_value_excluded_from_str_and_repr():
    """source_value must not appear in str(err) or repr(err) -- PII defence."""
    sensitive = {"ssn": "123-45-6789"}
    err = TransformError("transform failed", source_value=sensitive)
    assert "123-45-6789" not in str(err)
    assert "123-45-6789" not in repr(err)


# --- TransformResult ---


def test_transform_result():
    ok = TransformResult(result={"title": "hello"}, errors=[])
    assert ok.result == {"title": "hello"}
    assert ok.errors == []

    err = TransformError("bad")
    partial = TransformResult(result={}, errors=[err])
    assert len(partial.errors) == 1
    assert partial.errors[0] is err


# --- PluginMeta ---


def test_plugin_extensions_meta_camel_alias():
    m = PluginMeta(name="grants.gov", sourceSystem="grants.gov")
    assert m.name == "grants.gov"
    assert m.source_system == "grants.gov"
    assert m.version is None
    assert m.capabilities is None


def test_plugin_extensions_meta_populate_by_name():
    m = PluginMeta(name="grants.gov", source_system="grants.gov")
    assert m.source_system == "grants.gov"


# --- PassthroughModel ---


def test_passthrough_model_accepts_arbitrary_keys():
    instance = PassthroughModel.model_validate({"data": {"any": "shape"}, "n": 1})
    assert instance.model_dump() == {"data": {"any": "shape"}, "n": 1}


# --- PluginRoutes / ResourceRoutes ---


def test_plugin_routes_default_to_empty_resource_slots():
    """Neither resource needs registering: both slots default to empty routes."""
    routes = PluginRoutes()
    assert routes.opportunities.search is None
    assert routes.awards.search is None


def test_plugin_routes_register_awards_without_opportunities():
    class AwardSearchFilters(AwardFilters, total=False):
        program_code: StringArray

    routes = PluginRoutes(awards=ResourceRoutes(search=AwardSearchFilters))
    assert routes.awards.search is AwardSearchFilters
    assert routes.opportunities.search is None


def test_award_filters_declares_the_four_snake_case_core_keys():
    assert set(get_type_hints(AwardFilters)) == {
        "status",
        "opportunity_id",
        "award_date_range",
        "awarded_amount_range",
    }
