# Python SDK Examples

This folder contains example scripts demonstrating how to use the CommonGrants Python SDK.

## Prerequisites

You can run these examples against a mock API (no backend required), the Pennsylvania Grants FastAPI example, or a remote API.

### Option A: Mock API (easiest, no Python/FastAPI)

From the `lib/ts-sdk` directory, start the built-in mock server in one terminal:

```bash
pnpm install
pnpm example:server
```

Then in another terminal run any example. The mock server listens on `http://localhost:8000` and serves list, get, and search with sample data including custom fields.


### Option B: Pennsylvania Grants FastAPI API

By default the examples use `http://localhost:8000`. To use the Pennsylvania Grants example API instead of the mock server:

From the repository root:

```bash
cd examples/pa-opportunity-example
make install
make dev
```



### Option C: Remote API

To connect to a remote CommonGrants-compatible API instead of localhost, set the following environment variables:

```bash
export CG_API_BASE_URL="https://your-api-endpoint.com"
export CG_API_KEY="your-api-key"
```

The environment variables only apply to scripts that construct `Config()` with no
arguments — see [Configuration](#configuration) below.


## Running the Examples

From the `lib/python-sdk` directory run:

```bash

poetry run python examples/list_opportunities.py

```

**Output Example:**
```
Found 3 opportunities:
  - 573525f2-8e15-4405-83fb-e6523511d893: STEM Education Grant Program, custom field value: 12345, custom field description: Legacy system opportunity ID
  - a1b2c3d4-e5f6-7890-abcd-ef1234567890: Community Development Grant, custom field value: 12346, custom field description: Legacy system opportunity ID
  - b2c3d4e5-f6a7-8901-bcde-f12345678901: Education Initiative, custom field value: 12347, custom field description: Legacy system opportunity ID
```

```bash
poetry run python examples/get_opportunity.py <opportunityId>

```

**Output Example:** 
```
Opportunity 573525f2-8e15-4405-83fb-e6523511d893:
  Title: STEM Education Grant Program
  ID: 573525f2-8e15-4405-83fb-e6523511d893
 Custom Fields: legacy_id=OpportunityLegacyIdField(name='legacyId', field_type=<CustomFieldType.INTEGER: 'integer'>, schema_url=None, value=12345, description='Legacy system opportunity ID') group_name=None
```

```bash
poetry run python examples/search_opportunities.py <searchTerm>

```

**Output Example:** 
```
Found 2 opportunities:
 - 573525f2-8e15-4405-83fb-e6523511d893: STEM Education Grant Program custom field value: 12345, custom field description: Legacy system opportunity ID
 - b2c3d4e5-f6a7-8901-bcde-f12345678901: Education Initiative custom field value: 12347, custom field description: Legacy system opportunity ID
```


#Custom field usage
```bash
poetry run python examples/custom_fields.py
```

**Output Example:**
```
12345
TEST_GROUP
```


#Parse custom fields example
```bash
poetry run python examples/get_custom_fields.py
```

**Output Example:**

```
name='legacyId' field_type=<CustomFieldType.OBJECT: 'object'> schema_url=None value={'system': 'legacy', 'id': 123} description=None
123
test group
None
```


# Plugins example

`examples/plugins.py` is a single, self-contained file that both **defines** the
example plugins and **validates** them. It demonstrates every authoring scenario
(custom fields + mappings, custom fields + hand-written functions, mappings with no
custom fields, schema-only, and a realistic combined grants.gov plugin) plus
bidirectional round-trips. There is no build step — run it directly:

```bash
cd lib/python-sdk
poetry run python examples/plugins.py
```

**Output Example:**

```
Scenario 1 -- custom fields + mappings
  [PASS] no transform errors
  [PASS] title mapped
  [PASS] agency_code.value typed str == 'HHS-123'
  [PASS] inspect: agency_code field_type derived STRING
  [PASS] round-trips (validated source instance)
Scenario 2 -- custom fields + hand-written functions
  [PASS] title mapped
  [PASS] agency_code.value == 'HHS-123'
  [PASS] from_common -> typed source
Scenario 3 -- mappings, no custom fields
  [PASS] title mapped
Scenario 4 -- custom fields only, no transforms
  [PASS] schema-only legacy_grant_id.value typed int == 98765
  ...
grants.gov -- custom fields + transform with a custom handler
  [PASS] no transform errors
  [PASS] title mapped
  [PASS] compositeLabel joined via custom handler
  [PASS] from_common -> validated source instance
```

See the [extensions README](../common_grants_sdk/extensions/README.md) for the full
plugin and mapping-format documentation.


# Custom filters examples

`examples/custom_filters.py` covers the custom-filter surface end to end in three
scenarios: the happy path against the mock server, authoring errors that
`define_plugin` rejects, and consumer errors that `search()` rejects before any
request is sent. Scenario 1 needs a server — start this package's own mock in
another terminal — and the two offline scenarios run either way:

```bash
poetry run python examples/mock_api_server.py   # in another terminal
poetry run python examples/custom_filters.py
```

**Output Example:**

```
=== Scenario 1: happy path (mock server) ===
  items returned: 1
  per-row parse failures: 0
  first opportunity: STEM Education Grant Program
  first program code: STEM-ED
  filters sent to the server: {"status": {"operator": "in", "value": ["open"]}, "customFilters": {"region": ..., "fundingType": ...}}

=== Scenario 2: authoring errors ===
  non-filter registration rejected: routes.opportunities.search.region - ...
  misspelled resource rejected: ...

=== Scenario 3: consumer errors (search, no request sent) ===
  registered filter, wrong kind of value: filters.region - ...
  ad-hoc filter, value does not fit operator: filters.fundingType - ...
```

`examples/typed_custom_filters.py` is the typed authoring-and-consuming experience:
one plugin declaring both custom fields and a custom filter, with `assert_type`
lines proving the consumer's typing. Its runtime unhappy-path check needs no API:

```bash
poetry run python -c "import examples.typed_custom_filters as e; e.demo_invalid_filter_raises()"
```

The matching negative type fixtures live in
`examples/typed_custom_filters_failures.py`. That file is *meant* to fail type
checking, so it sits in `pyrightconfig.json`'s `exclude` list to keep the type
gate green — and pyright skips excluded files even when they are named directly
on the command line. To see the guards fire, temporarily remove the
`"examples/typed_custom_filters_failures.py"` entry from `exclude` and run:

```bash
poetry run pyright examples/typed_custom_filters_failures.py
```

Expected: 3 errors, all on the lines marked `# EXPECT-ERROR`.

`examples/consumer_search_with_filters.py` is the full downstream consumer flow —
plugin author registers filters, consumer builds a filter dict with the `f.*`
builders and searches through `plugin.get_client()`. It needs a CommonGrants
endpoint on `http://localhost:8000`:

```bash
poetry run python examples/consumer_search_with_filters.py
```


## Configuration

The example scripts set `base_url` and `api_key` inline when they build their
`Config`, so they point at `http://localhost:8000` as written — edit the script,
or set the environment variables below and construct `Config()` with no arguments.

`Config` reads these when the corresponding argument is omitted:

| Variable                | Description                          | Default              |
| ----------------------- | ------------------------------------ | -------------------- |
| `CG_API_BASE_URL`       | The base URL of the CommonGrants API | none — required      |
| `CG_API_KEY`            | Your API key for authentication      | none — required      |
| `CG_API_TIMEOUT`        | Request timeout in seconds           | `10.0`               |
| `CG_API_PAGE_SIZE`      | Response max page size               | `100`                |

`base_url` and `api_key` have no fallback default: `Config()` raises `ValueError`
when neither the argument nor the environment variable is set.

**Example** — `examples/typed_custom_filters.py` constructs `Config()` with no
arguments, so it picks the environment values up (with the mock server running):

```bash
CG_API_BASE_URL="http://localhost:8000" CG_API_KEY="my-secret-key" \
  poetry run python examples/typed_custom_filters.py
```
