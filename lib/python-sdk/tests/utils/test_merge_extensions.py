import pytest

from common_grants_sdk.extensions import merge_extensions
from common_grants_sdk.extensions.specs import CustomFieldSpec
from common_grants_sdk.extensions.types import (
    PluginExtensions,
    PluginExtensionsMeta,
    PluginExtensionsSchema,
)
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType


def _ext(obj_name: str, **fields: CustomFieldSpec) -> PluginExtensions:
    """Build a PluginExtensions with custom_fields for one object."""
    return PluginExtensions(
        schemas={obj_name: PluginExtensionsSchema(customFields=fields or None)}
    )


def test_merge_disjoint_extensions() -> None:
    source_one = _ext(
        "Opportunity",
        eligibility_type=CustomFieldSpec(field_type=CustomFieldType.ARRAY),
    )
    source_two = _ext(
        "Opportunity",
        priority_score=CustomFieldSpec(field_type=CustomFieldType.NUMBER),
    )

    merged = merge_extensions([source_one, source_two])

    assert merged.schemas is not None
    fields = merged.schemas["Opportunity"].custom_fields
    assert fields is not None
    assert "eligibility_type" in fields
    assert "priority_score" in fields


def test_merge_empty_returns_empty_plugin_extensions() -> None:
    result = merge_extensions([])
    assert isinstance(result, PluginExtensions)
    assert result.schemas is None
    assert result.meta is None


def test_merge_single_source_passthrough() -> None:
    source = _ext(
        "Opportunity",
        eligibility_type=CustomFieldSpec(field_type=CustomFieldType.ARRAY),
    )
    merged = merge_extensions([source])
    assert merged is source


def test_merge_raises_on_duplicate_field_by_default() -> None:
    source_one = _ext(
        "Opportunity",
        eligibility_type=CustomFieldSpec(field_type=CustomFieldType.ARRAY),
    )
    source_two = _ext(
        "Opportunity",
        eligibility_type=CustomFieldSpec(field_type=CustomFieldType.STRING),
    )

    with pytest.raises(ValueError, match='duplicate field "eligibility_type"'):
        merge_extensions([source_one, source_two])


def test_merge_last_wins_on_duplicate_field() -> None:
    source_one = _ext(
        "Opportunity",
        eligibility_type=CustomFieldSpec(
            field_type=CustomFieldType.ARRAY, description="First"
        ),
    )
    source_two = _ext(
        "Opportunity",
        eligibility_type=CustomFieldSpec(
            field_type=CustomFieldType.STRING, description="Last"
        ),
    )

    merged = merge_extensions([source_one, source_two], on_conflict="last_wins")
    assert merged.schemas is not None
    custom_fields_last = merged.schemas["Opportunity"].custom_fields
    assert custom_fields_last is not None
    f = custom_fields_last["eligibility_type"]
    assert f.field_type == CustomFieldType.STRING
    assert f.description == "Last"


def test_merge_first_wins_on_duplicate_field() -> None:
    source_one = _ext(
        "Opportunity",
        eligibility_type=CustomFieldSpec(
            field_type=CustomFieldType.ARRAY, description="First"
        ),
    )
    source_two = _ext(
        "Opportunity",
        eligibility_type=CustomFieldSpec(
            field_type=CustomFieldType.STRING, description="Last"
        ),
    )

    merged = merge_extensions([source_one, source_two], on_conflict="first_wins")
    assert merged.schemas is not None
    custom_fields_first = merged.schemas["Opportunity"].custom_fields
    assert custom_fields_first is not None
    f = custom_fields_first["eligibility_type"]
    assert f.field_type == CustomFieldType.ARRAY
    assert f.description == "First"


def test_merge_overlapping_object_keys_no_field_conflicts() -> None:
    source_one = _ext(
        "Opportunity",
        eligibility_type=CustomFieldSpec(field_type=CustomFieldType.ARRAY),
    )
    source_two = _ext(
        "Opportunity",
        funding_track=CustomFieldSpec(field_type=CustomFieldType.STRING),
    )

    merged = merge_extensions([source_one, source_two])
    assert merged.schemas is not None
    fields = merged.schemas["Opportunity"].custom_fields
    assert fields is not None
    assert set(fields.keys()) == {"eligibility_type", "funding_track"}


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
    from common_grants_sdk.extensions.types import ObjectMappings

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
    from common_grants_sdk.extensions.types import ObjectMappings

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
    from common_grants_sdk.extensions.types import ObjectMappings

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
