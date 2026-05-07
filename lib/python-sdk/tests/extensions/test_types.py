"""Tests for ADR-0022 types defined in common_grants_sdk.extensions.types."""

import pytest
from common_grants_sdk.extensions.types import (
    ClientConfig,
    Handler,
    ObjectMappings,
    ObjectSchemas,
    ObjectSchemasInput,
    PluginError,
    PluginExtensions,
    PluginExtensionsMeta,
    PluginExtensionsSchema,
    PluginMeta,
    TransformResult,
)


def test_plugin_extensions_meta_mirrors_plugin_meta():
    """PluginExtensionsMeta must stay in sync with PluginMeta field names."""
    assert set(PluginMeta.model_fields.keys()) == set(
        PluginExtensionsMeta.model_fields.keys()
    )


# --- PluginError ---


def test_plugin_error_is_exception():
    err = PluginError("something went wrong")
    assert isinstance(err, Exception)
    assert str(err) == "something went wrong"


def test_plugin_error_structured_fields():
    cause = ValueError("root cause")
    err = PluginError(
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


def test_plugin_error_defaults_to_none():
    err = PluginError("bare")
    assert err.path is None
    assert err.handler is None
    assert err.source_value is None
    assert err.cause is None


# --- TransformResult ---


def test_transform_result_success():
    result = TransformResult(result={"title": "hello"}, errors=[])
    assert result.result == {"title": "hello"}
    assert result.errors == []


def test_transform_result_with_errors():
    err = PluginError("bad")
    result = TransformResult(result={}, errors=[err])
    assert len(result.errors) == 1
    assert result.errors[0] is err


# --- PluginMeta ---


def test_plugin_meta_required_fields():
    meta = PluginMeta(name="my-plugin", source_system="grants.gov")
    assert meta.name == "my-plugin"
    assert meta.source_system == "grants.gov"
    assert meta.version is None
    assert meta.capabilities is None


def test_plugin_meta_source_system_required():
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        PluginMeta(name="p")  # missing source_system


def test_plugin_meta_camel_case_alias():
    """source_system serialises as sourceSystem in JSON."""
    meta = PluginMeta(name="p", sourceSystem="grants.gov")
    assert meta.source_system == "grants.gov"


def test_plugin_meta_capabilities():
    meta = PluginMeta(
        name="p",
        source_system="grants.gov",
        capabilities=["customFields", "transforms"],
    )
    assert "customFields" in meta.capabilities
    assert "transforms" in meta.capabilities


# --- ObjectMappings ---


def test_object_mappings_defaults_none():
    m = ObjectMappings()
    assert m.to_common is None
    assert m.from_common is None


def test_object_mappings_camel_aliases():
    m = ObjectMappings(toCommon={"title": "x"}, fromCommon={"x": "title"})
    assert m.to_common == {"title": "x"}
    assert m.from_common == {"x": "title"}


# --- PluginExtensionsMeta ---


def test_plugin_extensions_meta_all_optional():
    m = PluginExtensionsMeta()
    assert m.name is None
    assert m.version is None
    assert m.source_system is None
    assert m.capabilities is None


def test_plugin_extensions_meta_camel_alias():
    m = PluginExtensionsMeta(sourceSystem="grants.gov")
    assert m.source_system == "grants.gov"


# --- PluginExtensionsSchema ---


def test_plugin_extensions_schema_all_optional():
    s = PluginExtensionsSchema()
    assert s.custom_fields is None
    assert s.mappings is None


def test_plugin_extensions_schema_with_mappings():
    mappings = ObjectMappings(toCommon={"a": "b"})
    s = PluginExtensionsSchema(mappings=mappings)
    assert s.mappings.to_common == {"a": "b"}


# --- PluginExtensions ---


def test_plugin_extensions_all_optional():
    ext = PluginExtensions()
    assert ext.meta is None
    assert ext.schemas is None


def test_plugin_extensions_with_schema():
    schema = PluginExtensionsSchema(customFields={"legacyId": {}})
    ext = PluginExtensions(schemas={"Opportunity": schema})
    assert ext.schemas["Opportunity"].custom_fields == {"legacyId": {}}


# --- ObjectSchemasInput ---


def test_object_schemas_input_all_optional():
    inp = ObjectSchemasInput()
    assert inp.native is None
    assert inp.to_common is None
    assert inp.from_common is None


def test_object_schemas_input_with_callables():
    def passthrough(x):
        return TransformResult(result=x, errors=[])

    inp = ObjectSchemasInput(to_common=passthrough, from_common=passthrough)
    assert inp.to_common is passthrough


# --- ObjectSchemas ---


def test_object_schemas_required_fields():
    def passthrough(x):
        return TransformResult(result=x, errors=[])

    schemas = ObjectSchemas(
        native=dict,
        common=dict,
        to_common=passthrough,
        from_common=passthrough,
    )
    assert schemas.native is dict
    assert schemas.common is dict
    assert schemas.to_common is passthrough


def test_object_schemas_all_fields_required():
    def passthrough(x):
        return TransformResult(result=x, errors=[])

    with pytest.raises(TypeError):
        ObjectSchemas(
            native=dict, common=dict, to_common=passthrough
        )  # missing from_common


# --- Handler and ClientConfig type aliases ---


def test_handler_is_callable():
    def identity(data, spec):
        return spec

    h: Handler = identity
    assert h({}, "val") == "val"


def test_client_config_is_dict():
    cfg: ClientConfig = {"api_key": "abc", "timeout": 10}
    assert cfg["api_key"] == "abc"
