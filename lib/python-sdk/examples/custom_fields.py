from datetime import datetime, timezone
from uuid import uuid4
from common_grants_sdk.schemas.pydantic import OpportunityBase, CustomFieldType,OppStatus, OppStatusOptions
from common_grants_sdk.schemas.pydantic.fields import CustomField

field = CustomField(name="legacyId", fieldType=CustomFieldType.INTEGER, value=12345)
field2 = CustomField(
    name="groupName", fieldType=CustomFieldType.STRING, value="TEST GROUP"
)


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
        "groupName": {"name": "groupName", "fieldType": "string", "value": "TEST_GROUP"},
        "ignoredForNow": {"type": "string", "value": "noop"},
    },
}


#opp = Opportunity.from_dict(opp_data)


opp = Opportunity.model_validate(opp_data)


print(opp.custom_fields.legacy_id.value)
print(opp.custom_fields.group_name.value)
