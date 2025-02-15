---
title: CommonGrants protocol v0.1.0
description: A specification for the CommonGrants protocol.
---

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [BCP 14](https://tools.ietf.org/html/bcp14), [RFC2119](https://www.rfc-editor.org/rfc/rfc2119.html), and [RFC8174](https://www.rfc-editor.org/rfc/rfc8174.html) when, and only when, they appear in all capitals, as shown here.

## Definitions

#### OpenAPI document

An OpenAPI document is a JSON or YAML document that conforms to the OpenAPI Specification, and provides a formal description of an API.

#### CommonGrants protocol

The CommonGrants protocol defines a set of REQUIRED API routes, operations, and schemas that a CommonGrants API MUST implement to be considered compliant. It also defines an OPTIONAL pattern for extending the base protocol with implementation-specific behavior.

#### API document

A CommonGrants API document is an OpenAPI document that conforms to the CommonGrants protocol and provides a formal description of a CommonGrants API. 

Developers SHOULD consider drafting their API document in TypeSpec, using the CommonGrants core library and CLI, and then compiling it to an OpenAPI document. This approach allows developers to take advantage of features such as intellisense and compile-time type checking.

#### CommonGrants API

A CommonGrants API is a software platform or system that implements a CommonGrants API document, with an OPTIONAL set of implementation-defined extensions.

#### Schemas

CommonGrants schemas formally describe how data SHALL be represented by a CommonGrants API. These schemas are defined using TypeSpec and compile to other formats, such as OpenAPI schemas and JSON schemas.

#### Routes and operations

CommonGrants routes and operations formally describe a standard set of API endpoints that a CommonGrants API MUST implement. These routes and operations are defined using TypeSpec and compile to an OpenAPI document.

#### Compliance

A given API is considered "compliant" with the CommonGrants protocol if

- It implements all of the REQUIRED routes and operations
- Any *implementation-defined* behavior follows the extension pattern outlined in the CommonGrants protocol
- Each valid input to an *implementation-defined* schema can be successfully validated against the corresponding CommonGrants schema

For examples of compliant and non-compliant implementations, see [Appendix A](#appendix-a-compliance-examples).

Developers SHOULD consider using the CommonGrants CLI to validate their API document and implementation against the CommonGrants protocol.

#### Implementation-defined behavior

Behavior described as _implementation-defined_ allows implementations to choose which of several different-but-compliant approaches to a requirement to implement. This highlights ways that CommonGrants APIs can tailor the protocol to their specific use case while still maintaining compatibility with other implementations.

## Specification

### Versions

The CommonGrants protocol is versioned using the `Major.Minor.Patch` versioning scheme, where:

- the `Major` version is incremented when backwards-incompatible changes are made to the protocol. These changes may include:
  - Adding new REQUIRED routes or operations;
  - Adding new REQUIRED fields to existing schemas;
  - Removing existing fields from existing schemas;
  - Removing an option from an existing enum field;
  - Changing the type of an existing field; or
  - Changing the protocol in other ways that would make existing CommonGrants APIs non-compliant.
- the `Minor` version is incremented when backwards-compatible changes are made to the protocol. These changes may include:
  - Adding new OPTIONAL routes or operations;
  - Adding new OPTIONAL fields to existing schemas;
  - Adding support for new base data types and fields;
  - Adding new options to existing enum fields; or
  - Making other changes that preserve compatibility with existing implementations but introduce new functionality.
- the `Patch` version is incremented when the protocol is updated in a backwards-compatible way that adds new optional functionality.
  - Updating the descriptions or metadata of existing routes, operations, and schemas in ways that don't change their behavior;
  - Fixing typos or other minor changes that don't affect the protocol's behavior; or
  - Making other changes that preserve compatibility with existing implementations but do not add new functionality.

### Schemas

#### Base types

The CommonGrants protocol defines the following set of scalar types that can be used to build more complex fields and models.

| Type                                                                                | Description                                               |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [string](/simpler-grants-protocol/reference/models/base-types#string)               | A sequence of characters                                  |
| [integer](/simpler-grants-protocol/reference/models/base-types#integer)             | A whole number without decimals                           |
| [isoTime](/simpler-grants-protocol/reference/models/base-types#isotime)             | A time on a clock, without a timezone, in ISO 8601 format |
| [isoDate](/simpler-grants-protocol/reference/models/base-types#isodate)             | A date on a calendar in ISO 8601 format                   |
| [isoDateTime](/simpler-grants-protocol/reference/models/base-types#isodatetime)     | A date and time with timezone in ISO 8601 format          |
| [uuid](/simpler-grants-protocol/reference/models/base-types#uuid)                   | A universally unique identifier                           |
| [decimalString](/simpler-grants-protocol/reference/models/base-types#decimalstring) | A decimal number encoded as a string                      |
| [url](/simpler-grants-protocol/reference/models/base-types#url)                     | A Uniform Resource Locator                                |

#### Core fields

The CommonGrants protocol defines the following set of core fields that are reused across different models.

| Model                                                                 | Description                                       |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| [Money](/simpler-grants-protocol/reference/models/money)              | A monetary amount with a currency code            |
| [Event](/simpler-grants-protocol/reference/models/event)              | A description of an event with an associated date |
| [CustomField](/simpler-grants-protocol/reference/models/custom-field) | A model for defining custom fields on a record    |
| [SystemMetadata](/simpler-grants-protocol/reference/models/metadata)  | System-managed metadata for records               |

#### Opportunity models

The CommonGrants protocol defines the following set of models that are specific to funding opportunities.

| Model                                                                         | Description                                               |
| ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| [OpportunityBase](/simpler-grants-protocol/reference/models/opportunity-base) | The core opportunity model that combines all other models |
| [OppStatus](/simpler-grants-protocol/reference/models/opp-status)             | The status of an opportunity                              |
| [OppFunding](/simpler-grants-protocol/reference/models/opp-funding)           | Details about the funding available for an opportunity    |
| [OppTimeline](/simpler-grants-protocol/reference/models/opp-timeline)         | Key dates in the opportunity's timeline                   |

### Routes and operations

The CommonGrants protocol defines the following set of routes and operations that are specific to funding opportunities.

| Route                                                                                              | Description                                                      |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`GET /opportunities`](/simpler-grants-protocol/reference/api/operations/opportunities_list/)      | Get a paginated list of opportunities sorted by `lastModifiedAt` |
| [`GET /opportunities/{id}`](/simpler-grants-protocol/reference/api/operations/opportunities_read/) | View details about a specific opportunity                        |

#### Pagination

API routes that are used to retrieve multiple records from a given resource SHOULD support pagination. Paginated routes MUST accept the following parameters, either as query parameters (for `GET` routes) or as OPTIONAL parameters at the root of the request body (for `POST` and `PUT` routes):

| Parameter  | Type    | Default | Description                                                 |
| ---------- | ------- | ------- | ----------------------------------------------------------- |
| `page`     | integer | 1       | The page number of the results to return, starting at 1     |
| `pageSize` | integer | 100     | The number of results to return per page, between 1 and 100 |

Additionally, the response body for paginated requests MUST include a `paginationInfo` property with the following properties:

| Property          | Type    | Required | Description                                               |
| ----------------- | ------- | -------- | --------------------------------------------------------- |
| `page`            | integer | Yes      | The page number of the results                            |
| `pageSize`        | integer | Yes      | The number of results per page                            |
| `totalItems`      | integer | Yes      | The total number of results across all pages              |
| `totalPages`      | integer | Yes      | The total number of pages of results                      |
| `nextPageUrl`     | url     | No       | The URL for the next page of results, if there is one     |
| `previousPageUrl` | url     | No       | The URL for the previous page of results, if there is one |

The paginated set of records MUST be returned in the `items` property of the response body.

#### Sorting

CommonGrants routes and operations that support sorting MUST accept the following parameters, either as query parameters (for `GET` routes) or as OPTIONAL parameters at the root of the request body (for `POST` and `PUT` routes):

| Parameter   | Type            | Description                            |
| ----------- | --------------- | -------------------------------------- |
| `sortBy`    | string          | The property to sort the results by    |
| `sortOrder` | `asc` or `desc` | The order in which to sort the results |

Additionally, the response body for sorted requests MUST include a `sortInfo` property with the following properties:

| Property    | Type   | Required | Description                                |
| ----------- | ------ | -------- | ------------------------------------------ |
| `sortBy`    | string | Yes      | The property that was sorted by            |
| `sortOrder` | string | Yes      | The order in which the results were sorted |
| `errors`    | array  | No       | Errors that occurred while sorting        |

If the protocol defines a minimum set of supported options for the `sortBy` parameter, then implementations MUST support these options. CommonGrants APIs MAY support additional *implementation-defined* options that are not defined in the protocol.

However, to preserve compatibility with other implementations, if a client includes a `sortBy` parameter with an unsupported value, the server SHOULD NOT return a non-2xx response code. Instead, the server SHOULD ignore the unsupported value and sort the results by the default property and only indicate the error in the `sortInfo.errors` property of the response body.


### Extensions

The CommonGrants protocol defines a mechanism for extending the base protocol that CommonGrants APIs can use to adapt the protocol to satisfy their specific use case.

#### Custom fields

CommonGrants APIs may need to include attributes that are not defined explicitly in the CommonGrants schemas. To support this use case, the CommonGrants protocol has defined a pattern for adding custom fields to certain models.

If a model supports custom fields, it MUST include an optional `customFields` property that is an object whose values MUST conform to the `CustomField` type. CommonGrants APIs MAY use this `customFields` property to define custom fields that are required by a given implementation.

For example if, to maintain compatibility with existing systems, a CommonGrants API needs to include an `id` field on each Opportunity record that is an `integer` instead of a `uuid` (as defined by the CommonGrants protocol), that API may update the *implementation-defined* schema for routes that require the `OpportunityBase` schema to the following:

```yaml
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

In this example, the CommonGrants API is extending the `OpportunityBase` model to include a `legacyId` custom field. The `legacyId` custom field is defined using the `CustomField` type, which is a model that describes a custom field.

*Implementation-defined* extensions of CommonGrants schemas MAY make the `customFields` property required (if the base schema already includes it as an optional property), but they SHALL NOT add a `customFields` property to a model that does not already have one.

Similarly, CommonGrants APIs SHALL NOT add any fields to a model outside of the `customFields` property. If a model does not include a `customFields` property, then it doesn't support extension through custom fields.

#### Custom enum values

Some CommonGrants schemas include fields whose values are drawn from a limited set of options, while also allowing CommonGrants APIs to set these fields to *implementation-defined* custom values. 

To support this use case, the CommonGrants protocol has defined a pattern for adding custom enum values to certain fields. If a field supports custom enum values, it MUST match an object with the following properties:

- `value`: a required string that includes `custom` as one of its enum values
- `customValue`: an optional string with the display value for the custom enum
- `description`: an optional string that describes how to interpret the custom value

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

For example, the `OpportunityBase` model includes a `status` field that can have one of several predefined values. When an opportunity's status is set to one of these predefined values, it MUST include the `value` property and SHOULD omit the `customValue` and `description` properties:

```json
{
  "id": "ad763210-5940-4c08-921c-17a8960fcf4b",
  "title": "Example Opportunity",
  // other fields omitted for brevity
  "status": {
    "value": "forecasted"
  }
} 
```

When an opportunity's status is set to an *implementation-defined* custom value, though, it MUST include the `customValue` and `description` properties as well:

```json
{
  "id": "ad763210-5940-4c08-921c-17a8960fcf4b",
  "title": "Example Opportunity",
  // other fields omitted for brevity
  "status": {
    "value": "custom",
    "customValue": "archived",
    "description": "Opportunity will no longer appear in search results, but will remain in the system for reporting purposes"
  }
} 
```

CommonGrants APIs SHALL NOT add custom enum values to any field that does not support them in the base protocol.

#### Custom routes

CommonGrants APIs MAY define custom routes that are not part of the core protocol. The path for these routes MUST be prefixed with `/custom/` to avoid conflicts with existing or future routes defined in the core protocol.

For example, a CommonGrants API that wants to support updating existing opportunities can define the following route:

```yaml
/custom/opportunities/{opportunityId}:
  put:
    summary: Update an opportunity
```

This pattern can also be used to maintain support for existing routes and operations that conflict with those defined by the CommonGrants protocol. For example, a CommonGrants API that wants to maintain support for an existing `GET /opportunities` route that doesn't conform to the `GET /opportunities` route defined by the CommonGrants protocol can continue to support that route by prefixing its path with `/custom/`:

```yaml
/custom/opportunities:
  get:
    summary: Get opportunities
```

In this way, CommonGrants APIs can support incremental adoption of the CommonGrants protocol by maintaining support for existing routes and operations while implementing the routes and operations defined by the protocol.

## Appendix A: Compliance examples
