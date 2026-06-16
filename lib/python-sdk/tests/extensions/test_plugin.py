"""Tests for plugin.py — Plugin and PluginConfig API."""

import pytest

from common_grants_sdk.extensions.plugin import Plugin, PluginConfig, define_plugin
from common_grants_sdk.extensions.specs import CustomFilterSpec, CustomFilterType
from common_grants_sdk.extensions.types import (
    SchemaInput,
    PluginExtensionsMeta,
    TransformResult,
)


def test_define_plugin_no_args():
    """define_plugin() with no args returns PluginConfig with all fields None."""
    config = define_plugin()
    assert isinstance(config, PluginConfig)
    assert config.meta is None
    assert config.schemas is None


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
        "Opportunity": SchemaInput(to_common=passthrough, from_common=passthrough)
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
            "Opportunity": SchemaInput(
                to_common=always_transformed, from_common=always_transformed
            )
        },
    )
    result = config.schemas["Opportunity"].to_common({"raw": "data"})
    assert result.result == {"transformed": True}
    assert result.errors == []


def test_plugin_fields_default_to_none():
    """Plugin.schemas holds the container; meta defaults to None."""
    base = Plugin(schemas=object())
    assert base.meta is None


def test_plugin_fields_populated():
    meta = PluginExtensionsMeta(name="p", source_system="s")
    full = Plugin(schemas=object(), meta=meta)
    assert full.meta is meta


def test_plugin_schemas_is_attribute_container():
    """Plugin.schemas holds the _Schemas object (no generated_schemas field)."""
    s = object()
    p = Plugin(schemas=s)
    assert p.schemas is s
    assert not hasattr(p, "generated_schemas")


# ---------------------------------------------------------------------------
# XOR constraint tests
# ---------------------------------------------------------------------------


def test_define_plugin_xor_mappings_and_both_callables_raises():
    """Providing mappings AND both explicit callables raises ValueError."""
    from common_grants_sdk.extensions.types import SchemaMappings

    def noop(x):
        return TransformResult(result=x, errors=[])

    with pytest.raises(
        ValueError,
        match="cannot specify both mappings and explicit to_common/from_common",
    ):
        define_plugin(
            schemas={
                "Opportunity": SchemaInput(
                    mappings=SchemaMappings(
                        to_common={"title": {"field": "native_title"}},
                        from_common={"native_title": {"field": "title"}},
                    ),
                    to_common=noop,
                    from_common=noop,
                )
            }
        )


def test_define_plugin_xor_mappings_and_one_callable_raises():
    """Providing mappings AND a single explicit callable raises ValueError."""
    from common_grants_sdk.extensions.types import SchemaMappings

    def noop(x):
        return TransformResult(result=x, errors=[])

    with pytest.raises(
        ValueError,
        match="cannot specify both mappings and explicit to_common/from_common",
    ):
        define_plugin(
            schemas={
                "Opportunity": SchemaInput(
                    mappings=SchemaMappings(
                        to_common={"title": {"field": "native_title"}},
                        from_common={"native_title": {"field": "title"}},
                    ),
                    to_common=noop,
                )
            }
        )


def test_define_plugin_mappings_without_callables_is_valid():
    """Providing mappings without explicit callables does not raise."""
    from common_grants_sdk.extensions.types import SchemaMappings

    config = define_plugin(
        schemas={
            "Opportunity": SchemaInput(
                mappings=SchemaMappings(
                    to_common={"title": {"field": "native_title"}},
                    from_common={"native_title": {"field": "title"}},
                )
            )
        }
    )
    assert config.schemas is not None


def test_define_plugin_callables_without_mappings_is_valid():
    """Providing explicit callables without mappings does not raise."""

    def noop(x):
        return TransformResult(result=x, errors=[])

    config = define_plugin(
        schemas={"Opportunity": SchemaInput(to_common=noop, from_common=noop)}
    )
    assert config.schemas is not None
