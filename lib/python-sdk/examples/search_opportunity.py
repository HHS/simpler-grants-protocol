"""Example script demonstrating how to search for opportunities. 

Run with: poetry run python search_opportunity.py <searchTerm> 
"""

import sys

from common_grants_sdk.client import Client
from common_grants_sdk.client.config import Config
from common_grants_sdk.schemas.pydantic.models.opp_status import OppStatusOptions
from common_grants_sdk.extensions.specs import CustomFieldSpec
from common_grants_sdk.schemas.pydantic import OpportunityBase, CustomFieldType

if len(sys.argv) < 1:
    print("Usage: search_opportunity.py <searchTerm>", file=sys.stderr)


config = Config(
    base_url="http://localhost:8080",
    api_key="two_orgs_user_key",
    timeout=5.0,
    page_size=10,
)

search = sys.argv[1]
client = Client(config)


fields = {
    "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
    "groupName": CustomFieldSpec(field_type=CustomFieldType.STRING, value=str),
}

opp = OpportunityBase.with_custom_fields(custom_fields=fields, model_name="Opportunity")


response = client.opportunity.search(
    search=search, status=[OppStatusOptions.OPEN], page=1, schema=opp
)

print(f"Found {len(response.items)} opportunities: ")

for item in response.items:
    print(
        f" - {item.id}: {item.title} custom field value: {item.custom_fields.legacy_id.value}, custom field description: {item.custom_fields.legacy_id.description}"  # type: ignore[union-attr]
    )
