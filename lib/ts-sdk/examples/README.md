# TypeScript SDK Examples

This folder contains example scripts demonstrating how to use the CommonGrants TypeScript SDK.

## Prerequisites

You can run these examples against either a locally hosted API or a remote API.

### Option A: Local API

By default the examples will run against a local API at `http://localhost:8000`. You can follow the instructions below to start a local API server using the California Grants example API.

**1. Start the Example API**

From the repository root, run:

```bash
cd examples/ca-opportunity-example
make install
make dev
```

This starts a local API server at `http://localhost:8000`.

> [!NOTE]
> The commands above require both Python and Poetry to be installed.
> For more details, see the [California grants example API README](../../../examples/ca-opportunity-example/README.md).

**2. Install SDK Dependencies**

From the `lib/ts-sdk` directory:

```bash
pnpm install
```

### Option B: Remote API

To connect to a remote CommonGrants-compatible API, set the following environment variables:

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
