"""Tests for custom fields functionality"""

from datetime import datetime
from pickle import NONE
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
    """Fixture for providing input data for custom fields tests"""
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


@pytest.fixture(name="bad_input_data")
def bad_input_data_fixture():
    """Fixture for providing input data for custom fields tests"""
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
                "value": NONE,
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


def test_input_with_none_value(bad_input_data):
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

    with pytest.raises(ValueError):
        Opportunity.model_validate(bad_input_data)
