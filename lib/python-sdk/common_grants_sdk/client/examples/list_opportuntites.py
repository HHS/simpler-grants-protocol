#!/usr/bin/env python3
"""Example script demonstrating basic client usage.

Run with: poetry run python list_opportuntites.py
"""

from common_grants_sdk.client import Client

client = Client()
opportunities = list(client.list_opportunities().iter_items())

print(f"Found {len(opportunities)} opportunities:")
for opp in opportunities:
    print(f"  - {opp.id}: {opp.title}")
