# CommonGrants HTTP Client

The CommonGrants HTTP Client provides a type-safe, Pythonic interface for interacting with CommonGrants Protocol-compliant APIs. It handles authentication, request/response parsing, and pagination automatically.

## Table of contents <!-- omit in toc -->

- [Quick start](#quick-start)
- [Usage](#usage)
  - [Authentication](#authentication)
  - [Configuration](#configuration)
  - [Opportunity methods](#opportunity-methods)
  - [Pagination](#pagination)
  - [Low-level HTTP methods](#low-level-http-methods)
  - [Handling errors](#handling-errors)
- [API reference](#api-reference)
  - [Client class](#client-class)
  - [Opportunities resource](#opportunities-resource)
  - [Auth class](#auth-class)
- [See Also](#see-also)

## Quick start

```python
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

config = Config(base_url="https://api.example.org")
client = Client(config=config, auth=Auth.api_key("YOUR_API_KEY"))

response = client.opportunities.list()
for opp in response.items:
    print(f"{opp.title} ({opp.status.value})")
```

## Usage

### Authentication

The client supports two authentication methods via the `Auth` class:

```python
from common_grants_sdk.client import Auth

# API key (header: X-API-Key)
Auth.api_key("your-api-key")

# Bearer token (e.g. a JWT)
Auth.bearer("your-jwt-token")
```

Pass the chosen method to the `Client` constructor via the `auth` argument. If omitted, the client defaults to `Auth.api_key` using the key from `Config`.

### Configuration

```python
from common_grants_sdk.client import Client, Auth
from common_grants_sdk.client.config import Config

config = Config(
    base_url="https://api.example.org",  # Required (or set CG_API_BASE_URL env var)
    api_key="my-api-key",                # Required (or set CG_API_KEY env var)
    timeout=10.0,                        # Optional: request timeout in seconds (default: 10.0)
    page_size=100,                       # Optional: default page size (default: 100)
    list_items_limit=1000,               # Optional: max items for auto-pagination (default: 1000)
)
client = Client(config=config, auth=Auth.api_key("my-api-key"))
```

#### Configuration Priority

Configuration values are resolved in this order (highest to lowest priority):

1. Explicit parameters passed to `Config()`
2. Environment variables
3. Default values

#### Environment variables <!-- omit in toc -->

Every config value can be set via an environment variable. Explicit constructor values take precedence over environment variables.

| Config | Environment Variable | Default |
|---|---|---|
| `base_url` | `CG_API_BASE_URL` | _required_ |
| `api_key` | `CG_API_KEY` | _required_ |
| `timeout` | `CG_API_TIMEOUT` | `10.0` |
| `page_size` | `CG_API_PAGE_SIZE` | `100` |
| `list_items_limit` | `CG_API_LIST_ITEMS_LIMIT` | `1000` |

> **Note:** "required" means the value must be provided either as a constructor argument or via the env var. If neither is set, `Config()` raises `ValueError`.

### Opportunity methods

The `client.opportunities` namespace provides methods for the CommonGrants opportunities endpoints.

#### List opportunities <!-- omit in toc -->

**`GET /common-grants/opportunities`**

```python
# Fetch all opportunities (auto-paginates)
response = client.opportunities.list()
for opp in response.items:
    print(f"{opp.id}: {opp.title}")

# Fetch a specific page
response = client.opportunities.list(page=1, page_size=20)
print(f"Page {response.pagination_info.page} of {response.pagination_info.total_pages}")
```

#### Search opportunities <!-- omit in toc -->

**`POST /common-grants/opportunities/search`**

```python
from common_grants_sdk.schemas.pydantic import OppStatusOptions

# Search with a text query and status filter
response = client.opportunities.search(
    search="community health",
    status=[OppStatusOptions.OPEN],
)
for opp in response.items:
    print(opp.title)
```

#### Get a single opportunity <!-- omit in toc -->

**`GET /common-grants/opportunities/{id}`**

```python
opportunity = client.opportunities.get("123e4567-e89b-12d3-a456-426614174000")
print(opportunity.title)
print(opportunity.status.value)
```

### Pagination

List and search methods accept a `page` argument to fetch a specific page. When `page` is omitted, the client fetches all pages up to `list_items_limit` (default: 1000):

```python
# Auto-paginate (fetches all pages)
response = client.opportunities.list()
print(f"Retrieved {len(response.items)} total opportunities")

# Fetch a specific page (disables auto-pagination)
page2 = client.opportunities.list(page=2, page_size=10)
print(f"Page {page2.pagination_info.page} of {page2.pagination_info.total_pages}")
```

### Low-level HTTP methods

For custom endpoints or advanced use cases, the client exposes `get()` and `post()` methods that attach authentication headers automatically:

```python
# GET request with query params
response = client.get("/custom/endpoint", params={"filter": "value"})
data = response.json()

# POST request with body
response = client.post("/custom/endpoint", json={"field": "value"})
data = response.json()
```

These return raw `httpx.Response` objects, giving you full control over response handling.

### Handling errors

The client raises `APIError` for all API request failures:

```python
from pydantic import ValidationError
from common_grants_sdk.client.exceptions import APIError

try:
    opp = client.opportunities.get("invalid-id")
except APIError as e:
    print(f"API error ({e.error.status}): {e.error.message}")
    if e.error.status == 404:
        print("Opportunity not found")
    elif e.error.status == 401:
        print("Authentication failure")
except ValidationError as e:
    print(f"Response validation failure: {e}")
```

## API reference

### Client class

| Method | Description |
|---|---|
| `Client(config?, auth?)` | Creates a new client instance. Resolves config from constructor options and environment variables. |
| `client.get(path, **kwargs)` | Authenticated GET request. Returns `httpx.Response`. |
| `client.post(path, **kwargs)` | Authenticated POST request. Returns `httpx.Response`. |
| `client.get_item(path, item_id)` | GET `{path}/{item_id}`. Returns an internal `SuccessResponse`. Used by resource methods. |
| `client.list(path, page?, page_size?, params?)` | Paginated GET. Returns `Paginated[T]`. Fetches all pages when `page=None`. |
| `client.search(path, request_data, page?, page_size?)` | Paginated POST. Returns `Paginated[T]`. Fetches all pages when `page=None`. |
| `client.url(path)` | Constructs a full URL from base URL and path. |
| `client.close()` | Closes the underlying httpx session and releases resources. |

### Opportunities resource

| Method | Route | Description |
|---|---|---|
| `client.opportunities.get(opp_id, schema?)` | `GET /common-grants/opportunities/{id}` | Fetch a single opportunity by ID. Accepts an optional `schema` for typed custom fields. |
| `client.opportunities.list(page?, page_size?, schema?)` | `GET /common-grants/opportunities` | List opportunities. Auto-paginates when `page=None`. |
| `client.opportunities.search(search, status, page?, page_size?, schema?)` | `POST /common-grants/opportunities/search` | Search by text query and status list. Auto-paginates when `page=None`. |

### Auth class

| Method | Description |
|---|---|
| `Auth.api_key(key)` | API key authentication. Sends `X-API-Key: <key>` header. Default when no `auth` is passed to `Client()`. |
| `Auth.bearer(token)` | Bearer token authentication. Sends `Authorization: Bearer <token>` header. |

## See Also

- [CommonGrants Protocol Documentation](https://commongrants.org)
- [PySDK Main README](../../README.md)
- [Schema Documentation](../schemas/README.md)
- [Extensions Documentation](../extensions/README.md)
