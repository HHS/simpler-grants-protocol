"""Tests for custom fields functionality"""

from datetime import datetime
from uuid import uuid4
import pytest

from pydantic import BaseModel, Field

from common_grants_sdk.schemas.pydantic import (
    OpportunityBase,
    CustomFieldType,
    OppStatus,
    OppStatusOptions,
    SystemMetadata,
)
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
        "ignoredForNow": {"type": "string", "value": "noop"},
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
        "ignoredForNow": {"type": "string", "value": "noop"},
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
        "ignoredForNow": {"type": "string", "value": "noop"},
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
