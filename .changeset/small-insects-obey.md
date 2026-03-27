---
"@common-grants/sdk": minor
---

Adds a plugin framework for defining, composing, and sharing typed custom field extensions.

**Additions:**

- `definePlugin()` to create reusable plugins with typed schemas from `SchemaExtensions` configs
- `mergeExtensions()` to combine extensions from multiple plugins with configurable conflict resolution
- `HasCustomFields` and `ExtensibleObject` types to enforce compile-time constraints on `withCustomFields()` and `getCustomFieldValue()`
- Extensions documentation covering custom field extraction, plugin composition, and API client integration

```typescript
import { z } from "zod";
import { definePlugin, mergeExtensions } from "@common-grants/sdk/extensions";

// Define a plugin with typed custom fields
const legacyPlugin = definePlugin({
  extensions: {
    Opportunity: {
      legacyId: {
        fieldType: "integer",
        value: z.number().int(),
        description: "Legacy system opportunity ID",
      },
    },
  },
} as const);

// Parse data with fully typed custom fields
const opp = legacyPlugin.schemas.Opportunity.parse(data);
opp.customFields?.legacyId?.value; // typed as number

// Combine multiple plugins
const merged = mergeExtensions([pluginA.extensions, pluginB.extensions]);
const combined = definePlugin({ extensions: merged });
```

**Breaking changes:**

- `CustomFieldSpec.valueSchema` renamed to `CustomFieldSpec.value` to align with the Python SDK
- `getCustomFieldValue()` now accepts the parent object directly (e.g. `getCustomFieldValue(opp, "legacyId", schema)`) instead of the raw `customFields` record, aligning with the Python SDK
- `withCustomFields()` now requires schemas with a `customFields` property typed as `Record<string, CustomField>` (via the `HasCustomFields` constraint), rejecting loosely typed schemas at compile time
