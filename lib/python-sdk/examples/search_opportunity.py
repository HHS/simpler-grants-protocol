"""Example script demonstrating how to search for opportunities. 

Run with: poetry run python search_opportunity.py <searchTerm> 
"""

import sys

from common_grants_sdk.client import Client
from common_grants_sdk.client.config import Config
from common_grants_sdk.schemas.pydantic.models.opp_status import OppStatusOptions

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

response = client.opportunity.search(
    search=search, status=[OppStatusOptions.OPEN], page=1
)

print(f"Found {len(response.items)} opportunities: ")

for opp in response.items:
    print(f" - {opp.id}: {opp.title}")
