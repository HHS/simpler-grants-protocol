"""Example script demonstrating how to search for opportunities. 

Run with: poetry run python search_opportunity.py
"""

import sys

from common_grants_sdk.client import Client
from common_grants_sdk.client.config import Config
from common_grants_sdk.schemas.pydantic.requests.opportunity import (
    OpportunitySearchRequest,
)

if len(sys.argv) < 3:
    print(
        "Usage: search_opportunity.py ", file=sys.stderr
    )
    sys.exit(1)

search = sys.argv[1]
status = sys.argv[2]
paginate = eval(sys.argv[3])


config = Config(
    base_url="http://localhost:8080",
    api_key="two_org_user_key",
    timeout=5.0,
    page_size=10,
)


request = {
    "filters": {
        "closeDateRange": {
            "operator": "between",
            "value": {"max": "2025-12-31", "min": "2025-01-01"},
        },
        "status": {"operator": "in", "value": ["open", "forecasted"]},
        "totalFundingAvailableRange": {
            "operator": "between",
            "value": {
                "max": {"amount": "1000000", "currency": "USD"},
                "min": {"amount": "10000", "currency": "USD"},
            },
        },
    },
    "pagination": {"page": 1, "pageSize": 10},
    "search": "local",
    "sorting": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
}

request_data = OpportunitySearchRequest.model_validate(request)


client = Client(config)
response = client.opportunity.search(search=request_data)

print(f"Found {len(response.items)} opportunities: ")

for opp in response.items:
    print(f" - {opp.id}: {opp.title}")
