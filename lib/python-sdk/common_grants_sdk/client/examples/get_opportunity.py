#!/usr/bin/env python3
"""Example script demonstrating how to fetch a single opportunity by ID.

Run with: poetry run python get_opportunity.py <oppId>
"""

import sys

from common_grants_sdk.client import Client

if len(sys.argv) < 2:
    print("Usage: get_opportunity.py <oppId>", file=sys.stderr)
    sys.exit(1)

opp_id = sys.argv[1]
client = Client()
opportunity = client.get_opportunity(opp_id)

print(f"Opportunity {opp_id}:")
print(f"  Title: {opportunity.title}")
print(f"  ID: {opportunity.id}")

