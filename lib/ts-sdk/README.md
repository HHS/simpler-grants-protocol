# @common-grants/sdk

The CommonGrants protocol TypeScript SDK.

## Installation

```bash
npm install @common-grants/sdk
```

## Usage

Use the SDK schemas to validate JSON data:

```ts
import { z } from "zod";
import * as Schemas from "@common-grants/sdk/schemas";

type Opportunity = z.infer<typeof Schemas.OpportunityBaseSchema>;

// Successful validation
const oppData = {
  id: "ac201443-5480-4e36-9799-a39765225153",
  title: "Test Opportunity",
  description: "This is a test opportunity",
  status: { value: "open" },
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-01T00:00:00Z",
};
const opportunity: Opportunity = Schemas.OpportunityBaseSchema.parse(oppData);
console.log(opportunity.title);
console.log(opportunity.createdAt.getFullYear());
```

Which should print:

```
Test Opportunity
2025
```

You can also gracefully handle errors uisng the `safeParse()` method:

```ts
import { z } from "zod";
import * as Schemas from "@common-grants/sdk/schemas";

type Opportunity = z.infer<typeof Schemas.OpportunityBaseSchema>;

// Validation error
const invalidOppData = {
  id: "invalid-id",
  title: "Test Opportunity",
  description: "This is a test opportunity",
  status: { value: "invalid-status" },
  createdAt: "2025-01-01T00:00:00Z",
  lastModifiedAt: "2025-01-01T00:00:00Z",
};
const result = Schemas.OpportunityBaseSchema.safeParse(invalidOppData);
if (!result.success) {
  console.error(result.error.message);
} else {
  console.log("Validation successful");
}
```

Which should print:

```json
[
  {
    "validation": "uuid",
    "code": "invalid_string",
    "message": "Invalid uuid",
    "path": ["id"]
  },
  {
    "received": "invalid-status",
    "code": "invalid_enum_value",
    "options": ["forecasted", "open", "closed", "custom"],
    "path": ["status", "value"],
    "message": "Invalid enum value. Expected 'forecasted' | 'open' | 'closed' | 'custom', received 'invalid-status'"
  }
]
```

## License

CC0-1.0
