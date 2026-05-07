"""Tests for expanded plugin.py — backward compat + new optional fields."""

from common_grants_sdk.extensions.plugin import Plugin, PluginConfig, define_plugin
from common_grants_sdk.extensions.specs import SchemaExtensions
from common_grants_sdk.extensions.types import (
    ObjectSchemasInput,
    PluginMeta,
    TransformResult,
)

EXTENSIONS: SchemaExtensions = {}  # minimal valid extensions


# --- PluginConfig backward compatibility ---


def test_define_plugin_existing_signature():
    """define_plugin(extensions=...) still returns PluginConfig — backward compat."""
    config = define_plugin(extensions=EXTENSIONS)
    assert isinstance(config, PluginConfig)
    assert config.extensions is EXTENSIONS


def test_plugin_config_extensions_only():
    """PluginConfig with only extensions (old callers) still works."""
    config = PluginConfig(extensions=EXTENSIONS)
    assert config.meta is None
    assert config.transform_schemas is None


# --- PluginConfig new fields ---


def test_define_plugin_with_meta():
    meta = PluginMeta(name="test", source_system="test-system")
    config = define_plugin(extensions=EXTENSIONS, meta=meta)
    assert config.meta is meta
    assert config.meta.name == "test"


def test_define_plugin_with_transform_schemas():
    def passthrough(x):
        return TransformResult(result=x, errors=[])

    schemas = {
        "Opportunity": ObjectSchemasInput(
            to_common=passthrough, from_common=passthrough
        )
    }
    config = define_plugin(extensions=EXTENSIONS, transform_schemas=schemas)
    assert config.transform_schemas is schemas
    assert "Opportunity" in config.transform_schemas


def test_define_plugin_stores_input_as_is():
    """define_plugin stores ObjectSchemasInput as-is (no compilation in PoC)."""

    def passthrough(x):
        return TransformResult(result=x, errors=[])

    inp = ObjectSchemasInput(to_common=passthrough, from_common=passthrough)
    config = define_plugin(
        extensions=EXTENSIONS, transform_schemas={"Opportunity": inp}
    )
    stored = config.transform_schemas["Opportunity"]
    assert stored is inp
    assert stored.to_common is passthrough


# --- Plugin backward compatibility ---


def test_plugin_existing_fields():
    """Plugin(extensions=..., schemas=...) still works — backward compat."""
    plugin = Plugin(extensions=EXTENSIONS, schemas=object())
    assert plugin.extensions is EXTENSIONS
    assert plugin.meta is None
    assert plugin.get_client is None
    assert plugin.transform_schemas is None
    assert plugin.filters is None


def test_plugin_new_optional_fields_accept_values():
    meta = PluginMeta(name="p", source_system="s")
    schemas = {"Opportunity": object()}
    plugin = Plugin(
        extensions=EXTENSIONS,
        schemas=object(),
        meta=meta,
        transform_schemas=schemas,
    )
    assert plugin.meta is meta
    assert plugin.transform_schemas is schemas


# --- transform_schemas access pattern used by demo ---


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
    opp = config.transform_schemas["Opportunity"]
    result = opp.to_common({"raw": "data"})
    assert result.result == {"transformed": True}
    assert result.errors == []
