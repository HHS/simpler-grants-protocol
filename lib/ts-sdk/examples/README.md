# TypeScript SDK Examples

This folder contains example scripts demonstrating how to use the CommonGrants TypeScript SDK.

## Prerequisites

Before running these examples, you need a CommonGrants-compatible API running locally.

### 1. Start the Example API

The easiest way to get started is to run the California Grants Example API. From the repository root, run:

```bash
cd examples/ca-opportunity-example
make install
make dev
```

This starts a local API server at `http://localhost:8000`.

> [!NOTE]
> The commands above require both Python and Poetry to be installed.
> For more details, see the [California grants example API README](../../../examples/ca-opportunity-example/README.md).

### 2. Install SDK Dependencies

From the `lib/ts-sdk` directory:

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

## Customizing the Examples

Each example script connects to `http://localhost:8000` by default. To connect to a different API, edit the `baseUrl` in the example files:

```typescript
const client = new Client({
  baseUrl: "https://your-api-endpoint.com",
  auth: Auth.apiKey("your-api-key"),
});
```
