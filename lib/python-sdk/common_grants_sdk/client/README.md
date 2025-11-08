# CommonGrants HTTP Client

The CommonGrants HTTP Client provides a type-safe, Pythonic interface for interacting with CommonGrants Protocol-compliant APIs. It handles authentication, request/response parsing, and pagination automatically.

## Features

- **Type-Safe**: All responses are validated and returned as Pydantic models
- **Namespaced API**: Organized by resource type
- **Flexible Authentication**: Support for API keys and bearer tokens
- **Environment Configuration**: Easy configuration via environment variables
- **Context Manager Support**: Proper resource cleanup with context managers

## Installation

The client is included in the `common-grants-sdk` package:

```bash
pip install common-grants-sdk
# or
poetry add common-grants-sdk
```

## Quick Start

```python
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

# Initialize client with defaults (uses environment variables or localhost)
config = Config(base_url="https://api.example.org", timeout=10.0)
client = Client(config=config, auth=Auth.api_key("YOUR_API_KEY"))

# Get a specific opportunity
opp = client.opportunity.get("<opportunity_id>")
print(opp.title, opp.description)

# List opportunities (first page)
response = client.opportunity.list(page=1)
print(f"Found {len(response.items)} opportunities on page {response.pagination_info.page}")
for opp in response.items:
    print(opp.id, opp.title)
```

## Authentication

The client supports two authentication methods:

### API Key Authentication

```python
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.api_key("my-api-key"))
```

### Bearer Token Authentication

```python
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.bearer("my-bearer-token"))
```

## Configuration

### Environment Variables

Configure the client using environment variables instead of passing parameters:

```bash
export CG_API_BASE_URL="https://api.example.org"
export CG_API_KEY="my-api-key"
export CG_API_TIMEOUT="30"
export CG_API_PAGE_SIZE="100"
```

Then initialize the client with minimal configuration:

```python
from common_grants_sdk.client import Client

client = Client()
```

### Configuration Priority

Configuration values are resolved in this order (highest to lowest priority):

1. Explicit parameters passed to `Config()`
2. Environment variables
3. Default values

## Usage Examples

### Getting a Single Opportunity

```python
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org")
auth = Auth.api_key("my-api-key")
client = Client(config=config, auth=auth)

# Get opportunity by ID
opportunity = client.opportunity.get("123e4567-e89b-12d3-a456-426614174000")

print(f"Title: {opportunity.title}")
print(f"Status: {opportunity.status.value}")
print(f"Description: {opportunity.description}")

# Access nested fields
if opportunity.funding:
    print(f"Max award: {opportunity.funding.max_award_amount}")
```

### List Opportunities (Single Page)

```python
# Get first page
response = client.opportunity.list(page=1)

print(f"Page {response.pagination_info.page} of {response.pagination_info.total_pages}")
print(f"Retrieved {len(response.items)} of {response.pagination_info.total_items} opportunities")

for opp in response.items:
    print(opp.title)
```

### Paginating Through Multiple Pages

```python
# Fetch multiple pages manually
page = 1
while True:
    response = client.opportunity.list(page=page)
    
    for opp in response.items:
        print(opp.id, opp.title)
    
    # Check if there are more pages
    if page >= response.pagination_info.total_pages:
        break
    
    page += 1
```

### Handling Errors

```python
import httpx
from pydantic import ValidationError
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.api_key("key"))

try:
    opp = client.opportunity.get("invalid-id")
except httpx.HTTPStatusError as e:
    if e.response.status_code == 404:
        print("Opportunity not found")
    elif e.response.status_code == 401:
        print("Authentication failed - check API key")
    else:
        print(f"HTTP error ({e.response.status_code}): {e}")
except ValidationError as e:
    print(f"Invalid response format: {e}")
```

## Best Practices

### Configure via Environment Variables

For production deployments, use environment variables instead of hardcoding credentials:

```python
# Good
client = Client()  # Reads from environment

# Avoid
config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.api_key("hardcoded-key"))  # Don't hardcode!
```

### Handle Large Result Sets with Manual Pagination

When fetching many opportunities, paginate through pages:

```python
page = 1
while True:
    response = client.opportunity.list(page=page)
    for opp in response.items:
        process(opp)
    
    if page >= response.pagination_info.total_pages:
        break
    page += 1
```

### Set Appropriate Timeouts

Adjust timeout based on network conditions and API response times:

```python
# For slow networks or complex queries
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org", timeout=30.0)
client = Client(config=config, auth=Auth.api_key("my-api-key"))
```

### Check Pagination Info

Always check pagination metadata to understand the full result set:

```python
response = client.opportunity.list(page=1)
pagination = response.pagination_info

print(f"Retrieved {len(response.items)} of {pagination.total_items} opportunities")
print(f"Page {pagination.page} of {pagination.total_pages}")
```

## See Also

- [CommonGrants Protocol Documentation](https://commongrants.org)
- [PySDK Main README](../README.md)
- [Schema Documentation](../schemas/)
