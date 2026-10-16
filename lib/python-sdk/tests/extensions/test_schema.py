"""Tests for the codegen-free schema(...) factory and its building blocks."""

import json
from typing import Any, Optional, assert_type

import pytest
from pydantic import BaseModel, Field, ValidationError

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
from common_grants_sdk.schemas.pydantic.models import (
    AwardBase,
    AwdRecipientIndividual,
    OpportunityBase,
)
from tests.schemas.award_fixtures import RECIPIENT_INDIVIDUAL, RecipientFields


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


def _mappings_extension(
    **unregistered: Any,
) -> SchemaWithTransforms[PassthroughModel, OpportunityBase[OpportunityFields]]:
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
                    },
                    **unregistered,
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


# ---------------------------------------------------------------------------
# Unregistered custom fields: preserved, validated as the base CustomField
# ---------------------------------------------------------------------------

OPP_WIRE = {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "T",
    "status": {"value": "open"},
    "description": "d",
    "createdAt": "2025-01-01T00:00:00Z",
    "lastModifiedAt": "2025-01-01T00:00:00Z",
}
VENDOR_PAYLOAD = {
    "name": "vendorPayload",
    "fieldType": "object",
    "value": {"camelKey": [1, {"snake_key": None}]},
}
SNAKE_KEYED = {
    "name": "vendor_payload",
    "fieldType": "string",
    "value": "snake-cased key",
}
VENDOR_MAPPING = {
    "name": {"const": "vendorPayload"},
    "fieldType": {"const": "object"},
    "value": {"field": "vendor_blob"},
}


def test_schema_only_parse_preserves_unregistered_custom_fields() -> None:
    custom_fields = {
        "legacyRef": {
            "name": "legacyRef",
            "fieldType": "object",
            "value": {"system": "legacy", "id": 7},
        },
        "vendorPayload": VENDOR_PAYLOAD,
        "vendor_payload": SNAKE_KEYED,
    }
    ext = schema(common_schema=OpportunityBase[OpportunityFields])

    parsed = ext.parse({**OPP_WIRE, "customFields": custom_fields})

    assert parsed.custom_fields is not None
    assert parsed.custom_fields.legacy_ref is not None
    assert parsed.custom_fields.legacy_ref.value.id == 7
    extra = parsed.custom_fields.model_extra or {}
    assert set(extra) == {"vendorPayload", "vendor_payload"}
    assert all(isinstance(entry, CustomField) for entry in extra.values())
    # Envelope members use wire aliases; unknown map keys are never re-cased.
    wire = json.loads(parsed.model_dump_json(by_alias=True, exclude_unset=True))
    assert wire["customFields"] == custom_fields


def test_subclassed_custom_field_set_validates_unregistered_entries() -> None:
    class ExtendedFields(OpportunityFields):
        program_code: Optional[CustomField[str]] = Field(default=None)

    ext = schema(common_schema=OpportunityBase[ExtendedFields])

    parsed = ext.parse({**OPP_WIRE, "customFields": {"vendorPayload": VENDOR_PAYLOAD}})
    assert parsed.custom_fields is not None
    assert isinstance(
        (parsed.custom_fields.model_extra or {})["vendorPayload"], CustomField
    )
    with pytest.raises(ValidationError):
        ext.parse(
            {
                **OPP_WIRE,
                "customFields": {"vendorPayload": {"fieldType": "object", "value": 1}},
            }
        )


def test_custom_field_set_json_schema_types_unregistered_entries():
    js = OpportunityFields.model_json_schema()
    ref = js["additionalProperties"]["$ref"].rsplit("/", 1)[-1]
    assert js["$defs"][ref]["required"] == ["name", "fieldType", "value"]


def test_unregistered_entries_are_not_declared_custom_fields():
    assert set(resolve_custom_field_specs(OpportunityFields)) == {
        "agency_code",
        "legacy_id",
        "legacy_ref",
        "tags",
    }


def test_mappings_carry_unregistered_custom_fields() -> None:
    ext = _mappings_extension(vendorPayload=VENDOR_MAPPING)
    source = {**FLAT_SOURCE, "vendor_blob": {"tier": 2}}

    res = ext.to_common(PassthroughModel.model_validate(source))

    assert res.errors == []
    assert res.result.custom_fields is not None
    assert res.result.custom_fields.agency_code is not None
    assert res.result.custom_fields.agency_code.value == "HHS-123"
    vendor = (res.result.custom_fields.model_extra or {})["vendorPayload"]
    assert vendor.field_type == CustomFieldType.OBJECT
    assert vendor.value == {"tier": 2}


def test_mappings_report_malformed_unregistered_custom_fields() -> None:
    nameless = {k: v for k, v in VENDOR_MAPPING.items() if k != "name"}
    ext = _mappings_extension(vendorPayload=nameless)
    source = {**FLAT_SOURCE, "vendor_blob": {"tier": 2}}

    res = ext.to_common(PassthroughModel.model_validate(source))

    # Structured errors with the raw output, not an exception.
    assert [e.path for e in res.errors] == ["customFields.vendorPayload.name"]
    assert isinstance(res.result, dict)


def test_validate_into_validates_unregistered_custom_fields():
    common = OpportunityBase[OpportunityFields]

    good = validate_into(
        common, {**OPP_WIRE, "customFields": {"vendorPayload": VENDOR_PAYLOAD}}
    )
    assert good.errors == []
    assert good.result.custom_fields is not None
    assert (good.result.custom_fields.model_extra or {})["vendorPayload"].value == {
        "camelKey": [1, {"snake_key": None}]
    }

    bad_payload = {**OPP_WIRE, "customFields": {"vendorPayload": "not an envelope"}}
    bad = validate_into(common, bad_payload)
    assert [e.path for e in bad.errors] == ["customFields.vendorPayload"]
    assert bad.result is bad_payload


# ---------------------------------------------------------------------------
# Core v0.5 identifiers and funders through the extension parse paths
# ---------------------------------------------------------------------------


def _v05_payload() -> dict:
    from tests.schemas.opportunity_v05_fixtures import FULL_OPPORTUNITY

    return {
        **FULL_OPPORTUNITY,
        "customFields": {
            "legacyId": {"name": "legacyId", "fieldType": "integer", "value": 7},
            "vendorNote": {"name": "vendorNote", "fieldType": "string", "value": None},
        },
    }


def test_schema_and_plugin_parse_keep_identifiers_and_funders() -> None:
    from common_grants_sdk.extensions import PluginMeta, PluginSchemas, define_plugin
    from common_grants_sdk.schemas import OppIds, OrgRefCollection
    from tests.schemas.opportunity_v05_fixtures import FUNDERS, IDENTIFIERS, wire

    ext = schema(common_schema=OpportunityBase[OpportunityFields])
    plugin = define_plugin(
        PluginSchemas(Opportunity=ext),
        meta=PluginMeta(name="v05", source_system="test"),
    )
    for parsed in (
        ext.parse(_v05_payload()),
        plugin.schemas.Opportunity.parse(_v05_payload()),
    ):
        assert_type(parsed, OpportunityBase[OpportunityFields])
        assert_type(parsed.identifiers, Optional[OppIds])
        assert_type(parsed.funders, Optional[OrgRefCollection])
        assert parsed.funders is not None
        assert parsed.funders.primary.name == FUNDERS["primary"]["name"]
        assert parsed.custom_fields is not None
        assert parsed.custom_fields.legacy_id is not None
        assert parsed.custom_fields.legacy_id.value == 7
        data = wire(parsed)
        assert data["identifiers"] == IDENTIFIERS
        assert data["funders"] == FUNDERS
        assert data["customFields"]["vendorNote"]["value"] is None


def test_transformed_plugin_client_get_returns_details() -> None:
    """A transforms registration promotes get() like a schema-only one; the
    registered model, its parse, and its transforms stay base-shaped."""
    from unittest.mock import Mock

    from common_grants_sdk.client.config import Config
    from common_grants_sdk.extensions import PluginMeta, PluginSchemas, define_plugin
    from common_grants_sdk.schemas import AwdRef, OpportunityDetails
    from tests.schemas.opportunity_v05_fixtures import CLEAN_ENERGY_OPPORTUNITY

    ext = _mappings_extension()
    plugin = define_plugin(
        PluginSchemas(Opportunity=ext),
        meta=PluginMeta(name="transformed", source_system="test"),
    )
    client = plugin.get_client(
        Config(base_url="https://api.example.com", api_key="test-key")
    )
    data = {
        **CLEAN_ENERGY_OPPORTUNITY,
        "customFields": {
            "agencyCode": {"name": "agencyCode", "fieldType": "string", "value": "NSF"}
        },
    }
    response = Mock(status_code=200)
    response.json.return_value = {"status": 200, "message": "Success", "data": data}
    client.http = Mock(get=Mock(return_value=response))

    opp = client.opportunities.get(data["id"])

    assert isinstance(opp, OpportunityDetails)
    assert isinstance(opp, OpportunityBase[OpportunityFields])
    assert isinstance(opp, OpportunityDetails[OpportunityFields])
    assert opp.awards is not None and all(isinstance(a, AwdRef) for a in opp.awards)
    assert opp.custom_fields is not None and opp.custom_fields.agency_code is not None
    assert opp.custom_fields.agency_code.value == "NSF"
    assert ext.common_schema is OpportunityBase[OpportunityFields]
    assert not isinstance(ext.parse(data), OpportunityDetails)
    common = ext.to_common(PassthroughModel.model_validate(FLAT_SOURCE)).result
    assert type(common) is OpportunityBase[OpportunityFields]


# ---------------------------------------------------------------------------
# Award individual recipient: the registered home of award custom fields
# ---------------------------------------------------------------------------


def test_recipient_schema_only_is_registered_and_typed() -> None:
    ext = schema(common_schema=AwdRecipientIndividual[RecipientFields])

    assert isinstance(ext, SchemaOnly)
    assert ext.schema_name == "AwdRecipientIndividual"
    spec = ext.custom_fields["scholarship_year"]
    assert spec.field_type == CustomFieldType.INTEGER
    assert spec.value is int

    parsed = ext.parse(RECIPIENT_INDIVIDUAL)
    assert_type(parsed, AwdRecipientIndividual[RecipientFields])
    assert parsed.custom_fields is not None
    assert parsed.custom_fields.scholarship_year is not None
    assert_type(parsed.custom_fields.scholarship_year.value, int)
    assert parsed.custom_fields.scholarship_year.value == 2026
    # Unknown entries are kept under their exact wire keys.
    assert set(parsed.custom_fields.model_extra or {}) == {
        "mentorNote",
        "vendor_payload",
    }
    wire = parsed.model_dump(mode="json", by_alias=True, exclude_unset=True)
    assert wire == RECIPIENT_INDIVIDUAL


def test_bare_recipient_is_a_registered_schema_only() -> None:
    ext = schema(common_schema=AwdRecipientIndividual)
    assert isinstance(ext, SchemaOnly)
    assert ext.schema_name == "AwdRecipientIndividual"
    assert ext.custom_fields == {}


def test_award_envelope_is_not_an_extensible_schema() -> None:
    """Award custom fields live on the recipient; the award itself has none."""
    with pytest.raises(PluginDefinitionError, match="AwardBase is not a registered"):
        schema(common_schema=AwardBase)


TypedRecipient = AwdRecipientIndividual[RecipientFields]


class SourceRecipient(BaseModel):
    """An author's own recipient record, declared as the transform source."""

    given_name: str
    family_name: str
    year: str


RECIPIENT_MAPPINGS: dict[str, Any] = {
    "to_common": {
        "name": {
            "firstName": {"field": "given_name"},
            "lastName": {"field": "family_name"},
        },
        "customFields": {
            "scholarshipYear": {
                "name": "scholarshipYear",
                "fieldType": "integer",
                "value": {"stringToNumber": "year"},
            },
            # Not declared on RecipientFields: kept under its exact key.
            "mentorNote": {
                "name": "mentorNote",
                "fieldType": "string",
                "value": {"field": "note"},
            },
        },
    },
    "from_common": {
        "given_name": {"field": "name.firstName"},
        "family_name": {"field": "name.lastName"},
        "year": {"numberToString": "customFields.scholarshipYear.value"},
    },
}
ADA = SourceRecipient(given_name="Ada", family_name="Lovelace", year="2026")


def _recipient_mappings_extension(
    mappings: Optional[dict[str, Any]] = None,
) -> SchemaWithTransforms[SourceRecipient, AwdRecipientIndividual[RecipientFields]]:
    return schema(
        source_schema=SourceRecipient,
        common_schema=TypedRecipient,
        mappings=mappings or RECIPIENT_MAPPINGS,
    )


def test_recipient_mappings_round_trip_typed_fields() -> None:
    ext = _recipient_mappings_extension()
    assert ext.schema_name == "AwdRecipientIndividual"

    res = ext.to_common(ADA)

    assert_type(res, TransformResult[AwdRecipientIndividual[RecipientFields]])
    assert res.errors == []
    recipient = res.result
    assert isinstance(recipient, TypedRecipient)
    assert recipient.name is not None and recipient.name.first_name == "Ada"
    assert recipient.custom_fields is not None
    year = recipient.custom_fields.scholarship_year
    assert year is not None
    assert_type(year.value, int)
    assert year.value == 2026
    note = (recipient.custom_fields.model_extra or {})["mentorNote"]
    assert isinstance(note, CustomField) and note.value is None

    back = ext.from_common(recipient)
    assert_type(back, TransformResult[SourceRecipient])
    assert back.errors == []
    assert back.result == ADA


def test_recipient_mappings_report_invalid_common_output() -> None:
    res = _recipient_mappings_extension().to_common(
        ADA.model_copy(update={"year": "2026.5"})
    )

    assert [e.path for e in res.errors] == ["customFields.scholarshipYear.value"]
    assert isinstance(res.result, dict)  # the raw output, for inspection
    assert res.result["customFields"]["scholarshipYear"]["value"] == 2026.5


def test_recipient_mappings_report_invalid_source_output() -> None:
    nameless = TypedRecipient.model_validate(
        {"customFields": RECIPIENT_INDIVIDUAL["customFields"]}
    )

    res = _recipient_mappings_extension().from_common(nameless)

    assert sorted(e.path or "" for e in res.errors) == ["family_name", "given_name"]
    assert isinstance(res.result, dict)
    assert res.result["year"] == "2026"


def test_recipient_mappings_attribute_handler_failures() -> None:
    res = _recipient_mappings_extension().to_common(
        ADA.model_copy(update={"year": "2026-27"})
    )

    [error] = res.errors
    assert error.handler == "stringToNumber"
    assert isinstance(error.cause, ValueError)
    assert error.source_value == ADA.model_copy(update={"year": "2026-27"})
    assert res.result == {}


def test_recipient_mappings_reject_malformed_unregistered_fields() -> None:
    mappings = json.loads(json.dumps(RECIPIENT_MAPPINGS))
    del mappings["to_common"]["customFields"]["mentorNote"]["name"]

    res = _recipient_mappings_extension(mappings).to_common(ADA)

    assert [e.path for e in res.errors] == ["customFields.mentorNote.name"]
    assert isinstance(res.result, dict)


def test_recipient_mappings_check_output_fields_at_definition() -> None:
    with pytest.raises(PluginDefinitionError) as exc:
        schema(
            source_schema=SourceRecipient,
            common_schema=TypedRecipient,
            mappings={
                "to_common": {"title": {"field": "given_name"}},
                "from_common": {"surname": {"field": "name.lastName"}},
            },
        )
    assert exc.value.errors == [
        "mappings.to_common: unknown output field(s) ['title'] for "
        f"{TypedRecipient.__name__}",
        "mappings.from_common: unknown source field(s) ['surname'] for "
        "SourceRecipient",
    ]


def _to_common(src: SourceRecipient) -> TransformResult[TypedRecipient]:
    return validate_into(
        TypedRecipient,
        {
            "name": {"firstName": src.given_name, "lastName": src.family_name},
            "customFields": {
                "scholarshipYear": {
                    "name": "scholarshipYear",
                    "fieldType": "integer",
                    "value": src.year,
                }
            },
        },
    )


def _from_common(recipient: TypedRecipient) -> TransformResult[SourceRecipient]:
    name = recipient.name
    fields = recipient.custom_fields
    year = fields.scholarship_year if fields is not None else None
    return validate_into(
        SourceRecipient,
        {
            "given_name": name.first_name if name is not None else None,
            "family_name": name.last_name if name is not None else None,
            "year": str(year.value) if year is not None else None,
        },
    )


def test_recipient_callables_round_trip_with_validate_into() -> None:
    ext = schema(
        source_schema=SourceRecipient,
        common_schema=TypedRecipient,
        to_common=_to_common,
        from_common=_from_common,
    )
    assert isinstance(ext, SchemaWithTransforms)
    assert ext.schema_name == "AwdRecipientIndividual"

    res = ext.to_common(ADA)
    assert res.errors == []
    assert isinstance(res.result, TypedRecipient)
    assert res.result.custom_fields is not None
    assert res.result.custom_fields.scholarship_year is not None
    assert res.result.custom_fields.scholarship_year.value == 2026

    back = ext.from_common(res.result)
    assert back.errors == [] and back.result == ADA

    bad = ext.to_common(ADA.model_copy(update={"year": "2026-27"}))
    assert [e.path for e in bad.errors] == ["customFields.scholarshipYear.value"]
    nameless = ext.from_common(TypedRecipient())
    assert sorted(e.path or "" for e in nameless.errors) == [
        "family_name",
        "given_name",
        "year",
    ]


def test_recipient_callable_exceptions_propagate_unchanged() -> None:
    def explode(_src: SourceRecipient) -> TransformResult[TypedRecipient]:
        raise RuntimeError("author bug")

    ext = schema(
        source_schema=SourceRecipient,
        common_schema=TypedRecipient,
        to_common=explode,
        from_common=_from_common,
    )
    with pytest.raises(RuntimeError, match="author bug"):
        ext.to_common(ADA)
