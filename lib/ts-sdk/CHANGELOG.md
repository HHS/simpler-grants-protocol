# @common-grants/sdk

## 0.2.0

### Minor Changes

- b204ace: Adds support for an API client with Opportunity resource methods.

  For example, to fetch an auto-paginated list of all opportunities:

  ```typescript
  import { Client, Auth } from "@common-grants/sdk/client";

  const client = new Client({
    baseUrl: "https://api.example.org",
    auth: Auth.apiKey("your-api-key"),
  });

  const opportunities = await client.opportunities.list();
  for (const opportunity of opportunities) {
    console.log(`${opportunity.id}: ${opportunity.title}`);
  }
  ```

## 0.1.0

### Minor Changes

- 188c01f: Creates @common-grants/sdk with zod schemas
