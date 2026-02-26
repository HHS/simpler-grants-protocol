---
"@common-grants/sdk": minor
---

Supports registering custom fields at runtime

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
    description: "An integer ID for the opportunity, needed for compatibility with legacy systems",
  },
} as const);

const client = new Client({
  baseUrl: "http://localhost:8080",
  auth: Auth.apiKey("your-api-key"),
});

const opportunities = await client.opportunities.list(OpportunitySchema);

for (const opportunity of opportunities) {
  console.log(opportunity.customFields.legacyId); // typed access
}
```
