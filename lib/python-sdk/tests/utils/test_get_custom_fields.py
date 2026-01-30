"""Tests for retrieving custom fields from a Pydantic object using the get_custom_fields function """

import pytest

from uuid import uuid4
from pydantic import BaseModel
from datetime import datetime
from common_grants_sdk.schemas.pydantic import (
    OpportunityBase,
    CustomFieldType,
    OppStatus,
    OppStatusOptions,
)


@pytest.fixture(name="input_data")
def input_data_fixture():
    """Basic input data for testing"""
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
                "fieldType": CustomFieldType.OBJECT,
                "value": {"system": "legacy", "id": 123},
            },
            "groupName": {
                "name": "groupName",
                "fieldType": CustomFieldType.STRING,
                "value": "test group",
            },
        },
    }


def test_get_custom_field_value(input_data):
    """Basic functionality test"""

    class LegacyIdValue(BaseModel):
        system: str
        id: int

    opp = OpportunityBase.model_validate(input_data)

    assert opp.get_custom_field_value("legacyId", LegacyIdValue).id == 123


@pytest.fixture(name="input_data_primitives")
def input_data_primitives():
    """Input containing primitives for retrieval"""
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
                "fieldType": CustomFieldType.INTEGER,
                "value": 123,
            },
            "groupName": {
                "name": "groupName",
                "fieldType": CustomFieldType.STRING,
                "value": "test group",
            },
            "testList": {
                "name": "testList",
                "fieldType": CustomFieldType.ARRAY,
                "value": [9, 8, 7, 6],
            },
        },
    }


def test_get_primitives(input_data_primitives):
    """Test that get_custom_field_values can retrieve primitive data types"""
    opp = OpportunityBase.model_validate(input_data_primitives)

    assert opp.get_custom_field_value("legacyId", int) == 123
    assert opp.get_custom_field_value("groupName", str) == "test group"
    assert opp.get_custom_field_value("testList", list) == [9, 8, 7, 6]


def test_get_undefined(input_data_primitives):
    """Test that getting a missing key returns None"""
    opp = OpportunityBase.model_validate(input_data_primitives)

    assert opp.get_custom_field_value("missing_key", str) is None


def test_validation_error(input_data_primitives):
    """Test that a mismatched type will return a validation error"""
    opp = OpportunityBase.model_validate(input_data_primitives)

    with pytest.raises(ValueError):
        opp.get_custom_field_value("legacyId", str)
