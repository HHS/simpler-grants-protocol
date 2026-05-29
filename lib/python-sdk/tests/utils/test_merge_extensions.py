import pytest

from common_grants_sdk.extensions import merge_extensions
from common_grants_sdk.extensions.types import (
    ObjectMappings,
    PluginExtensions,
    PluginExtensionsMeta,
    PluginExtensionsSchema,
)


def test_merge_empty_returns_empty_plugin_extensions() -> None:
    result = merge_extensions([])
    assert isinstance(result, PluginExtensions)
    assert result.schemas is None
    assert result.meta is None


def test_merge_single_source_passthrough() -> None:
    source = PluginExtensions(
        schemas={
            "Opportunity": PluginExtensionsSchema(
                mappings=ObjectMappings(
                    toCommon={"title": {"field": "name"}}, fromCommon={}
                )
            )
        }
    )
    merged = merge_extensions([source])
    assert merged is source


def test_merge_meta_raises_on_duplicate_name_by_default() -> None:
    source_one = PluginExtensions(meta=PluginExtensionsMeta(name="plugin-a"))
    source_two = PluginExtensions(meta=PluginExtensionsMeta(name="plugin-b"))

    with pytest.raises(ValueError, match="duplicate"):
        merge_extensions([source_one, source_two])


def test_merge_meta_last_wins() -> None:
    source_one = PluginExtensions(meta=PluginExtensionsMeta(name="plugin-a"))
    source_two = PluginExtensions(meta=PluginExtensionsMeta(name="plugin-b"))

    merged = merge_extensions([source_one, source_two], on_conflict="last_wins")
    assert merged.meta is not None
    assert merged.meta.name == "plugin-b"


def test_merge_raises_on_duplicate_mappings_by_default() -> None:
    source_one = PluginExtensions(
        schemas={
            "Opportunity": PluginExtensionsSchema(
                mappings=ObjectMappings(
                    toCommon={"title": {"field": "name"}}, fromCommon={}
                )
            )
        }
    )
    source_two = PluginExtensions(
        schemas={
            "Opportunity": PluginExtensionsSchema(
                mappings=ObjectMappings(
                    toCommon={"title": {"field": "other"}}, fromCommon={}
                )
            )
        }
    )

    with pytest.raises(ValueError, match='duplicate mappings for object "Opportunity"'):
        merge_extensions([source_one, source_two])


def test_merge_meta_none_fields_do_not_overwrite() -> None:
    """A None field in the second source does not erase a value from the first."""
    source_one = PluginExtensions(
        meta=PluginExtensionsMeta(name="plugin-a", version="1.0")
    )
    source_two = PluginExtensions(meta=PluginExtensionsMeta(name=None, version="2.0"))

    merged = merge_extensions([source_one, source_two], on_conflict="last_wins")
    assert merged.meta is not None
    assert merged.meta.name == "plugin-a"  # preserved from source_one
    assert merged.meta.version == "2.0"  # overwritten by source_two


def test_merge_mappings_first_wins() -> None:
    source_one = PluginExtensions(
        schemas={
            "Opportunity": PluginExtensionsSchema(
                mappings=ObjectMappings(
                    toCommon={"title": {"field": "name"}}, fromCommon={}
                )
            )
        }
    )
    source_two = PluginExtensions(
        schemas={
            "Opportunity": PluginExtensionsSchema(
                mappings=ObjectMappings(
                    toCommon={"title": {"field": "other"}}, fromCommon={}
                )
            )
        }
    )

    merged = merge_extensions([source_one, source_two], on_conflict="first_wins")
    assert merged.schemas is not None
    assert merged.schemas["Opportunity"].mappings is not None
    assert merged.schemas["Opportunity"].mappings.to_common == {
        "title": {"field": "name"}
    }


def test_merge_mappings_last_wins() -> None:
    source_one = PluginExtensions(
        schemas={
            "Opportunity": PluginExtensionsSchema(
                mappings=ObjectMappings(
                    toCommon={"title": {"field": "name"}}, fromCommon={}
                )
            )
        }
    )
    source_two = PluginExtensions(
        schemas={
            "Opportunity": PluginExtensionsSchema(
                mappings=ObjectMappings(
                    toCommon={"title": {"field": "other"}}, fromCommon={}
                )
            )
        }
    )

    merged = merge_extensions([source_one, source_two], on_conflict="last_wins")
    assert merged.schemas is not None
    assert merged.schemas["Opportunity"].mappings is not None
    assert merged.schemas["Opportunity"].mappings.to_common == {
        "title": {"field": "other"}
    }
