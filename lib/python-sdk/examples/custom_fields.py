from datetime import datetime
from uuid import uuid4
from common_grants_sdk.schemas.pydantic import (
    OpportunityBase,
    CustomFieldType,
    OppStatus,
    OppStatusOptions,
)
from common_grants_sdk.extensions.specs import CustomFieldSpec

field = CustomFieldSpec(key="legacyId", field_type=CustomFieldType.INTEGER, value=int)
field2 = CustomFieldSpec(key="groupName", field_type=CustomFieldType.STRING, value=str)


fields = [field, field2]

Opportunity = OpportunityBase.with_custom_fields(
    custom_fields=fields, model_name="Opportunity"
)


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


opp = Opportunity.model_validate(opp_data)


print(opp.custom_fields.legacy_id.value)
print(opp.custom_fields.group_name.value)
