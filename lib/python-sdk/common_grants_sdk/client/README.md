# CommonGrants HTTP Client

The CommonGrants HTTP Client provides a type-safe, Pythonic interface for interacting with CommonGrants Protocol-compliant APIs. It handles authentication, request/response parsing, and pagination automatically.

## Features

- **Type-Safe**: All responses are validated and returned as Pydantic models
- **Automatic Pagination**: Transparent pagination support with configurable limits
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
opp = client.get_opportunity("<opportunity_id>")
print(opp.title, opp.description)

# List opportunities with automatic pagination
for opp in client.list_opportunities(paginate=True, total=1_000).iter_items():
    print(opp.id, opp.title)
```

## Authentication

The client supports two authentication methods:

### API Key Authentication

```python
from common_grants_sdk.client import Client, Auth

config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.api_key("your-api-key-here"))
```

### Bearer Token Authentication

```python
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.bearer("your-bearer-token-here"))
```

## Configuration

### Environment Variables

You can configure the client using environment variables instead of passing parameters:

```bash
export COMMON_GRANTS_BASE_URL="https://api.example.org"
export COMMON_GRANTS_API_KEY="your-api-key"
export COMMON_GRANTS_TIMEOUT="30"
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

### Default Configuration

By default, the client is configured to work with a local development instance:

```python
client = Client()
# Equivalent to:
# config = Config()  # Uses defaults or env vars
# Client(
#     config=config,
#     auth=Auth.api_key(config.api_key),
# )
```

## Usage Examples

### Getting a Single Opportunity

```python
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org")
auth = Auth.api_key("my-key")
client = Client(config=config, auth=auth)

# Get opportunity by ID (UUID string or UUID object)
opportunity = client.get_opportunity("123e4567-e89b-12d3-a456-426614174000")

print(f"Title: {opportunity.title}")
print(f"Status: {opportunity.status.value}")
print(f"Description: {opportunity.description}")

# Access nested fields
if opportunity.funding:
    print(f"Max award: {opportunity.funding.max_award_amount}")
```

### Listing Opportunities (Single Page)

```python
# Get first page only
iterator = client.list_opportunities(paginate=False)
opportunities = list(iterator.iter_items())

print(f"Retrieved {len(opportunities)} opportunities")
for opp in opportunities:
    print(opp.title)
```

### Listing Opportunities with Pagination

```python
# Automatically fetch multiple pages
iterator = client.list_opportunities(
    paginate=True,
    total=1_000,  # Stop after retrieving 1000 items
    page_size=50,  # Fetch 50 items per page
)

for opportunity in iterator.iter_items():
    print(opportunity.id, opportunity.title)
    # Iterator automatically fetches next page when needed
```

### Custom Pagination Parameters

```python
# Start from a specific page
iterator = client.list_opportunities(
    paginate=False,
    page=2,
    page_size=25,
)

# Only fetch the specified page
opportunities = list(iterator.iter_items())
```

### Context Manager Usage

```python
# Automatically closes HTTP connections when done
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org")
with Client(config=config, auth=Auth.api_key("key")) as client:
    opp = client.get_opportunity("<id>")
    print(opp.title)

# Client is automatically closed here
```

## API Reference

### `Client`

Main HTTP client for the CommonGrants API.

#### `Client.__init__(config=None, auth=None)`

Initialize the client.

**Parameters:**
- `config` (Config, optional): Configuration instance. If not provided, a Config instance is created using environment variables or defaults.
- `auth` (Auth, optional): Authentication configuration. If not provided, defaults to API key from the config instance (from environment variable `COMMON_GRANTS_API_KEY` or `two_orgs_user_key`)

#### `Client.get_opportunity(opp_id: str | UUID) -> OpportunityBase`

Get a specific opportunity by ID.

**Parameters:**
- `opp_id`: The opportunity ID (UUID string or UUID object)

**Returns:**
- `OpportunityBase`: The opportunity object

**Raises:**
- `httpx.HTTPStatusError`: For HTTP errors (404, 401, etc.)
- `pydantic.ValidationError`: If response cannot be parsed

#### `Client.list_opportunities(paginate=False, total=None, page=None, page_size=None) -> OpportunitiesListIterator`

List opportunities with optional transparent pagination.

**Parameters:**
- `paginate` (bool): If `True`, automatically fetch multiple pages. If `False`, only fetch the requested page. Default: `False`
- `total` (int, optional): Maximum number of items to retrieve when `paginate=True`. `None` means fetch all available. Default: `None`
- `page` (int, optional): Page number to start from (1-indexed). Only used if `paginate=False` or for the first page when `paginate=True`. Default: `1`
- `page_size` (int, optional): Number of items per page. Default: `100`, maximum: `100` (Config.PAGE_SIZE_MAX)

**Returns:**
- `OpportunitiesListIterator`: Iterator that can be used to iterate over items

### `OpportunitiesListIterator`

Iterator for paginated opportunity lists with transparent pagination.

#### `OpportunitiesListIterator.iter_items() -> Iterator[OpportunityBase]`

Iterate over opportunity items with automatic pagination.

**Yields:**
- `OpportunityBase`: Individual opportunity objects

**Example:**
```python
iterator = client.list_opportunities(paginate=True, total=500)
for opp in iterator.iter_items():
    print(opp.title)
    # Automatically fetches next page when current page is exhausted
```

### `Config`

Configuration class for the client.

#### `Config.__init__(base_url=None, api_key=None, timeout=None)`

Initialize configuration.

**Parameters:**
- `base_url` (str, optional): Base URL for the API. Must start with `http://` or `https://`
- `api_key` (str, optional): API key for authentication
- `timeout` (float, optional): Request timeout in seconds

**Raises:**
- `ValueError`: If `base_url` is empty or doesn't start with `http://` or `https://`

### `Auth`

Authentication configuration class.

#### `Auth.api_key(key: str) -> Auth`

Create auth using API key (X-API-Key header).

**Parameters:**
- `key`: The API key

**Returns:**
- `Auth` instance configured with API key

#### `Auth.bearer(token: str) -> Auth`

Create auth using bearer token (Authorization header).

**Parameters:**
- `token`: The bearer token

**Returns:**
- `Auth` instance configured with bearer token

#### `Auth.get_headers() -> dict[str, str]`

Get headers for API requests.

**Returns:**
- Dictionary of headers

## Error Handling

The client uses standard `httpx` exceptions for HTTP errors and Pydantic validation errors for response parsing.

### Exception Types

- **`httpx.HTTPStatusError`**: Raised for HTTP errors (4xx, 5xx status codes)
  - Has `response` attribute containing the HTTP response
  - Use `response.status_code` to get the HTTP status code
- **`pydantic.ValidationError`**: Raised when response cannot be parsed as expected schema
  - Contains detailed validation error information

### Handling Errors

```python
import httpx
from pydantic import ValidationError
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.api_key("key"))

try:
    opp = client.get_opportunity("invalid-id")
except httpx.HTTPStatusError as e:
    if e.response.status_code == 404:
        print("Opportunity not found")
    elif e.response.status_code == 401:
        print("Authentication failed - check your API key")
    else:
        print(f"HTTP error ({e.response.status_code}): {e}")
except ValidationError as e:
    print(f"Invalid response format: {e}")
```

## Best Practices

### 1. Use Context Managers

Use context managers to ensure proper resource cleanup:

```python
config = Config(base_url="https://api.example.org")
with Client(config=config, auth=Auth.api_key("key")) as client:
    # Use client here
    pass
# Client automatically closed
```

### 2. Configure via Environment Variables

For production deployments, use environment variables instead of hardcoding credentials:

```python
# Good
client = Client()  # Reads from environment

# Avoid
config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.api_key("hardcoded-key"))  # Don't hardcode!
```

### 3. Handle Large Result Sets with Pagination

Use pagination limits to avoid overwhelming your application:

```python
# Good - limits memory usage
for opp in client.list_opportunities(paginate=True, total=10_000).iter_items():
    process(opp)

# Avoid - may load all opportunities into memory
all_opps = list(client.list_opportunities(paginate=True).iter_items())
```

### 4. Set Appropriate Timeouts

Adjust timeout based on your network conditions and API response times:

```python
# For slow networks or complex queries
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org", timeout=30.0)
client = Client(config=config, auth=Auth.api_key("key"))
```

### 5. Validate IDs Before Making Requests

```python
from uuid import UUID
import httpx

try:
    opp_id = UUID(opportunity_id_string)
    opp = client.get_opportunity(opp_id)
except ValueError:
    print("Invalid UUID format")
except httpx.HTTPStatusError as e:
    if e.response.status_code == 404:
        print("Opportunity not found")
```

## See Also

- [CommonGrants Protocol Documentation](https://commongrants.org)
- [PySDK Main README](../README.md)
- [Schema Documentation](../schemas/)
