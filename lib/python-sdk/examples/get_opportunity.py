#!/usr/bin/env python3
"""Example script demonstrating how to fetch a single opportunity by ID.

Run with: poetry run python get_opportunity.py <oppId>
"""

import sys

from common_grants_sdk.client import Client
from common_grants_sdk.client.config import Config
from common_grants_sdk.extensions.specs import CustomFieldSpec
from common_grants_sdk.schemas.pydantic import OpportunityBase, CustomFieldType

if len(sys.argv) < 2:
    print("Usage: get_opportunity.py <oppId>", file=sys.stderr)
    sys.exit(1)

opp_id = sys.argv[1]
config = Config(
    base_url="http://localhost:8080",
    api_key="two_org_user_key",
    timeout=5.0,
)
client = Client(config)

fields = {
    "legacyId": CustomFieldSpec(field_type=CustomFieldType.INTEGER, value=int),
    "groupName": CustomFieldSpec(field_type=CustomFieldType.STRING, value=str),
}

opp = OpportunityBase.with_custom_fields(custom_fields=fields, model_name="Opportunity")


opportunity = client.opportunity.get(opp_id, opp_base=opp)

print(f"Opportunity {opp_id}:")
print(f"  Title: {opportunity.title}")
print(f"  ID: {opportunity.id}")
print(f" Custom Fields: {opportunity.custom_fields}")
