"""Tests for the codegen-free schema(...) factory and its building blocks."""

from typing import Optional, assert_type

import pytest
from pydantic import BaseModel, Field

from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    PassthroughModel,
    SchemaOnly,
    SchemaWithTransforms,
    TransformResult,
    resolve_custom_field_specs,
    schema,
    validate_into,
)
from common_grants_sdk.extensions.schema import PluginDefinitionError, _infer_field_type
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType
from common_grants_sdk.schemas.pydantic.models import OpportunityBase


class LegacyRef(BaseModel):
    system: str
    id: int


class OpportunityFields(CustomFieldSet):
    agency_code: Optional[CustomField[str]] = Field(
        default=None, description="Agency code"
    )
    legacy_id: Optional[CustomField[int]] = Field(default=None)
    legacy_ref: Optional[CustomField[LegacyRef]] = Field(default=None)
    tags: Optional[CustomField[list[str]]] = Field(default=None)


FLAT_SOURCE = {
    "opportunity_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "opportunity_title": "Conservation research",
    "opportunity_description": "Funding.",
    "opportunity_status": "posted",
    "created_at": "2025-01-01T00:00:00Z",
    "last_modified_at": "2025-01-01T00:00:00Z",
    "agency_code": "HHS-123",
}


def _mappings_extension() -> SchemaWithTransforms[
    PassthroughModel, OpportunityBase[OpportunityFields]
]:
    return schema(
        source_schema=PassthroughModel,
        common_schema=OpportunityBase[OpportunityFields],
        mappings={
            "to_common": {
                "id": {"field": "opportunity_uuid"},
                "title": {"field": "opportunity_title"},
                "description": {"field": "opportunity_description"},
                "createdAt": {"field": "created_at"},
                "lastModifiedAt": {"field": "last_modified_at"},
                "status": {
                    "value": {
                        "match": {
                            "field": "opportunity_status",
                            "case": {"posted": "open"},
                            "default": "custom",
                        }
                    }
                },
                "customFields": {
                    "agencyCode": {
                        "value": {"field": "agency_code"},
                        "name": {"const": "agencyCode"},
                        "fieldType": {"const": "string"},
                    }
                },
            },
            "from_common": {
                "opportunity_uuid": {"field": "id"},
                "opportunity_title": {"field": "title"},
                "agency_code": {"field": "customFields.agencyCode.value"},
            },
        },
    )


# ---------------------------------------------------------------------------
# _infer_field_type / resolve_custom_field_specs
# ---------------------------------------------------------------------------


def test_infer_field_type_mapping():
    assert _infer_field_type(str) == CustomFieldType.STRING
    assert _infer_field_type(int) == CustomFieldType.INTEGER
    assert _infer_field_type(float) == CustomFieldType.NUMBER
    assert _infer_field_type(bool) == CustomFieldType.BOOLEAN
    assert _infer_field_type(LegacyRef) == CustomFieldType.OBJECT
    assert _infer_field_type(list[str]) == CustomFieldType.ARRAY
    assert _infer_field_type(dict[str, int]) == CustomFieldType.OBJECT


def test_resolve_custom_field_specs_derives_from_value_type():
    specs = resolve_custom_field_specs(OpportunityFields)
    assert specs["agency_code"].field_type == CustomFieldType.STRING
    assert specs["agency_code"].value is str
    assert specs["agency_code"].name == "agency_code"
    assert specs["agency_code"].description == "Agency code"
    assert specs["legacy_id"].field_type == CustomFieldType.INTEGER
    assert specs["legacy_ref"].field_type == CustomFieldType.OBJECT
    assert specs["legacy_ref"].value is LegacyRef
    assert specs["tags"].field_type == CustomFieldType.ARRAY


def test_resolve_custom_field_specs_empty_for_no_container():
    assert resolve_custom_field_specs(None) == {}
    assert resolve_custom_field_specs(CustomFieldSet) == {}


# ---------------------------------------------------------------------------
# schema(...) discrimination
# ---------------------------------------------------------------------------


def test_schema_only_returns_schema_only_extension():
    ext = schema(common_schema=OpportunityBase[OpportunityFields])
    assert isinstance(ext, SchemaOnly)
    assert ext.schema_name == "Opportunity"
    assert not hasattr(ext, "to_common")


def test_mappings_returns_transform_extension():
    ext = _mappings_extension()
    assert isinstance(ext, SchemaWithTransforms)
    assert ext.source_schema is PassthroughModel
    assert ext.custom_fields["agency_code"].field_type == CustomFieldType.STRING


def test_functions_returns_transform_extension():
    def to_common(
        _src: PassthroughModel,
    ) -> TransformResult[OpportunityBase]:
        return TransformResult(
            result=OpportunityBase.model_validate(
                FLAT_SOURCE
                | {
                    "id": FLAT_SOURCE["opportunity_uuid"],
                    "title": FLAT_SOURCE["opportunity_title"],
                    "status": {"value": "open"},
                    "createdAt": FLAT_SOURCE["created_at"],
                    "lastModifiedAt": FLAT_SOURCE["last_modified_at"],
                }
            ),
            errors=[],
        )

    def from_common(
        _c: OpportunityBase,
    ) -> TransformResult[PassthroughModel]:
        return TransformResult(result=PassthroughModel(), errors=[])

    ext = schema(
        source_schema=PassthroughModel,
        common_schema=OpportunityBase,
        to_common=to_common,
        from_common=from_common,
    )
    assert isinstance(ext, SchemaWithTransforms)


# ---------------------------------------------------------------------------
# Negative cases (validated at schema(...) call time)
# ---------------------------------------------------------------------------


def test_unregistered_base_raises() -> None:
    class NotRegistered(BaseModel):
        x: int

    with pytest.raises(
        PluginDefinitionError, match="not a registered extensible schema"
    ):
        schema(common_schema=NotRegistered)


def test_bare_opportunity_base_is_a_registered_schema_only():
    """Bare OpportunityBase (no custom fields) is the registered base schema."""
    ext = schema(common_schema=OpportunityBase)
    assert isinstance(ext, SchemaOnly)
    assert ext.schema_name == "Opportunity"
    assert ext.custom_fields == {}


def test_unknown_to_common_output_field_raises():
    with pytest.raises(PluginDefinitionError, match="unknown output field"):
        schema(
            source_schema=PassthroughModel,
            common_schema=OpportunityBase,
            mappings={
                "to_common": {"nope": {"const": 1}},
                "from_common": {},
            },
        )


def test_missing_mapping_direction_raises():
    with pytest.raises(PluginDefinitionError, match="missing `from_common`"):
        schema(
            source_schema=PassthroughModel,
            common_schema=OpportunityBase,
            mappings={"to_common": {"title": {"field": "x"}}},  # type: ignore[typeddict-item]
        )


def _noop(value):
    return TransformResult(result=value, errors=[])


def test_functions_without_source_schema_raises():
    with pytest.raises(PluginDefinitionError, match="source_schema` is required"):
        schema(  # type: ignore[call-overload]
            common_schema=OpportunityBase,
            to_common=_noop,
            from_common=_noop,
        )


def test_mappings_without_source_schema_raises():
    with pytest.raises(PluginDefinitionError, match="source_schema` is required"):
        schema(  # type: ignore[call-overload]
            common_schema=OpportunityBase,
            mappings={
                "to_common": {"title": {"field": "x"}},
                "from_common": {},
            },
        )


def test_one_sided_callable_raises():
    with pytest.raises(
        PluginDefinitionError, match="both `to_common` and `from_common`"
    ):
        schema(  # type: ignore[call-overload]
            source_schema=PassthroughModel,
            common_schema=OpportunityBase,
            to_common=_noop,
        )


def test_mappings_and_callables_together_raises():
    with pytest.raises(PluginDefinitionError, match="cannot specify both"):
        schema(  # type: ignore[call-overload]
            source_schema=PassthroughModel,
            common_schema=OpportunityBase,
            mappings={
                "to_common": {"title": {"field": "x"}},
                "from_common": {},
            },
            to_common=_noop,
            from_common=_noop,
        )


# ---------------------------------------------------------------------------
# Consumer typing + behavior (the make-or-break path)
# ---------------------------------------------------------------------------


def test_mappings_consumer_typed_and_round_trips() -> None:
    ext = _mappings_extension()
    res = ext.to_common(PassthroughModel.model_validate(FLAT_SOURCE))
    assert_type(res, TransformResult[OpportunityBase[OpportunityFields]])
    assert res.errors == []
    opp = res.result
    assert opp.title == "Conservation research"
    assert opp.custom_fields is not None
    assert opp.custom_fields.agency_code is not None
    assert_type(opp.custom_fields.agency_code.value, str)
    assert opp.custom_fields.agency_code.value == "HHS-123"
    back = ext.from_common(opp)
    assert_type(back, TransformResult[PassthroughModel])
    assert back.errors == []


def test_schema_only_parse_typed() -> None:
    ext = schema(common_schema=OpportunityBase[OpportunityFields])
    parsed = ext.parse(
        {
            "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "title": "T",
            "status": {"value": "open"},
            "description": "d",
            "createdAt": "2025-01-01T00:00:00Z",
            "lastModifiedAt": "2025-01-01T00:00:00Z",
            "customFields": {
                "legacyRef": {
                    "name": "legacyRef",
                    "fieldType": "object",
                    "value": {"system": "legacy", "id": 7},
                }
            },
        }
    )
    assert_type(parsed, OpportunityBase[OpportunityFields])
    assert parsed.custom_fields is not None
    assert parsed.custom_fields.legacy_ref is not None
    assert_type(parsed.custom_fields.legacy_ref.value.id, int)
    assert parsed.custom_fields.legacy_ref.value.id == 7


# ---------------------------------------------------------------------------
# camelCase round-trip
# ---------------------------------------------------------------------------


def test_camel_case_round_trip():
    camel = {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "T",
        "status": {"value": "open"},
        "description": "d",
        "createdAt": "2025-01-01T00:00:00Z",
        "lastModifiedAt": "2025-01-01T00:00:00Z",
        "customFields": {
            "agencyCode": {
                "name": "agencyCode",
                "fieldType": "string",
                "value": "HHS-123",
            }
        },
    }
    opp = OpportunityBase[OpportunityFields].model_validate(camel)
    # snake_case typed access
    assert opp.custom_fields is not None
    assert opp.custom_fields.agency_code is not None
    assert opp.custom_fields.agency_code.value == "HHS-123"
    # serializes back to camelCase
    dumped = opp.model_dump(by_alias=True, mode="json")
    assert "customFields" in dumped
    assert dumped["customFields"]["agencyCode"]["fieldType"] == "string"
    assert "createdAt" in dumped


def test_validate_into_routes_errors():
    res = validate_into(LegacyRef, {"system": "x"})  # missing id
    assert res.errors
    assert any("id" in (e.path or "") for e in res.errors)
