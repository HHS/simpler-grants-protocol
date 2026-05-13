"""Tests for ADR-0022 types defined in common_grants_sdk.extensions.types."""

import pytest
from common_grants_sdk.extensions.specs import CustomFieldSpec
from common_grants_sdk.extensions.types import (
    ObjectMappings,
    ObjectSchemas,
    ObjectSchemasInput,
    PluginError,
    PluginExtensions,
    PluginExtensionsMeta,
    PluginExtensionsSchema,
    TransformResult,
)
from common_grants_sdk.schemas.pydantic.fields.custom import CustomFieldType

# --- PluginError ---


def test_plugin_error_is_exception_with_defaults():
    err = PluginError("something went wrong")
    assert isinstance(err, Exception)
    assert str(err) == "something went wrong"
    assert err.path is None
    assert err.handler is None
    assert err.source_value is None
    assert err.cause is None


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


# --- TransformResult ---


def test_transform_result():
    ok = TransformResult(result={"title": "hello"}, errors=[])
    assert ok.result == {"title": "hello"}
    assert ok.errors == []

    err = PluginError("bad")
    partial = TransformResult(result={}, errors=[err])
    assert len(partial.errors) == 1
    assert partial.errors[0] is err


# --- ObjectMappings ---


def test_object_mappings():
    assert ObjectMappings().to_common is None
    assert ObjectMappings().from_common is None
    m = ObjectMappings(toCommon={"title": "x"}, fromCommon={"x": "title"})
    assert m.to_common == {"title": "x"}
    assert m.from_common == {"x": "title"}


# --- PluginExtensionsMeta ---


def test_plugin_extensions_meta():
    assert PluginExtensionsMeta().name is None
    assert PluginExtensionsMeta().source_system is None
    m = PluginExtensionsMeta(sourceSystem="grants.gov")
    assert m.source_system == "grants.gov"


# --- PluginExtensionsSchema ---


def test_plugin_extensions_schema():
    assert PluginExtensionsSchema().custom_fields is None
    assert PluginExtensionsSchema().mappings is None
    s = PluginExtensionsSchema(mappings=ObjectMappings(toCommon={"a": "b"}))
    assert s.mappings.to_common == {"a": "b"}


# --- PluginExtensions ---


def test_plugin_extensions():
    assert PluginExtensions().meta is None
    assert PluginExtensions().schemas is None
    spec = CustomFieldSpec(field_type=CustomFieldType.INTEGER)
    schema = PluginExtensionsSchema(customFields={"legacyId": spec})
    ext = PluginExtensions(schemas={"Opportunity": schema})
    assert ext.schemas["Opportunity"].custom_fields == {"legacyId": spec}


# --- ObjectSchemasInput ---


def test_object_schemas_input():
    assert ObjectSchemasInput().native is None
    assert ObjectSchemasInput().to_common is None

    def passthrough(x):
        return TransformResult(result=x, errors=[])

    inp = ObjectSchemasInput(to_common=passthrough, from_common=passthrough)
    assert inp.to_common is passthrough


# --- ObjectSchemas ---


def test_object_schemas():
    def passthrough(x):
        return TransformResult(result=x, errors=[])

    schemas = ObjectSchemas(
        native=dict, common=dict, to_common=passthrough, from_common=passthrough
    )
    assert schemas.native is dict
    assert schemas.common is dict

    with pytest.raises(TypeError):
        ObjectSchemas(
            native=dict, common=dict, to_common=passthrough
        )  # missing from_common
