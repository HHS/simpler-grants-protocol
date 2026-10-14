"""Tests for custom fields functionality"""

import copy
import json
from datetime import datetime
from typing import Any, Optional
from uuid import uuid4
import pytest

from pydantic import BaseModel, Field, ValidationError

from common_grants_sdk.schemas.pydantic import (
    OpportunityBase,
    CustomFieldType,
    OppStatus,
    OppStatusOptions,
    SystemMetadata,
)
from common_grants_sdk.extensions import CustomField, CustomFieldSet
from common_grants_sdk.extensions.specs import CustomFieldSpec

BASE_OPP = {
    "id": uuid4(),
    "title": "Foo bar",
    "status": OppStatus(value=OppStatusOptions.OPEN),
    "description": "Example opportunity",
    "createdAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
    "lastModifiedAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
}

NONE_INPUT = {
    **BASE_OPP,
    "customFields": {
        "legacyId": {
            "name": "legacyId",
            "fieldType": "integer",
            "value": None,
        },
        "groupName": {
            "name": "groupName",
            "fieldType": "string",
            "value": "TEST_GROUP",
        },
    },
}

INPUT_WITH_OBJECT = {
    **BASE_OPP,
    "customFields": {
        "legacyId": {
            "name": "legacyId",
            "fieldType": "integer",
            "value": 12345,
        },
        "groupName": {
            "name": "groupName",
            "fieldType": "string",
            "value": "TEST_GROUP",
        },
        "metadata": {
            "name": "metadata",
            "fieldType": "object",
            "value": {
                "createdAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
                "lastModifiedAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
            },
        },
    },
    "ignoredForNow": {"type": "string", "value": "noop"},
}

ARRAY_INPUT = {
    **BASE_OPP,
    "customFields": {
        "legacyId": {
            "name": "legacyId",
            "fieldType": "integer",
            "value": 12345,
        },
        "metadata": {
            "name": "metadata",
            "fieldType": "array",
            "value": [9, 8, 7, 6],
        },
        "unregisteredNote": {
            "name": "unregisteredNote",
            "fieldType": "string",
            "value": "noop",
        },
    },
}

COMPLEX_OBJECT_INPUT = {
    **BASE_OPP,
    "customFields": {
        "complexInputData": {
            "name": "complexInputData",
            "fieldType": "object",
            "value": {
                "id": 1,
                "name": "test",
                "otherIds": [1, 2, 3, 4],
                "createdAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
            },
        },
        "unregisteredNote": {
            "name": "unregisteredNote",
            "fieldType": "string",
            "value": "noop",
        },
    },
}


PRIMITIVE_INPUT = {
    **BASE_OPP,
    "customFields": {
        "legacyId": {
            "name": "legacyId",
            "fieldType": "integer",
            "value": 12345,
        },
        "groupName": {
            "name": "groupName",
            "fieldType": "string",
            "value": "TEST_GROUP",
        },
        "testDict": {
            "name": "testDict",
            "fieldType": "string",
            "value": {"id": "1", "value": "dict"},
        },
        "testList": {
            "name": "testList",
            "fieldType": "array",
            "value": ["1", "2", "3"],
        },
        "testListOfString": {
            "name": "testListOfString",
            "fieldType": "array",
            "value": ["a", "b", "c"],
        },
        "unregisteredNote": {
            "name": "unregisteredNote",
            "fieldType": "string",
            "value": "noop",
        },
    },
}


class TestWithCustomFieldValue:
    """Class for testing registration of custom fields using hte with_custom_field_value function"""

    def test_input_validates(input_data):
        """Test that the custom fields convert and get added to pydantic model"""

        fields = {
            "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
            "groupName": CustomFieldSpec(field_type=CustomFieldType.STRING, value=str),
            "testDict": CustomFieldSpec(
                field_type=CustomFieldType.OBJECT, value=object
            ),
            "testList": CustomFieldSpec(field_type=CustomFieldType.ARRAY, value=list),
            "testListOfString": CustomFieldSpec(
                field_type=CustomFieldType.ARRAY, value=list[str]
            ),
        }

        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportunity"
        )

        opp = Opportunity.model_validate(PRIMITIVE_INPUT)

        assert opp.custom_fields.legacy_id.value == 12345
        assert opp.custom_fields.group_name.value == "TEST_GROUP"
        assert opp.custom_fields.test_dict.value["value"] == "dict"
        assert opp.custom_fields.test_list.value == ["1", "2", "3"]
        assert opp.custom_fields.test_list_of_string.value == ["a", "b", "c"]

    def test_input_with_none_value(self):
        """Test that the custom fields convert and get added to pydantic mode with None value"""

        fields = {
            "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
            "groupName": CustomFieldSpec(field_type=CustomFieldType.STRING, value=str),
        }

        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportunity"
        )

        opp = Opportunity.model_validate(NONE_INPUT)

        assert opp.custom_fields.legacy_id.value is None
        assert opp.custom_fields.group_name.value == "TEST_GROUP"

    def test_custom_fields_with_object(self):
        """Test that the model validates with an object type field with Pydantic object as a custom field value"""

        fields = {
            "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
            "groupName": CustomFieldSpec(field_type=CustomFieldType.STRING, value=str),
            "metadata": CustomFieldSpec(
                field_type=CustomFieldType.OBJECT, value=SystemMetadata
            ),
        }

        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportunity"
        )

        opp = Opportunity.model_validate(INPUT_WITH_OBJECT)

        assert opp.custom_fields.legacy_id.value == 12345
        assert opp.custom_fields.group_name.value == "TEST_GROUP"
        assert opp.custom_fields.metadata.value.created_at == datetime.fromisoformat(
            "2024-01-01T00:00:00+00:00"
        )

    def test_custom_fields_with_array(self):
        """Test that the model validates with an array field"""

        fields = {
            "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
            "metadata": CustomFieldSpec(field_type=CustomFieldType.ARRAY, value=list),
        }

        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportunity"
        )

        opp = Opportunity.model_validate(ARRAY_INPUT)

        assert opp.custom_fields.legacy_id.value == 12345
        assert opp.custom_fields.metadata.value == [9, 8, 7, 6]

    def test_custom_field_with_complex_schema(self) -> None:
        """Test new complex pydantic object"""

        class ComplexSchema(BaseModel):
            id: int
            name: str
            other_ids: list[int] = Field(alias="otherIds")
            created_at: datetime = Field(alias="createdAt")

        fields = {
            "complexInputData": CustomFieldSpec(
                field_type=CustomFieldType.OBJECT,
                value=ComplexSchema,
            ),
        }

        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportunity"
        )

        opp = Opportunity.model_validate(COMPLEX_OBJECT_INPUT)

        assert opp.custom_fields.complex_input_data.value.other_ids == [1, 2, 3, 4]


GET_PRIMITIVE_INPUT = {
    **BASE_OPP,
    "customFields": {
        "legacyId": {
            "name": "legacyId",
            "fieldType": CustomFieldType.INTEGER,
            "value": 12345,
        },
        "metadata": {
            "name": "metadata",
            "fieldType": CustomFieldType.ARRAY,
            "value": [9, 8, 7, 6],
        },
        "groupName": {
            "name": "groupName",
            "fieldType": CustomFieldType.STRING,
            "value": "test group",
        },
    },
}

GET_OBJECT_INPUT = {
    **BASE_OPP,
    "customFields": {
        "legacyId": {
            "name": "legacyId",
            "fieldType": CustomFieldType.OBJECT,
            "value": {"system": "legacy", "id": 12345},
        },
        "metadata": {
            "name": "metadata",
            "fieldType": CustomFieldType.ARRAY,
            "value": [9, 8, 7, 6],
        },
        "groupName": {
            "name": "groupName",
            "fieldType": CustomFieldType.STRING,
            "value": "test group",
        },
    },
}


class TestGetCustomFieldValue:
    """Tests for retrieving custom fields using getGustomFieldValue"""

    def test_get_custom_field_value(self) -> None:
        """Basic functionality test

        Validates: Works for value_type that is a Pydantic BaseModel subclass
        """

        class LegacyIdValue(BaseModel):
            system: str
            id: int

        opp = OpportunityBase.model_validate(GET_OBJECT_INPUT)

        legacy_id = opp.get_custom_field_value("legacyId", LegacyIdValue)
        assert legacy_id is not None
        assert legacy_id.id == 12345

    def test_get_primitives(self):
        """Test that get_custom_field_values can retrieve primitive data types

        Validates: Works for value_type that is a Pydantic for primitive types
        (int, str, etc.)
        """
        opp = OpportunityBase.model_validate(GET_PRIMITIVE_INPUT)

        assert opp.get_custom_field_value("legacyId", int) == 12345
        assert opp.get_custom_field_value("groupName", str) == "test group"
        assert opp.get_custom_field_value("metadata", list) == [9, 8, 7, 6]

    def test_get_undefined(self):
        """Test that getting a missing key returns None"""
        opp = OpportunityBase.model_validate(GET_PRIMITIVE_INPUT)

        assert opp.get_custom_field_value("missing_key", str) is None

    def test_validation_error(self):
        """Test that a mismatched type will return a validation error

        Validates: Raises a clear validation error if the value is present but invalid for
        value_type
        """
        opp = OpportunityBase.model_validate(GET_PRIMITIVE_INPUT)

        with pytest.raises(ValueError):
            opp.get_custom_field_value("legacyId", str)

    def test_get_registered_custom_fields_with_primitive(self):
        """ "Test that get_custom_field_values can retrieve fields that were registered via get_custom_fields"""

        fields = {
            "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
        }

        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportunity"
        )

        opp = Opportunity.model_validate(GET_PRIMITIVE_INPUT)

        legacy_id = opp.get_custom_field_value("legacyId", int)
        assert legacy_id is not None
        assert legacy_id == 12345

    def test_get_registered_custom_fields_with_pydantic_schema(self) -> None:
        """Test that get_custom_field_value can retrieve fields that were registered via get_custom_fields with a complex schema"""

        class LegacyIdValue(BaseModel):
            system: str
            id: int

        fields = {
            "legacyId": CustomFieldSpec(
                field_type=CustomFieldType.OBJECT,
                value=LegacyIdValue,
            ),
        }

        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields,
            model_name="Opportunity",
        )

        opp = Opportunity.model_validate(GET_OBJECT_INPUT)

        legacy_id = opp.get_custom_field_value("legacyId", LegacyIdValue)
        assert legacy_id is not None
        assert legacy_id.id == 12345

    def test_get_registered_custom_fields_with_mismatched_type(
        self,
    ) -> None:
        """Test that get_custom_field_value raises a ValueError if the type mismatches"""

        class LegacyIdValue(BaseModel):
            system: str
            id: int

        class BadIdValue(BaseModel):
            foo: str
            bar: str

        fields = {
            "legacyId": CustomFieldSpec(
                field_type=CustomFieldType.OBJECT,
                value=LegacyIdValue,
            ),
        }

        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields,
            model_name="Opportunity",
        )

        opp = Opportunity.model_validate(GET_OBJECT_INPUT)

        with pytest.raises(ValueError):
            opp.get_custom_field_value("legacyId", BadIdValue)


class TestCustomFieldSpecEmptyStrings:
    """Tests for empty string name/description handling in CustomFieldSpec"""

    def test_empty_name_falls_back_to_field_key(self):
        """Test that empty string name in CustomFieldSpec falls back to the field key

        Because create_custom_field_schema uses `field.name or key`, an empty
        string name is falsy and the key is used as the default instead.
        """
        fields = {
            "legacyId": CustomFieldSpec(
                field_type=CustomFieldType.INTEGER,
                value=int,
                name="",
            ),
        }
        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportunity"
        )
        opp = Opportunity.model_validate(
            {
                **BASE_OPP,
                "customFields": {
                    "legacyId": {
                        "fieldType": CustomFieldType.INTEGER,
                        "value": 1,
                    },
                },
            }
        )
        assert opp.custom_fields.legacy_id.name == "legacyId"

    def test_empty_description_becomes_none(self):
        """Test that empty string description in CustomFieldSpec becomes None

        Because create_custom_field_schema uses `field.description or None`, an
        empty string description is falsy and None is used as the default instead.
        """
        fields = {
            "legacyId": CustomFieldSpec(
                field_type=CustomFieldType.INTEGER,
                value=int,
                description="",
            ),
        }
        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportunity"
        )
        opp = Opportunity.model_validate(
            {
                **BASE_OPP,
                "customFields": {
                    "legacyId": {
                        "name": "legacyId",
                        "fieldType": CustomFieldType.INTEGER,
                        "value": 1,
                    },
                },
            }
        )
        assert opp.custom_fields.legacy_id.description is None


class TestUnknownCustomFieldsPreserved:
    """Unknown customFields keys survive a round trip as validated CustomFields."""

    def test_unknown_key_survives_round_trip(self):
        fields = {
            "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
        }
        Opportunity = OpportunityBase.with_custom_fields(
            custom_fields=fields, model_name="Opportunity"
        )
        payload = {
            **BASE_OPP,
            "customFields": {
                "legacyId": {"fieldType": "integer", "value": 42},
                "unknownField": {
                    "name": "unknownField",
                    "fieldType": "string",
                    "value": "preserved",
                },
            },
        }

        opp = Opportunity.model_validate(payload)

        assert opp.custom_fields is not None
        assert opp.custom_fields.legacy_id.value == 42
        unknown = opp.custom_fields.model_extra["unknownField"]
        assert isinstance(unknown, CustomField)
        assert unknown.value == "preserved"


# ---------------------------------------------------------------------------
# Unregistered entries across every custom-fields container (#1121)
# ---------------------------------------------------------------------------

WIRE_OPP = {
    "id": "573525f2-8e15-4405-83fb-e6523511d893",
    "title": "Community Health Grant",
    "status": {"value": "open"},
    "description": "Funding for community health projects",
    "createdAt": "2025-01-01T00:00:00Z",
    "lastModifiedAt": "2025-01-01T00:00:00Z",
}

REGISTERED_ENTRY = {"name": "legacyId", "fieldType": "integer", "value": 42}

# One entry per fieldType tag, plus an explicit null value. Map keys are kept
# exactly as supplied: neither camelized nor snake_cased.
UNREGISTERED_ENTRIES: dict[str, Any] = {
    "vendorPayload": {
        "name": "vendorPayload",
        "fieldType": "object",
        "value": {"camelKey": [1, {"snake_key": None}], "nested": {"deep": True}},
    },
    "vendor_payload": {
        "name": "vendor_payload",
        "fieldType": "string",
        "value": "snake-cased key",
    },
    "reviewScore": {"name": "reviewScore", "fieldType": "number", "value": 4.5},
    "seatCount": {"name": "seatCount", "fieldType": "integer", "value": 3},
    "isPilot": {"name": "isPilot", "fieldType": "boolean", "value": False},
    "regions": {
        "name": "regions",
        "fieldType": "array",
        "value": ["US-CA", {"code": "US-NY"}],
    },
    "clearedValue": {
        "name": "clearedValue",
        "fieldType": "string",
        "value": None,
        "description": "An explicit null value is still a valid entry",
        "schema": "https://example.com/schemas/cleared.json",
    },
}

MALFORMED_ENTRIES: dict[str, Any] = {
    "missing name": {"fieldType": "string", "value": "x"},
    "missing fieldType": {"name": "k", "value": "x"},
    "legacy type key": {"type": "string", "value": "noop"},
    "missing value": {"name": "k", "fieldType": "string"},
    "invalid fieldType": {"name": "k", "fieldType": "text", "value": "x"},
    "invalid schema URL": {
        "name": "k",
        "fieldType": "string",
        "value": "x",
        "schema": "not a url",
    },
    "scalar entry": "x",
    "list entry": [{"name": "k", "fieldType": "string", "value": "x"}],
    "null entry": None,
}


class _TypedFields(CustomFieldSet):
    legacy_id: Optional[CustomField[int]] = Field(default=None)


_LEGACY_ID_SPEC = {
    "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int)
}

# Registered containers (CustomFieldSet and the runtime helper) must match the
# bare OpportunityBase's dict[str, CustomField], which is the base-contract control.
REGISTERED_CONTAINERS: dict[str, Any] = {
    "runtime helper": OpportunityBase.with_custom_fields(
        custom_fields=_LEGACY_ID_SPEC, model_name="RuntimeOpportunity"
    ),
    "CustomFieldSet": OpportunityBase[_TypedFields],
}
CONTAINERS: dict[str, Any] = {
    "bare base": OpportunityBase,
    **REGISTERED_CONTAINERS,
    "runtime helper, no registrations": OpportunityBase.with_custom_fields(
        custom_fields={}, model_name="EmptyRuntimeOpportunity"
    ),
    "CustomFieldSet, no registrations": OpportunityBase[CustomFieldSet],
}


@pytest.mark.parametrize("model", CONTAINERS.values(), ids=CONTAINERS.keys())
def test_unregistered_entries_are_preserved_and_round_trip(model):
    custom_fields = {"legacyId": REGISTERED_ENTRY, **UNREGISTERED_ENTRIES}
    payload = {**WIRE_OPP, "customFields": custom_fields}
    before = copy.deepcopy(payload)

    opp = model.model_validate(payload)

    assert payload == before  # parsing never rewrites the caller's input
    wire = json.loads(opp.model_dump_json(by_alias=True, exclude_unset=True))
    assert wire["customFields"] == custom_fields
    assert model.model_validate_json(json.dumps(wire)) == opp


@pytest.mark.parametrize(
    "model", REGISTERED_CONTAINERS.values(), ids=REGISTERED_CONTAINERS.keys()
)
def test_unregistered_entries_are_validated_custom_fields(model):
    opp = model.model_validate({**WIRE_OPP, "customFields": UNREGISTERED_ENTRIES})

    extra = opp.custom_fields.model_extra
    assert set(extra) == set(UNREGISTERED_ENTRIES)
    assert all(isinstance(entry, CustomField) for entry in extra.values())
    assert extra["vendorPayload"].field_type == CustomFieldType.OBJECT
    assert extra["clearedValue"].value is None


@pytest.mark.parametrize("model", CONTAINERS.values(), ids=CONTAINERS.keys())
@pytest.mark.parametrize(
    "entry", MALFORMED_ENTRIES.values(), ids=MALFORMED_ENTRIES.keys()
)
def test_malformed_unregistered_entries_fail_base_validation(model, entry):
    payload = {**WIRE_OPP, "customFields": {"vendorPayload": entry}}
    before = copy.deepcopy(payload)

    with pytest.raises(ValidationError) as exc_info:
        model.model_validate(payload)

    assert payload == before
    assert any(
        err["loc"][:2] == ("customFields", "vendorPayload")
        for err in exc_info.value.errors()
    )


@pytest.mark.parametrize(
    "model", REGISTERED_CONTAINERS.values(), ids=REGISTERED_CONTAINERS.keys()
)
def test_registered_entries_keep_their_value_type(model):
    payload = {
        **WIRE_OPP,
        "customFields": {
            "legacyId": {**REGISTERED_ENTRY, "value": "not-an-int"},
            **UNREGISTERED_ENTRIES,
        },
    }

    with pytest.raises(ValidationError) as exc_info:
        model.model_validate(payload)

    assert [err["loc"][:2] for err in exc_info.value.errors()] == [
        ("customFields", "legacyId")
    ]


@pytest.mark.parametrize(
    "model", REGISTERED_CONTAINERS.values(), ids=REGISTERED_CONTAINERS.keys()
)
def test_get_custom_field_value_uses_exact_unregistered_keys(model):
    opp = model.model_validate(
        {
            **WIRE_OPP,
            "customFields": {"legacyId": REGISTERED_ENTRY, **UNREGISTERED_ENTRIES},
        }
    )

    # Distinct exact keys resolve to their own entries, never normalized.
    assert opp.get_custom_field_value("vendorPayload", dict) == {
        "camelKey": [1, {"snake_key": None}],
        "nested": {"deep": True},
    }
    assert opp.get_custom_field_value("vendor_payload", str) == "snake-cased key"
    # Registered fields still resolve by wire key or attribute name.
    assert opp.get_custom_field_value("legacyId", int) == 42
    assert opp.get_custom_field_value("legacy_id", int) == 42
    assert opp.get_custom_field_value("seatCount", int) == 3
    assert opp.get_custom_field_value("clearedValue", str) is None
    assert opp.get_custom_field_value("missingKey", str) is None
    with pytest.raises(ValueError):
        opp.get_custom_field_value("vendorPayload", str)


# Exact keys that normalize (snake_case) to the registered ``legacy_id`` attribute.
COLLIDING_ENTRIES = {
    "LegacyId": {"name": "LegacyId", "fieldType": "integer", "value": 99},
    "LEGACY_ID": {"name": "LEGACY_ID", "fieldType": "integer", "value": 7},
}


@pytest.mark.parametrize(
    "model", REGISTERED_CONTAINERS.values(), ids=REGISTERED_CONTAINERS.keys()
)
def test_get_custom_field_value_prefers_exact_unregistered_key(model):
    opp = model.model_validate(
        {
            **WIRE_OPP,
            "customFields": {"legacyId": REGISTERED_ENTRY, **COLLIDING_ENTRIES},
        }
    )

    assert set(opp.custom_fields.model_extra) == {"LegacyId", "LEGACY_ID"}
    assert opp.get_custom_field_value("LegacyId", int) == 99
    assert opp.get_custom_field_value("LEGACY_ID", int) == 7
    assert opp.get_custom_field_value("legacyId", int) == 42
    assert opp.get_custom_field_value("legacy_id", int) == 42


@pytest.mark.parametrize(
    "model", REGISTERED_CONTAINERS.values(), ids=REGISTERED_CONTAINERS.keys()
)
def test_get_custom_field_value_absent_registered_value_is_none(model):
    opp = model.model_validate({**WIRE_OPP, "customFields": COLLIDING_ENTRIES})

    assert opp.get_custom_field_value("legacyId", int) is None
    assert opp.get_custom_field_value("legacy_id", int) is None
    assert opp.get_custom_field_value("LegacyId", int) == 99


@pytest.mark.parametrize(
    "model", REGISTERED_CONTAINERS.values(), ids=REGISTERED_CONTAINERS.keys()
)
def test_get_custom_field_value_keeps_normalized_registered_lookup(model):
    """With no exact entry for the key, a normalized key still finds the field."""
    opp = model.model_validate(
        {**WIRE_OPP, "customFields": {"legacyId": REGISTERED_ENTRY}}
    )

    assert opp.get_custom_field_value("LegacyId", int) == 42


class _AliasedFields(CustomFieldSet):
    program: Optional[CustomField[str]] = Field(default=None, alias="programCode")


def test_get_custom_field_value_resolves_an_explicit_alias():
    opp = OpportunityBase[_AliasedFields].model_validate(
        {
            **WIRE_OPP,
            "customFields": {
                "programCode": {
                    "name": "programCode",
                    "fieldType": "string",
                    "value": "P-1",
                },
                "program_code": {
                    "name": "program_code",
                    "fieldType": "string",
                    "value": "unregistered",
                },
            },
        }
    )

    assert opp.custom_fields.program.value == "P-1"
    assert opp.get_custom_field_value("programCode", str) == "P-1"
    assert opp.get_custom_field_value("program", str) == "P-1"
    assert opp.get_custom_field_value("program_code", str) == "unregistered"
