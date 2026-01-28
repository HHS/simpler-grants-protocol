#!/usr/bin/env python3
"""Example script demonstrating basic client usage.

Run with: poetry run python list_opportunities.py
"""

from common_grants_sdk.client import Client
from common_grants_sdk.client.config import Config

config = Config(
    base_url="http://localhost:8080",
    api_key="two_orgs_user_key",
    timeout=5.0,
    page_size=10,
)
client = Client(config)
response = client.opportunity.list(page=1)

print(f"Found {len(response.items)} opportunities:")
for opp in response.items:
    print(f"  - {opp.id}: {opp.title}")
