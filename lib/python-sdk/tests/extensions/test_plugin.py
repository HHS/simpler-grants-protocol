"""Tests for plugin.py — PluginExtensions-based API."""

from common_grants_sdk.extensions.plugin import Plugin, PluginConfig, define_plugin
from common_grants_sdk.extensions.specs import CustomFilterSpec, CustomFilterType
from common_grants_sdk.extensions.types import (
    ObjectSchemasInput,
    PluginExtensions,
    PluginExtensionsMeta,
    PluginExtensionsSchema,
    TransformResult,
)


def test_define_plugin_no_args():
    """define_plugin() with no args returns PluginConfig with all fields None."""
    config = define_plugin()
    assert isinstance(config, PluginConfig)
    assert config.extensions is None
    assert config.meta is None
    assert config.schemas is None


def test_define_plugin_with_extensions():
    ext = PluginExtensions()
    config = define_plugin(extensions=ext)
    assert config.extensions is ext


def test_define_plugin_routes_passthrough():
    """define_plugin stores routes as-is on PluginConfig.routes (no validation)."""
    routes = {
        "opportunities": {
            "search": {
                "filters": {
                    "agency": CustomFilterSpec(
                        filter_type=CustomFilterType.STRING_ARRAY
                    )
                }
            }
        }
    }
    config = define_plugin(routes=routes)
    assert config.routes is routes


def test_define_plugin_with_meta_and_schemas():
    meta = PluginExtensionsMeta(name="test", source_system="test-system")

    def passthrough(x):
        return TransformResult(result=x, errors=[])

    schemas = {
        "Opportunity": ObjectSchemasInput(
            to_common=passthrough, from_common=passthrough
        )
    }
    config = define_plugin(meta=meta, schemas=schemas)
    assert config.meta is meta
    assert config.meta.name == "test"
    assert config.schemas is schemas


def test_define_plugin_schemas_callable_roundtrip():
    """config.schemas["Opportunity"].to_common(data) works."""

    def always_transformed(_x):
        return TransformResult(result={"transformed": True}, errors=[])

    config = define_plugin(
        schemas={
            "Opportunity": ObjectSchemasInput(
                to_common=always_transformed, from_common=always_transformed
            )
        },
    )
    result = config.schemas["Opportunity"].to_common({"raw": "data"})
    assert result.result == {"transformed": True}
    assert result.errors == []


def test_plugin_fields_default_to_none():
    """Plugin.schemas holds the container; meta/extensions default to None."""
    base = Plugin(schemas=object())
    assert base.meta is None
    assert base.extensions is None


def test_plugin_fields_populated():
    meta = PluginExtensionsMeta(name="p", source_system="s")
    ext = PluginExtensions(schemas={"Opportunity": PluginExtensionsSchema()})
    full = Plugin(schemas=object(), extensions=ext, meta=meta)
    assert full.meta is meta
    assert full.extensions is ext


def test_plugin_schemas_is_attribute_container():
    """Plugin.schemas holds the _Schemas object (no generated_schemas field)."""
    s = object()
    p = Plugin(schemas=s)
    assert p.schemas is s
    assert not hasattr(p, "generated_schemas")
