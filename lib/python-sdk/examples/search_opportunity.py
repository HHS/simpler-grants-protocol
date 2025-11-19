"""Example script demonstrating how to search for opportunities. 

Run with: poetry run python search_opportunity.py <search> <status> <paginateBool>
"""

import sys

from common_grants_sdk.client import Client
from common_grants_sdk.client.config import Config

if len(sys.argv) < 3:
    print(
        "Usage: search_opportunity.py <search> <status> <paginateBool>", file=sys.stderr
    )
    sys.exit(1)

search = sys.argv[1]
status = sys.argv[2]
paginate = sys.argv[3]


config = Config(
    base_url="http://localhost:8080",
    api_key="two_orgs_user_key",
    timeout=5.0,
    page_size=10,
)

client = Client(config)
response = client.opportunity.search(search=search, status=status, paginate=paginate)

print(f"Found {len(response.items)} opportunities: ")

for opp in response.items:
    print(f" - {opp.id}: {opp.title}")
