"""Example script to demonstrate how to retrieve custom fields to an opportunity object 

Run with poetry run python ./get_custom_fields.py
"""

from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4
from common_grants_sdk.schemas.pydantic import (
    OpportunityBase,
    CustomFieldType,
    OppStatus,
    OppStatusOptions,
)


class LegacyIdValue(BaseModel):
    system: str
    id: int


opp_data = {
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

opp = OpportunityBase.model_validate(opp_data)

print(opp.custom_fields["legacyId"])


legacy = opp.get_custom_field_value("legacyId", LegacyIdValue)

print(legacy.id)


group = opp.get_custom_field_value("groupName", str)

print(group)

missing = opp.get_custom_field_value("missing", str)

print(missing)


# Uncomment the below lines to view the error message.
# wrong_type = opp.get_custom_field_value("groupName", int)

# print(wrong_type)
