---
title: "API Route Status"
description: "ADR documenting the use of OpenAPI tags to indicate the required status of an API route"
---

We need a way to indicate the status of an API route (e.g. required, optional, experimental) in our OpenAPI spec that is machine-readable, easy to render and maintain, and self-documenting.

## Decision

As described in our specification, we chose to use tags to categorize API routes into three main statuses:

- **Required:** Stable endpoints that adopters MUST implement
- **Optional:** Stable endpoints that adopters MAY implement
- **Experimental:** Non-stable endpoints that adopters MAY implement to provide feedback

**Positive consequences**

- Allows us to use the standard OpenAPI rendering tools like Swagger, RapiDoc, etc. without any customizations
- Allows us to use standard OpenAPI parsers like `swagger-parser` without any customizations
- Allows us to validate API implementations against a single spec, instead of multiple
- Only requires maintaining or updating a single spec per API version
- Enables OpenAPI spec consumers to understand the meaning of required status from the OpenAPI spec itself

**Negative consequences**

- Causes routes to be listed twice (may be a feature or a bug depending on how you look at it)
- Overloads the use of tags in the OpenAPI spec

### Criteria

- **Machine-readable:** Clearly identifies route status in a machine-readable way.
- **Easy-to-render:** Clearly identifies route status in the human-readable rendering of OpenAPI spec (e.g. via Swagger docs)
- **Tool compatible:** Recognized by and compatible with most standard OpenAPI tooling (e.g. swagger-parser)
- **Maintainable:** Easy to maintain and version alongside other API changes over time.
- **Adopter DX:** Easy for adopters to reference a single spec when consuming, implementing, or validating against the protocol.
- **Self documenting:** Clearly documents how to interpret required status in the OpenAPI spec itself.
- **Scalable:** Easily supports additional statuses in the future, if needed.

### Options considered

- **Tags** - Use the standard `tags` field in the OpenAPI spec to categorize routes into three main categories
- **Custom extensions** - Create a new extension field `x-status` in the OpenAPI spec to document the status of a route
- **Separate specs** - Create a separate spec for each status

## Evaluation

### Side-by-side comparison

| Criteria         | Tags | Extensions | Separate specs |
| ---------------- | :--: | :--------: | :------------: |
| Machine-readable |  ✅  |     ✅     |       ✅       |
| Easy-to-render   |  ✅  |     ❌     |       ✅       |
| Tool compatible  |  ✅  |     ❌     |       ✅       |
| Maintainable     |  ✅  |     ✅     |       ❌       |
| Adopter DX       |  🟡  |     🟡     |       ❌       |
| Self documenting |  ✅  |     🟡     |       ✅       |
| Scalable         |  ✅  |     ✅     |       ❌       |

### Tags

Use the standard `tags` field in the OpenAPI spec to categorize routes into three main categories:

- `required` (e.g. `tags: [required]`)
- `optional` (e.g. `tags: [optional]`)
- `experimental` (e.g. `tags: [experimental]`)

Each tag would have a description that explains the meaning of the tag.

:::note[Bottom line]
This is the best option if:

- We want to identify route status in a self-documenting way that is compatible with standard OpenAPI rendering and parsing tools,
- But we’re okay with overloading the use of a standard OpenAPI spec feature.
  :::

- **Pros**
  - Supported by standard OpenAPI rendering tools like Swagger, RapiDoc, etc. (e.g. Swagger UI will render tags as a collapsible section)
  - Supported by standard OpenAPI parsers like `swagger-parser` (e.g. `swagger-parser` will parse tags as a list of strings)
  - Enables us to validate API implementations against a single spec, instead of multiple
  - Only requires maintaining or updating a single spec per API version
  - Self-documenting - Descriptions of tags can be used to explain the meaning of required status
  - Scales well to support additional statuses in the future, if needed
- **Cons**
  - Causes routes to be listed twice (may be a feature or a bug depending on how you look at it)
  - Overloads the use of tags in the OpenAPI spec
  - Each tag section might get cluttered if we have a lot of routes

### Extensions

Create a new extension field `x-status` in the OpenAPI spec to categorize routes into three main categories:

- `required` (e.g. `x-status: required`)
- `optional` (e.g. `x-status: optional`)
- `experimental` (e.g. `x-status: experimental`)

Each status would have a description that explains the meaning of the status.

:::note[Bottom line]
This is the best option if:

- We want to identify route status in a machine-readable way that avoids overloading a standard OpenAPI spec feature,
- But we can compromise on direct compatibility with standard OpenAPI tooling or are willing to add custom tooling to support it.
  :::

- **Pros**
  - Allows us to validate API implementations against a single spec, instead of multiple
  - Only requires maintaining or updating a single spec per API version
  - Scales well to support additional statuses in the future, if needed
  - Avoids overloading the use of tags in the OpenAPI spec
- **Cons**
  - Not easily supported by standard OpenAPI rendering tools like Swagger, RapiDoc, etc.
  - Not easily supported by standard OpenAPI parsers like `swagger-parser`
  - Not as self-documenting as tags or separate specs, unless we were to add a `description` attribute to the extension field

### Separate specs

Create a separate spec for each status.

:::note[Bottom line]
This is the best option if:

- We want to clearly separate routes by status while still being able to use standard OpenAPI tooling without overloading standard OpenAPI spec features,
- But we’re willing to accept the overhead of maintaining multiple specs per API version and asking adopters to reference multiple specs for implementation or validation.
  :::

- **Pros**
  - Supports all standard OpenAPI tooling without customizations (e.g. each spec can be rendered independently)
  - Avoids overloading the use of tags in the OpenAPI spec
  - Self-documenting - Each spec’s top-level description can be used to explain the meaning of required status
- **Cons**
  - Requires maintaining multiple specs per API version
  - Requires adopters to reference multiple specs for during implementation or validation
  - Becomes exponentially more complex to maintain as the number of statuses increases
