#!/usr/bin/env python3
"""Example script demonstrating basic client usage.

Run with: poetry run python list_opportunity.py
"""

from common_grants_sdk.client import Client
from common_grants_sdk.client.config import Config
from common_grants_sdk.extensions.specs import CustomFieldSpec
from common_grants_sdk.schemas.pydantic import OpportunityBase, CustomFieldType

config = Config(
    base_url="http://localhost:8080",
    api_key="two_orgs_user_key",
    timeout=5.0,
    page_size=10,
)
client = Client(config)


fields = {
    "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
    "groupName": CustomFieldSpec(field_type=CustomFieldType.STRING, value=str),
}

opp = OpportunityBase.with_custom_fields(custom_fields=fields, model_name="Opportunity")


response = client.opportunity.list(page=1, opp_base=opp)

print(f"Found {len(response.items)} opportunities:")
for item in response.items:
    print(f"  - {item.id}: {item.title}: {item.custom_fields}")
