"""Tests for the plugin framework types in common_grants_sdk.extensions.types."""

from common_grants_sdk.extensions.types import (
    PassthroughModel,
    PluginMeta,
    TransformError,
    TransformResult,
)

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
