---
title: Custom fields
description: ADR documenting the approach to defining custom fields.
---

## Summary

### Problem statement

While the protocol defines a minimum set of fields that are consistent across all implementations, it should also provide a consistent mechanism for defining custom fields that may be shared by some, but not all, implementations.

_How can the specification allow developers to define custom fields for their own implementations, while also enabling other implementations to re-use them?_

### Sub-questions

- Should custom fields have a single `value` property with an associated `type`, or multiple type-based properties (e.g., `stringValue`, `arrayValue`)?
- Should the `customFields` property be an array of `CustomField` models? Or an object where each value is a `CustomField` model?
- How can we minimize naming collisions while supporting reusability and extensibility?

### Decision drivers

- Custom fields are defined in a way that is largely self-documenting.
- API consumers can reliably (de)serialize the values of custom fields across programming languages and implementations.
- Custom fields can be re-used across multiple implementations.
- The likelihood of naming collisions is low even when combining data from multiple implementations.

### Decision outcome

We decided to define a `CustomObject` model as an object that has a:

- A required `name` property
- Single `value` property that can be any type (including nested objects or arrays)
- A `type` property that supports the following options (JSON schema types):
  - `string`
  - `number`
  - `boolean`
  - `array`
  - `object`
- An optional `schema` property that is a URL to a valid JSON schema that can be used to validate the contents of the `value` property
- An optional `description` property

Additionally custom fields within a given model should be defined in a `customFields` property. This property should be an object where each value is an instance of `CustomField` and each key follows a consistent naming convention (e.g. namespaces or prefixes) that minimize the likelihood of naming collisions.

Here's an example of a potential model that follows this approach:

```json
{
  "name": "Example grant",
  "description": "Description about this grant",
  "customFields": {
    "gov.grants@opportunityNumber": {
      "name": "fundingOpportunityNumber",
      "type": "string",
      "value": "CDFI-2025-FATA"
    },
    "gov.grants@eligibility": {
      "name": "eligibility",
      "type": "array",
      "value": ["Individuals", "City or township governments"]
    }
  }
}
```

### Consequences of single `value` field

- **Positive consequences**
  - Simplifies the model while accommodating various data types.
  - Supports adding new types or schemas without adding new properties.
  - Leverages existing standards for validation and documentation.
- **Negative consequences**
  - Makes parsing values in statically typed languages slightly more complex.

### Consequences of `customFields` object vs. array

- **Positive consequences**
  - Enables implementations to require certain custom fields in their spec.
  - Easier to define in TypeSpec, JSON Schema, and OpenAPI specs.
  - Makes (de)serializing custom fields more predictable.
- **Negative consequences**
  - Increases the likelihood of naming collisions.
  - Requires conventions like namespacing keys to reduce this risk.
