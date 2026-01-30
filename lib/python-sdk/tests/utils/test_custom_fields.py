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


@pytest.fixture(name="input_data")
def input_data_fixture():
    """Fixture for providing basic input data for custom fields tests"""
    return {
        "id": uuid4(),
        "title": "Foo bar",
        "status": OppStatus(value=OppStatusOptions.OPEN),
        "description": "Example opportunity",
        "createdAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
        "lastModifiedAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
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


def test_input_validates(input_data):
    """Test that the custom fields convert and get added to pydantic model"""

    int_field = CustomFieldSpec(
        key="legacyId", field_type=CustomFieldType.INTEGER, value=int
    )
    str_field = CustomFieldSpec(
        key="groupName", field_type=CustomFieldType.STRING, value=str
    )

    obj_field = CustomFieldSpec(
        key="testDict", field_type=CustomFieldType.OBJECT, value=object
    )

    list_field = CustomFieldSpec(
        key="testList", field_type=CustomFieldType.ARRAY, value=list
    )

    list_str_field = CustomFieldSpec(
        key="testListOfString", field_type=CustomFieldType.ARRAY, value=list[str]
    )

    fields = [int_field, str_field, obj_field, list_field, list_str_field]

    Opportunity = OpportunityBase.with_custom_fields(
        custom_fields=fields, model_name="Opportunity"
    )

    opp = Opportunity.model_validate(input_data)

    assert opp.custom_fields.legacy_id.value == 12345
    assert opp.custom_fields.group_name.value == "TEST_GROUP"
    assert opp.custom_fields.test_dict.value["value"] == "dict"
    assert opp.custom_fields.test_list.value == ["1", "2", "3"]
    assert opp.custom_fields.test_list_of_string.value == ["a", "b", "c"]


@pytest.fixture(name="none_input_data")
def none_input_data_fixture():
    """Fixture for providing input data for custom fields tests including a None value"""
    return {
        "id": uuid4(),
        "title": "Foo bar",
        "status": OppStatus(value=OppStatusOptions.OPEN),
        "description": "Example opportunity",
        "createdAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
        "lastModifiedAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
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
            "ignoredForNow": {"type": "string", "value": "noop"},
        },
    }


def test_input_with_none_value(none_input_data):
    """Test that the custom fields convert and get added to pydantic mode with None value"""

    field = CustomFieldSpec(
        key="legacyId", field_type=CustomFieldType.INTEGER, value=int
    )
    field2 = CustomFieldSpec(
        key="groupName", field_type=CustomFieldType.STRING, value=str
    )

    fields = [field, field2]

    Opportunity = OpportunityBase.with_custom_fields(
        custom_fields=fields, model_name="Opportunity"
    )

    opp = Opportunity.model_validate(none_input_data)

    assert opp.custom_fields.legacy_id.value is None
    assert opp.custom_fields.group_name.value == "TEST_GROUP"


@pytest.fixture(name="input_data_with_object")
def input_data_fixture_with_object():
    """Fixture for providing input data for custom fields tests with object as a custom field value"""
    return {
        "id": uuid4(),
        "title": "Foo bar",
        "status": OppStatus(value=OppStatusOptions.OPEN),
        "description": "Example opportunity",
        "createdAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
        "lastModifiedAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
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
                    "lastModifiedAt": datetime.fromisoformat(
                        "2024-01-01T00:00:00+00:00"
                    ),
                },
            },
            "ignoredForNow": {"type": "string", "value": "noop"},
        },
    }


def test_custom_fields_with_object(input_data_with_object):
    """Test that the model validates with an object type field with Pydantic object as a custom field value"""

    field = CustomFieldSpec(
        key="legacyId", field_type=CustomFieldType.INTEGER, value=int
    )
    field2 = CustomFieldSpec(
        key="groupName", field_type=CustomFieldType.STRING, value=str
    )
    field3 = CustomFieldSpec(
        key="metadata", field_type=CustomFieldType.OBJECT, value=SystemMetadata
    )
    fields = [field, field2, field3]

    Opportunity = OpportunityBase.with_custom_fields(
        custom_fields=fields, model_name="Opportunity"
    )

    opp = Opportunity.model_validate(input_data_with_object)

    assert opp.custom_fields.legacy_id.value == 12345
    assert opp.custom_fields.group_name.value == "TEST_GROUP"
    assert opp.custom_fields.metadata.value.created_at == datetime.fromisoformat(
        "2024-01-01T00:00:00+00:00"
    )


@pytest.fixture(name="array_input_data")
def array_input_data_fixture():
    """Fixture for providing input data for custom fields tests with array as a custom field value"""
    return {
        "id": uuid4(),
        "title": "Foo bar",
        "status": OppStatus(value=OppStatusOptions.OPEN),
        "description": "Example opportunity",
        "createdAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
        "lastModifiedAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
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


def test_custom_fields_with_array(array_input_data):
    """Test that the model validates with an array field"""
    field = CustomFieldSpec(
        key="legacyId", field_type=CustomFieldType.INTEGER, value=int
    )
    field2 = CustomFieldSpec(
        key="metadata", field_type=CustomFieldType.ARRAY, value=list
    )

    fields = [field, field2]

    Opportunity = OpportunityBase.with_custom_fields(
        custom_fields=fields, model_name="Opportunity"
    )

    opp = Opportunity.model_validate(array_input_data)

    assert opp.custom_fields.legacy_id.value == 12345
    assert opp.custom_fields.metadata.value == [9, 8, 7, 6]


@pytest.fixture(name="complex_input_data")
def complex_input_data_fixture():
    """Fixture for providing a complex pydantic objec as input data for custom fields tests"""
    return {
        "id": uuid4(),
        "title": "Foo bar",
        "status": OppStatus(value=OppStatusOptions.OPEN),
        "description": "Example opportunity",
        "createdAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
        "lastModifiedAt": datetime.fromisoformat("2024-01-01T00:00:00+00:00"),
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


def test_custom_field_with_complex_schema(complex_input_data):
    """Test new complex pydantic object"""

    class ComplexSchema(BaseModel):
        id: int
        name: str
        other_ids: list[int] = Field(alias="otherIds")
        created_at: datetime = Field(alias="createdAt")

    field = CustomFieldSpec(
        key="complexInputData", field_type=CustomFieldType.OBJECT, value=ComplexSchema
    )

    fields = [field]

    Opportunity = OpportunityBase.with_custom_fields(
        custom_fields=fields, model_name="Opportunity"
    )

    opp = Opportunity.model_validate(complex_input_data)

    assert opp.custom_fields.complex_input_data.value.other_ids == [1, 2, 3, 4]
