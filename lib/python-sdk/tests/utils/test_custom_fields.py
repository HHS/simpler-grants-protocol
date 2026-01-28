"""Tests for custom fields functionality"""

import array
from datetime import datetime
from uuid import uuid4
import pytest

from common_grants_sdk.schemas.pydantic import (
    OpportunityBase,
    CustomFieldType,
    OppStatus,
    OppStatusOptions,
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
            "ignoredForNow": {"type": "string", "value": "noop"},
        },
    }

def test_input_validates(input_data):
    """Test that the custom fields convert and get added to pydantic model"""

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

    opp = Opportunity.model_validate(input_data)

    assert opp.custom_fields.legacy_id.value == 12345
    assert opp.custom_fields.group_name.value == "TEST_GROUP"


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
                "fieldType": "string",
                "value": {"id": 1, "value": "test"},
            },
            "ignoredForNow": {"type": "string", "value": "noop"},
        },
    }


def test_custom_fields_with_object(input_data_with_object):
    """Test that the model validates with an object type field with object as a custom field value"""

    field = CustomFieldSpec(
        key="legacyId", field_type=CustomFieldType.INTEGER, value=int
    )
    field2 = CustomFieldSpec(
        key="groupName", field_type=CustomFieldType.STRING, value=str
    )
    field3 = CustomFieldSpec(
        key="metadata", field_type=CustomFieldType.OBJECT, value=object
    )
    fields = [field, field2, field3]

    Opportunity = OpportunityBase.with_custom_fields(
        custom_fields=fields, model_name="Opportunity"
    )

    opp = Opportunity.model_validate(input_data_with_object)


    assert opp.custom_fields.legacy_id.value == 12345
    assert opp.custom_fields.group_name.value == "TEST_GROUP"
    assert opp.custom_fields.metadata.value["id"] == 1



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
                "value": [9,8,7,6],
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
        key="metadata", field_type=CustomFieldType.ARRAY, value=array
    )

    fields = [field, field2]

    Opportunity = OpportunityBase.with_custom_fields(
        custom_fields=fields, model_name="Opportunity"
    )

    opp = Opportunity.model_validate(array_input_data)

    assert opp.custom_fields.legacy_id.value == 12345
    assert opp.custom_fields.metadata.value == [9,8,7,6]