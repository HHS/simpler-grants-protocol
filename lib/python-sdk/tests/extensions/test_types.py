"""Tests for ADR-0022 types defined in common_grants_sdk.extensions.types."""

from common_grants_sdk.extensions.specs import CustomFieldSpec
from common_grants_sdk.extensions.types import (
    PluginExtensionsMeta,
    SchemaConfig,
    SchemaInput,
    SchemaMappings,
    TransformError,
    TransformResult,
)
from common_grants_sdk.schemas.pydantic.fields.custom import CustomFieldType

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
    """source_value must not appear in str(err) or repr(err) — PII defence per ADR-0022 Decision #9."""
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


# --- SchemaMappings ---


def test_schema_mappings():
    assert SchemaMappings().to_common is None
    assert SchemaMappings().from_common is None
    m = SchemaMappings(toCommon={"title": "x"}, fromCommon={"x": "title"})
    assert m.to_common == {"title": "x"}
    assert m.from_common == {"x": "title"}


# --- PluginExtensionsMeta ---


def test_plugin_extensions_meta():
    m = PluginExtensionsMeta(name="grants.gov", sourceSystem="grants.gov")
    assert m.name == "grants.gov"
    assert m.source_system == "grants.gov"
    assert m.version is None
    assert m.capabilities is None


# --- SchemaInput ---


def test_schema_input():
    assert SchemaInput().source_schema is None
    assert SchemaInput().custom_fields is None
    assert SchemaInput().mappings is None
    assert SchemaInput().to_common is None

    spec = CustomFieldSpec(field_type=CustomFieldType.INTEGER)
    inp = SchemaInput(custom_fields={"legacyId": spec})
    assert inp.custom_fields == {"legacyId": spec}

    m = SchemaMappings(toCommon={"title": "x"}, fromCommon={"x": "title"})
    inp_with_mappings = SchemaInput(mappings=m)
    assert inp_with_mappings.mappings.to_common == {"title": "x"}

    def passthrough(x):
        return TransformResult(result=x, errors=[])

    inp2 = SchemaInput(to_common=passthrough, from_common=passthrough)
    assert inp2.to_common is passthrough


# --- SchemaConfig ---


def test_schema_config():
    def passthrough(x):
        return TransformResult(result=x, errors=[])

    schemas = SchemaConfig(
        source_schema=dict,
        common_schema=dict,
        to_common=passthrough,
        from_common=passthrough,
    )
    assert schemas.source_schema is dict
    assert schemas.common_schema is dict

    # to_common and from_common are optional — omitting them is valid
    minimal = SchemaConfig(source_schema=dict, common_schema=dict)
    assert minimal.to_common is None
    assert minimal.from_common is None
