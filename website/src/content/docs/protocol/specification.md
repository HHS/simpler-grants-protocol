---
title: CommonGrants protocol v0.1.0
description: A specification for the CommonGrants protocol.
---

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [BCP 14](https://tools.ietf.org/html/bcp14), [RFC2119](https://www.rfc-editor.org/rfc/rfc2119.html), and [RFC8174](https://www.rfc-editor.org/rfc/rfc8174.html) when, and only when, they appear in all capitals, as shown here.

## Definitions

#### CommonGrants protocol

The CommonGrants protocol defines a set of REQUIRED API routes, operations, and schemas that a CommonGrants API MUST implement to be considered compliant. It also defines an OPTIONAL pattern for extending the base protocol with implementation-specific behavior.

#### OpenAPI document

An OpenAPI document is a JSON or YAML document that conforms to the [OpenAPI Specification](https://swagger.io/specification/) and formally describes an API.

#### API document

A CommonGrants API document is an OpenAPI document that conforms to the CommonGrants protocol and formally describes the routes and operations of a CommonGrants API.

Developers MAY draft their API document in TypeSpec, using the [CommonGrants core library](https://www.npmjs.com/package/@common-grants/core) and [CLI](https://www.npmjs.com/package/@common-grants/cli), before compiling it to an OpenAPI document. This approach allows developers to leverage features such as intellisense and compile-time checks that increase the likelihood of compliance with the CommonGrants protocol.

#### CommonGrants API

A CommonGrants API is a software platform or system that implements all of the REQUIRED CommonGrants routes and operations, with an OPTIONAL set of _implementation-defined_ extensions.

#### Routes and operations

CommonGrants routes and operations provide a formal description of CommonGrants API endpoints and the actions they perform, standardizing the interface between a CommonGrants API and its clients. These routes and operations are defined using TypeSpec and compile to an OpenAPI document.

There are three main categories of routes and operations:

- Required routes that are stable and MUST be implemented.
- Optional routes that are stable and MAY be implemented, but are NOT REQUIRED.
- Experimental routes that are unstable, intended for feedback, and are NOT REQUIRED.

#### Schemas

CommonGrants schemas formally describe how data SHOULD be represented within a CommonGrants API route or operation. These schemas are defined using TypeSpec and compile to other formats, such as OpenAPI schemas and JSON schemas.

Some CommonGrants schemas can be modified to support _implementation-defined_ behavior.

#### Implementation-defined behavior

The protocol categorizes certain behaviors as _implementation-defined_, which means that CommonGrants APIs have modified the default behavior using a protocol-defined extension pattern. This pattern allows implementations to support custom functionality while maintaining consistency and compatibility with other CommonGrants APIs.

#### Compliance

An API is "compliant" with the CommonGrants protocol if:

- It correctly implements all required routes and operations, with inputs and outputs that conform to the corresponding CommonGrants schemas
- It does not implement any API endpoints that directly conflict with the optional routes and operations defined by the protocol
- It follows the guidelines outlined in the CommonGrants protocol for all _implementation-defined_ extensions of any default routes, operations, and schemas

Developers MAY use the [CommonGrants CLI](https://www.npmjs.com/package/@common-grants/cli) to validate their API document and implementation against the CommonGrants protocol.

:::note
The requirements for compatibility do not extend to experimental routes and operations, since these are intended for feedback and are not yet stable.
:::

## Specification

### Versions

The CommonGrants protocol follows the `Major.Minor.Patch` versioning scheme, where:

- the `Major` version is incremented when backwards-incompatible changes are made to the protocol. These changes may include:
  - Adding new required routes or operations;
  - Adding new required fields to existing schemas;
  - Removing existing fields from existing schemas;
  - Removing an option from an existing enum field;
  - Changing the type of an existing field; or
  - Changing the protocol in other ways that would make existing CommonGrants APIs non-compliant.
- the `Minor` version is incremented when backwards-compatible changes are made to the protocol. These changes may include:
  - Adding new optional routes or operations;
  - Adding new optional fields to existing schemas;
  - Adding new options to existing enum fields; or
  - Making other changes that introduce new functionality without making existing implementations non-compliant.
- the `Patch` version is incremented when the protocol is updated in a backwards-compatible way that adds new optional functionality.
  - Updating the descriptions or metadata of existing routes, operations, and schemas in ways that don't change their behavior;
  - Fixing typos or other minor changes that don't affect the protocol's behavior; or
  - Making other changes that neither introduce new functionality nor make existing implementations non-compliant.

:::caution
Because experimental routes and operations are considered unstable, breaking changes can be made to these routes and operations without incrementing the `Major` version.
:::

### Schemas

#### Base types

**String types**

| Type                                                                    | Description                      |
| ----------------------------------------------------------------------- | -------------------------------- |
| [string](/simpler-grants-protocol/protocol/schemas/types/string#string) | A sequence of characters         |
| [uuid](/simpler-grants-protocol/protocol/schemas/types/string#uuid)     | A universally unique identifier  |
| [url](/simpler-grants-protocol/protocol/schemas/types/string#url)       | A Uniform Resource Locator (URL) |

**Numeric types**

| Type                                                                                   | Description                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [numeric](/simpler-grants-protocol/protocol/schemas/types/numeric#numeric)             | A number with an arbitrary precision and scale         |
| [integer](/simpler-grants-protocol/protocol/schemas/types/numeric#integer)             | A whole number without decimals                        |
| [decimalString](/simpler-grants-protocol/protocol/schemas/types/numeric#decimalstring) | A decimal number encoded as a string to preserve scale |

**Date and time types**

| Type                                                                                  | Description                                                           |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [isoTime](/simpler-grants-protocol/protocol/schemas/types/date#isotime)               | Time without timezone in ISO 8601 format (HH:mm:ss)                   |
| [isoDate](/simpler-grants-protocol/protocol/schemas/types/date#isodate)               | Calendar date in ISO 8601 format (YYYY-MM-DD)                         |
| [utcDateTime](/simpler-grants-protocol/protocol/schemas/types/date#utcdatetime)       | Datetime with UTC timezone in ISO 8601 format (YYYY-MM-DDThh:mm:ssZ)  |
| [offsetDateTime](/simpler-grants-protocol/protocol/schemas/types/date#offsetdatetime) | Datetime with timezone in ISO 8601 format (YYYY-MM-DDThh:mm:ss±hh:mm) |

**Other types**

| Type                                                                     | Description                     |
| ------------------------------------------------------------------------ | ------------------------------- |
| [boolean](/simpler-grants-protocol/protocol/schemas/types/other#boolean) | A true or false value           |
| [array](/simpler-grants-protocol/protocol/schemas/types/other#array)     | An ordered list of values       |
| [record](/simpler-grants-protocol/protocol/schemas/types/other#record)   | A collection of key-value pairs |
| [null](/simpler-grants-protocol/protocol/schemas/types/other#null)       | A null value                    |
| [unknown](/simpler-grants-protocol/protocol/schemas/types/other#unknown) | A value of with any type        |

#### Core fields

The CommonGrants protocol defines the following fields that are reused across models:

| Field                                                                        | Description                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------- |
| [Money](/simpler-grants-protocol/protocol/schemas/fields/money)              | A monetary amount with a currency code            |
| [Event](/simpler-grants-protocol/protocol/schemas/fields/event)              | A description of an event with an associated date |
| [CustomField](/simpler-grants-protocol/protocol/schemas/fields/custom-field) | A model for defining custom fields on a record    |
| [SystemMetadata](/simpler-grants-protocol/protocol/schemas/fields/metadata)  | System-managed metadata for records               |

#### Opportunity models

The CommonGrants protocol defines the following models that are specific to funding opportunities:

| Model                                                                         | Description                                               |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| [OpportunityBase](/simpler-grants-protocol/protocol/schemas/opportunity/base) | The core model for a funding opportunity                  |
| [OppStatus](/simpler-grants-protocol/protocol/schemas/opportunity/status)     | The status of an opportunity                              |
| [OppFunding](/simpler-grants-protocol/protocol/schemas/opportunity/funding)   | Details about the funding available for an opportunity    |
| [OppTimeline](/simpler-grants-protocol/protocol/schemas/opportunity/timeline) | Key dates in the opportunity's timeline                   |

### Routes and operations

The CommonGrants protocol defines the following routes and operations that are specific to funding opportunities:

| Route                                                                                             | Description                                                      |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`GET /opportunities`](/simpler-grants-protocol/protocol/api/operations/opportunities_list/)      | Get a paginated list of opportunities sorted by `lastModifiedAt` |
| [`GET /opportunities/{id}`](/simpler-grants-protocol/protocol/api/operations/opportunities_read/) | View details about a specific opportunity                        |

#### Pagination

CommonGrants routes that return multiple records from a resource SHOULD support pagination. Paginated routes SHOULD accept the following parameters, either as query parameters (for `GET` routes) or as optional parameters at the root of the request body (for `POST` and `PUT` routes):

| Parameter  | Type    | Default | Description                                       |
| ---------- | ------- | ------- | ------------------------------------------------- |
| `page`     | integer | 1       | The page number to return, starting at 1          |
| `pageSize` | integer | 100     | The number of results per page, between 1 and 100 |

Additionally, the response body for paginated requests SHOULD include a `paginationInfo` property with the following:

| Property          | Type    | Required | Description                                               |
| ----------------- | ------- | -------- | --------------------------------------------------------- |
| `page`            | integer | Yes      | The page number of the results                            |
| `pageSize`        | integer | Yes      | The number of results per page                            |
| `totalItems`      | integer | Yes      | The total number of results across all pages              |
| `totalPages`      | integer | Yes      | The total number of pages of results                      |
| `nextPageUrl`     | url     | No       | The URL for the next page of results, if there is one     |
| `previousPageUrl` | url     | No       | The URL for the previous page of results, if there is one |

The response body for paginated requests SHOULD return the paginated set of records in the `items` property.

#### Sorting

CommonGrants routes that support sorting SHOULD accept the following parameters, either as query parameters (for `GET` routes) or as optional parameters at the root of the request body (for `POST` and `PUT` routes):

| Parameter      | Type            | Description                                            |
| -------------- | --------------- | ------------------------------------------------------ |
| `sortBy`       | string          | The property to use to sort the results                |
| `customSortBy` | string          | The _implementation-defined_ sort value, if applicable |
| `sortOrder`    | `asc` or `desc` | The order in which to sort the results                 |

Additionally, the response body for sorted requests SHOULD include a `sortInfo` property with the following:

| Property       | Type            | Required | Description                                                                  |
| -------------- | --------------- | -------- | ---------------------------------------------------------------------------- |
| `sortBy`       | string          | Yes      | The property used to sort the results, or `custom` if a custom sort was used |
| `customSortBy` | boolean         | No       | The custom sort value used, if applicable                                    |
| `sortOrder`    | `asc` or `desc` | Yes      | The order in which the results were sorted                                   |
| `errors`       | array           | No       | Errors that occurred while sorting                                           |

If the protocol specifies a minimum set of `sortBy` options, implementations MUST support them. APIs MAY support additional _implementation-defined_ options using the `customSortBy` parameter.

To maintain compatibility, if a client uses an unsupported `customSortBy` value, the API SHOULD NOT return a non-2xx response. Instead, it SHOULD default to the standard `sortBy` value and note the error in `sortInfo.errors`.

### Extensions

The CommonGrants protocol defines the following mechanisms for extending the base protocol with _implementation-defined_ behavior:

#### Custom fields

CommonGrants APIs may need to support attributes that are not explicitly included in the default schemas. To support this, the CommonGrants protocol has defined a pattern for adding custom fields to certain models, e.g. `OpportunityBase`.

If a model supports custom fields, it MUST include an optional `customFields` property, an object whose values MUST conform to the `CustomField` type. CommonGrants APIs MAY use this `customFields` property to define custom fields for its implementation of that model.

For example, to maintain compatibility with existing systems, a CommonGrants API might need each Opportunity record to have an `id` field that is an integer instead of a `uuid`. This API can create an _implementation-defined_ version of the `OpportunityBase` schema with the following:

```yaml {16-37}
type: object
properties:
  id:
    type: string
    examples:
      - 30a12e5e-5940-4c08-921c-17a8960fcf4b
    format: uuid
    description: Globally unique id for the opportunity
  title:
    type: string
    description: Title or name of the funding opportunity
  # other fields omitted for brevity
  customFields:
    type: object
    properties:
      legacyId:
        type: object
            properties:
            name:
                type: string
                const: Legacy ID
            type:
                type: string
                const: number
            value:
                type: integer
                examples:
                - 12345
            description:
                type: string
                const: An integer ID for the opportunity, needed for compatibility with legacy systems
            required:
            - name
            - type
            - value
    required:
      - legacyId
required:
  - id
  # other required fields omitted for brevity
  - customFields
```

In this example, the API extends the OpportunityBase model to include a `legacyId` custom field, defined using the `CustomField` type.

_Implementation-defined_ extensions MAY make the `customFields` property required if the base schema includes it as optional, but SHALL NOT add a `customFields` property to a model that lacks one.

Similarly, APIs SHALL NOT add fields outside the `customFields` property. If a model lacks a `customFields` property, it doesn't support extension through custom fields.

#### Custom enum values

Some CommonGrants schemas have fields that accept values from a limited set of options, known as "enums". Occasionally, APIs need to set these fields to _implementation-defined_ custom values.

To support this, the protocol defines a pattern for custom enum values. If a field supports custom enum values, it MUST match an object with these properties:

- `value`: a required string that includes `custom` as one of its enum values
- `customValue`: an optional string with the display value for the custom enum
- `description`: an optional string that describes how to interpret the custom enum

```yaml
properties:
  value:
    type: string
    enum:
      # other enum values added here
      - custom
  customValue:
    type: string
    description: The display value for the custom enum
  description:
    type: string
    description: A human-readable description of the value
required:
  - value
```

For example, the `OpportunityBase` model includes a `status` with predefined values (e.g. `forecasted`, `closed`). When an opportunity's status is set to one of these predefined values, it MUST include the `value` property and SHOULD omit the `customValue` and `description` properties:

```json
{
  "id": "ad763210-5940-4c08-921c-17a8960fcf4b",
  "title": "Example Opportunity",
  // other OpportunityBase fields omitted for brevity
  "status": {
    "value": "forecasted"
  }
}
```

When set to a custom value, it SHOULD include `customValue` and `description`:

```json
{
  "id": "ad763210-5940-4c08-921c-17a8960fcf4b",
  "title": "Example Opportunity",
  // other OpportunityBase fields omitted for brevity
  "status": {
    "value": "custom",
    "customValue": "archived",
    "description": "Opportunity will no longer appear in search results, but will remain in the system for reporting purposes"
  }
}
```

CommonGrants APIs SHALL NOT add custom enum values to any field that does not support them in the base protocol.

#### Custom routes

CommonGrants APIs MAY define custom routes that are not part of the core protocol. The path for these routes MUST be prefixed with `/custom/` to avoid conflicts with existing or future protocol routes.

For example, to allow clients to update existing opportunity records, an API can define this route:

```yaml
/custom/opportunities/{opportunityId}:
  put:
    summary: Update an opportunity
```

This pattern can also be used to maintain support for existing routes that conflict with those defined by the protocol. For example, an API can maintain a non-conforming `GET /opportunities` route by prefixing it with `/custom/`:

```yaml
/custom/opportunities:
  get:
    summary: Get opportunities
```

This allows APIs to incrementally adopt the CommonGrants protocol while supporting existing routes and operations.
