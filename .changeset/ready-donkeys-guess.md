---
"@common-grants/sdk": minor
---

Supports registering custom fields at runtime

- Adds `withCustomFields` function to extend a base schema with typed custom fields
- Adds `getCustomFieldValue` function to get and parse a typed value of a custom field from a customFields object
- Updates `Client.opportunity` methods to allow SDK users to optionally pass a custom schema to parse the response data
