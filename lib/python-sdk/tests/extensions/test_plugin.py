"""Tests for expanded plugin.py — backward compat + new optional fields."""

from common_grants_sdk.extensions.plugin import Plugin, PluginConfig, define_plugin
from common_grants_sdk.extensions.specs import SchemaExtensions
from common_grants_sdk.extensions.types import (
    ObjectSchemasInput,
    PluginExtensionsMeta,
    TransformResult,
)

EXTENSIONS: SchemaExtensions = {}  # minimal valid extensions


def test_define_plugin_backward_compat():
    """define_plugin(extensions=...) still returns PluginConfig with all optional fields None."""
    config = define_plugin(extensions=EXTENSIONS)
    assert isinstance(config, PluginConfig)
    assert config.extensions is EXTENSIONS
    assert config.meta is None
    assert config.transform_schemas is None


def test_define_plugin_with_meta_and_schemas():
    meta = PluginExtensionsMeta(name="test", source_system="test-system")

    def passthrough(x):
        return TransformResult(result=x, errors=[])

    schemas = {
        "Opportunity": ObjectSchemasInput(
            to_common=passthrough, from_common=passthrough
        )
    }
    config = define_plugin(extensions=EXTENSIONS, meta=meta, transform_schemas=schemas)
    assert config.meta is meta
    assert config.meta.name == "test"
    assert config.transform_schemas is schemas


def test_plugin_fields():
    """Plugin accepts all fields; optional ones default to None."""
    base = Plugin(extensions=EXTENSIONS, schemas=object())
    assert base.meta is None
    assert base.get_client is None
    assert base.transform_schemas is None
    assert base.filters is None

    meta = PluginExtensionsMeta(name="p", source_system="s")
    schemas = {"Opportunity": object()}
    full = Plugin(
        extensions=EXTENSIONS, schemas=object(), meta=meta, transform_schemas=schemas
    )
    assert full.meta is meta
    assert full.transform_schemas is schemas


def test_transform_schemas_callable_roundtrip():
    """The demo calls config.transform_schemas["Opportunity"].to_common(data)."""

    def always_transformed(_x):
        return TransformResult(result={"transformed": True}, errors=[])

    config = define_plugin(
        extensions=EXTENSIONS,
        transform_schemas={
            "Opportunity": ObjectSchemasInput(
                to_common=always_transformed, from_common=always_transformed
            )
        },
    )
    result = config.transform_schemas["Opportunity"].to_common({"raw": "data"})
    assert result.result == {"transformed": True}
    assert result.errors == []
