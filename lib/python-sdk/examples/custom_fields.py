from common_grants_sdk.schemas.pydantic import OpportunityBase, CustomFieldType
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
    "id": "573525f2-8e15-4405-83fb-e6523511d893",
    "title": "Foo bar",
    "status": {"value": "open"},
    "description": "Example opportunity",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastModifiedAt": "2024-01-01T00:00:00Z",
    "customFields": {
        "legacyId": {
            "name": "legacyId",
            "type": "integer",
            "value": 12345,
        },
        "groupName": {"name": "groupName", "type": "string", "value": "TEST_GROUP"},
        "ignoredForNow": {"type": "string", "value": "noop"},
    },
}


opp = Opportunity.from_dict(opp_data)

print(opp.custom_fields.legacy_id.value)
print(opp.custom_fields.group_name.value)
