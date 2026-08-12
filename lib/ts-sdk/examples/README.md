# TypeScript SDK Examples

This folder contains example scripts demonstrating how to use the CommonGrants TypeScript SDK.

## Prerequisites

You can run these examples against a mock API (no backend required), the California Grants FastAPI example, or a remote API.

### Option A: Mock API (easiest, no Python/FastAPI)

From the `lib/ts-sdk` directory, start the built-in mock server in one terminal:

```bash
pnpm install
pnpm example:server
```

Then in another terminal run any example. The mock server listens on `http://localhost:8000` and serves list, get, and search with sample data including custom fields.

### Option B: California Grants FastAPI API

By default the examples use `http://localhost:8000`. To use the California Grants example API instead of the mock server:

From the repository root:

```bash
cd examples/ca-opportunity-example
make install
make dev
```

> [!NOTE]
> The commands above require both Python and Poetry to be installed.
> For more details, see the [California grants example API README](../../../examples/ca-opportunity-example/README.md).

From the `lib/ts-sdk` directory:

```bash
pnpm install
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

From the `lib/ts-sdk` directory, run:

```bash
# List opportunities
pnpm example:list

# Get a specific opportunity by ID
pnpm example:get <opportunityId>

# Search opportunities by keyword
pnpm example:search <searchTerm>

# Demonstrate custom fields usage
pnpm example:custom-fields

# Parse custom fields (mock response, or fetch by ID from API)
pnpm example:get-custom-fields
pnpm example:get-custom-fields <opportunityId>

# Plugin framework: define, compose, and validate
pnpm example:plugins

# Custom filters: declare on a route, classify a consumer filter bag
pnpm example:custom-filters

# Bidirectional transforms: mappings, handlers, and round-trips
pnpm example:transforms

# A realistic grants.gov plugin: custom fields + transforms
pnpm example:grants-gov
```

## Examples

### List Opportunities

Lists the first page of opportunities from the API.

```bash
pnpm example:list
```

**Output Example:**

```
Found 10 opportunities:
  - 123e4567-e89b-12d3-a456-426614174000: Community Development Grant
  - 987fcdeb-51a2-3b4c-5d6e-789012345678: Education Initiative
  ...
```

### Get Opportunity

Fetches details for a specific opportunity by ID. **Note:** You should choose an opportunity ID from the output of the `pnpm example:list` command.

```bash
pnpm example:get <opportunityId>
```

**Output Example:**

```
Opportunity 123e4567-e89b-12d3-a456-426614174000:
  Title: Community Development Grant
  ID: 123e4567-e89b-12d3-a456-426614174000
  Status: open
```

### Search Opportunities

Searches for opportunities matching a keyword, filtered to open opportunities only.

```bash
pnpm example:search "Nature"
```

**Output Example:**

```
Found 3 opportunities:
  - abc12345-...: Nature-based Solutions Grant
  - def67890-...: Community Development Grant
  ...
```

### Custom Fields

Demonstrates how to extend schemas with typed custom fields and extract their values safely.

```bash
pnpm example:custom-fields
```

### Get Opportunity with Custom Fields

Parses a mock API response (no server) or fetches an opportunity from the API using a schema with typed custom fields.

```bash
# Parse inline mock response (no API required)
pnpm example:get-custom-fields

# Fetch from API with typed custom fields
pnpm example:get-custom-fields <opportunityId>
```

**Output Example:**

```
=== Custom Fields Example ===

1. Parsing opportunity data with custom fields...
   ✓ Parsed: STEM Education Grant Program

2. Extracting typed custom field values:

   legacyId:
     System: legacy-crm
     ID: 12345 (typed as number)
   tags: education, STEM, nonprofit, youth (typed as string[])
   category: Education (typed as string)
   metadata:
     Version: 2
     Source: api-import
     Imported: 2025-01-01T10:00:00Z

3. Type safety demonstration:
   ✓ TypeScript knows legacyId.id is a number
   ✓ TypeScript knows tags is a string[]
   ✓ TypeScript knows category is a string
   ✓ TypeScript knows metadata.version is a number

4. Handling missing fields:
   nonexistent field: undefined (safely handled)

=== Example Complete ===
```

### Plugins

Demonstrates the plugin framework: defining plugins with `definePlugin({ schemas })`, accessing the typed `commonSchema` for validation, and reading typed custom field values. No server required.

```bash
pnpm example:plugins
```

**Output Example:**

```
=== Plugins Example ===

--- Standalone plugins ---

  legacyId.system: grants-v1
  legacyId.id:     42 (typed as number)

  category: STEM Education (typed as string)
  priority: 1 (typed as number)

--- Validation ---

Invalid custom field data:
{
  "id": "573525f2-8e15-4405-83fb-e6523511d893",
  "title": "STEM Education Grant Program",
  "description": "A grant program focused on STEM education in underserved communities",
  "status": {
    "value": "open"
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "lastModifiedAt": "2025-01-15T00:00:00Z",
  "customFields": {
    "priority": {
      "name": "priority",
      "fieldType": "integer",
      "value": "not-a-number"
    }
  }
}

Validation failed (as expected):
  Path:    customFields.priority.value
  Message: Expected number, received string

=== Example Complete ===
```

### Custom Filters

Demonstrates the custom-filter surface end to end: declaring filters on a route with `definePlugin({ routes })`, classifying a consumer filter bag into the ADR-0012 request body, and the errors that fire at registration time and at call time. Scenario 1 needs the mock server (`pnpm example:server`); the two error scenarios run without it.

```bash
pnpm example:custom-filters
```

**Output Example:**

```
=== Scenario 1: happy path (mock server) ===
  (skipped: could not reach http://localhost:8000; run `pnpm example:server` first)

=== Scenario 2: authoring errors (definePlugin) ===
  default-name collision rejected: Custom filter name "status" collides with a default filter field...
  unknown filterType rejected: Unknown filterType "strin" for filter "region". Must be one of: ...
  misspelled resource rejected: Route "opportunties.search" does not support custom filters ...
  misspelled method rejected: Route "opportunities.serach" does not support custom filters ...

=== Scenario 3: consumer errors (search, no request sent) ===
  registered wrong value family rejected: Filter "region" (filterType: "stringArray") failed validation ...
  ad-hoc operator/value mismatch rejected: Ad-hoc filter "fundingType" has an invalid operator/value combination: operator "in" expects an array value

✓ custom-filters example complete
```

### Transforms

Demonstrates bidirectional transforms wired through `definePlugin()`: declarative mappings, hand-written `toCommon` / `fromCommon` callables, a no-custom-fields plugin, and the runtime rejection when both mappings and callables are supplied. Round-trips are asserted, including that a `null` ("doesn't apply") survives in both directions. No server required.

```bash
pnpm example:transforms
```

**Output Example:**

```
=== Transforms via definePlugin ===

--- Scenario 1: declarative mappings ---
✓ mappings inspectable
✓ mappings: opportunity_uuid round-trips
✓ mappings: source_url null ('doesn't apply') preserved
✓ mappings: legacy opportunity_id round-trips

--- Scenario 2: hand-written functions ---
✓ functions: opportunity_uuid round-trips
...

=== Example complete ===
```

### Grants.gov Transforms

A realistic plugin for a live grants.gov opportunity: custom fields plus a transform with a custom handler. Requires an opportunity ID:

```bash
pnpm example:grants-gov <opportunityId>
# or: GRANTS_GOV_OPP_ID=<opportunityId> pnpm example:grants-gov
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
