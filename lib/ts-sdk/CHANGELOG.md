# @common-grants/sdk

## 0.3.0

### Minor Changes

- 2ab4121: Supports registering custom fields at runtime
  - Adds `withCustomFields` function to extend a base schema with typed custom fields
  - Adds `getCustomFieldValue` function to get and parse a typed value of a custom field from a customFields object
  - Updates `Client.opportunity` methods to allow SDK users to optionally pass a custom schema to parse the response data

  ```typescript
  import { z } from "zod";
  import { Client, Auth } from "@common-grants/sdk/client";
  import { OpportunityBaseSchema } from "@common-grants/sdk/schemas";
  import { CustomFieldType } from "@common-grants/sdk/constants";
  import { withCustomFields } from "@common-grants/sdk/extensions";

  const OpportunitySchema = withCustomFields(OpportunityBaseSchema, {
    legacyId: {
      name: "Legacy ID",
      fieldType: CustomFieldType.integer,
      valueSchema: z.number().int(),
      description:
        "An integer ID for the opportunity, needed for compatibility with legacy systems",
    },
  } as const);

  const client = new Client({
    baseUrl: "http://localhost:8000",
    auth: Auth.apiKey("your-api-key"),
  });

  async function main() {
    const opportunities = await client.opportunities.list({ schema: OpportunitySchema });

    for (const opportunity of opportunities.items) {
      console.log(`${opportunity.id}: ${opportunity.title}`);
      console.log(`  Status: ${opportunity.status.value}`);
      console.log(`  Legacy ID: ${opportunity.customFields?.legacyId?.value}`); // typed access
    }
  }

  main().catch(console.error);
  ```

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
