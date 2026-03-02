# Python SDK Examples

This folder contains example scripts demonstrating how to use the CommonGrants Python SDK.

## Prerequisites

You can run these examples against a mock API (no backend required), the California Grants FastAPI example, or a remote API.

### Option A: Mock API (easiest, no Python/FastAPI)

From the `lib/ts-sdk` directory, start the built-in mock server in one terminal:

```bash
pnpm install
pnpm example:server
```

Then in another terminal run any example. The mock server listens on `http://localhost:8000` and serves list, get, and search with sample data including custom fields.


### Option B: Pennslyvania Grants FastAPI API

By default the examples use `http://localhost:8000`. To use the Pennslyvania Grants example API instead of the mock server:

From the repository root:

```bash
cd examples/pa-opportunity-example
make install
make dev
```



### Option C: Remote API

To connect to a remote CommonGrants-compatible API instead of localhost, set the following environment variables:

```bash
export CG_BASE_URL="https://your-api-endpoint.com"
export CG_API_KEY="your-api-key"
```

Then install the SDK dependencies from the `lib/ts-sdk` directory:

```bash
pnpm install
```


## Running the Examples

From the `lib/py-sdk` directory run:

```bash

poetry run python examples/list_opportunity.py

```

** Output Example: **
```
Found 3 opportunities:
  - 573525f2-8e15-4405-83fb-e6523511d893: STEM Education Grant Program, custom field value: 12345, custom field description: Legacy system opportunity ID
  - a1b2c3d4-e5f6-7890-abcd-ef1234567890: Community Development Grant, custom field value: 12346, custom field description: Legacy system opportunity ID
  - b2c3d4e5-f6a7-8901-bcde-f12345678901: Education Initiative, custom field value: 12347, custom field description: Legacy system opportunity ID
```

```bash
poetry run python examples/get_opportunity.py <opportunityId>

```

** Output Example: ** 
```
Opportunity 573525f2-8e15-4405-83fb-e6523511d893:
  Title: STEM Education Grant Program
  ID: 573525f2-8e15-4405-83fb-e6523511d893
 Custom Fields: legacy_id=OpportunityLegacyIdField(name='legacyId', field_type=<CustomFieldType.INTEGER: 'integer'>, schema_url=None, value=12345, description='Legacy system opportunity ID') group_name=None
```

```bash
poetry run python examples/search_opportunity.py <searchTerm>

```

** Output Example: ** 
```
Found 2 opportunities:
 - 573525f2-8e15-4405-83fb-e6523511d893: STEM Education Grant Program custom field value: 12345, custom field description: Legacy system opportunity ID
 - b2c3d4e5-f6a7-8901-bcde-f12345678901: Education Initiative custom field value: 12347, custom field description: Legacy system opportunity ID
```


#Custom field usage
```bash
poetry run python examples/custom_fields.py
```

** Output Example: **
```
12345
TEST_GROUP
```


#Parse custom fields example
```bash
poetry run python examples/get_custom_fields.py
```

** Output Example: **

```
name='legacyId' field_type=<CustomFieldType.OBJECT: 'object'> schema_url=None value={'system': 'legacy', 'id': 123} description=None
123
test group
None
```


## Configuration

Each example script connects to `http://localhost:8000` by default. You can configure the API endpoint and authentication using environment variables:

| Variable      | Description                          | Default                 |
| ------------- | ------------------------------------ | ----------------------- |
| `CG_BASE_URL` | The base URL of the CommonGrants API | `http://localhost:8000` |
| `CG_API_KEY`  | Your API key for authentication      | `<your-api-key>`        |

**Example:**

```bash
CG_BASE_URL="https://api.example.com" CG_API_KEY="my-secret-key" pnpm example:list
```