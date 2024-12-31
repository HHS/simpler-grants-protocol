---
title: Specification framework
description: ADR documenting the decision to use TypeSpec as the framework for defining the grant protocol and data standard.
---

## Summary

### Problem statement

We need a framework to define the specification for the grant protocol and data standard that prioritizes modularity, extensibility, validation, compatibility with developer tools, and widespread adoption.

### Decision outcome

We chose TypeSpec as the framework for defining the grant protocol and data standard, mainly for its ability to define types and API services using a modular approach that can transpile to more common formats like JSON schema and OpenAPI.

- **Positive consequences**
  - Enables us to use NPM as a distribution channel for custom fields and types, rather than rolling our own registry.
  - Provides built-in tools to transpile TypeSpec definitions to widely-used formats like JSON Schema and OpenAPI.
  - Enables us to build our own plugins with custom emitters and validators to support dev tooling for the protocol.
  - Intellisense and type safety features make it easier to catch bugs in the schema definitions.
- **Negative consequences**
  - Less common as a standard format than JSON Schema or OpenAPI.
  - Steeper learning curve compared to simpler formats.
  - Requires more upfront setup for developer tooling.

### Decision drivers

- **Validation** - Specification format can be used to validate that implementations comply with the standard.
- **Modularity** - Specification components can be broken into reusable modules.
- **Extensibility** - Supports adding stricter validations and additional fields.
- **Compatibility** - Compatible with existing developer tools and programming languages.
- **Popularity** - Familiar to developers and widely used.

### Options considered

- **JSON Schema** - [JSON Schema](https://json-schema.org/) is a vocabulary that allows you to annotate and validate JSON documents, widely used for defining validation rules and schemas in APIs and configuration files.
- **OpenAPI** - [OpenAPI](https://swagger.io/specification/) is a standard for defining HTTP-based APIs, focusing on API design, documentation, and client/server code generation.
- **TypeSpec** - [TypeSpec](https://microsoft.github.io/typespec/) is designed for defining data models and services with modularity and extensibility, compiling into multiple output formats like JSON Schema and OpenAPI.
- **Protobuf** - [Protocol Buffers](https://protobuf.dev/) is a language-neutral mechanism for serializing structured data, optimized for high-performance communication and compact storage, often used in gRPC.
- **GraphQL Schema** - [GraphQL](https://graphql.org/) is a query language and schema definition format designed for APIs, focusing on data querying, flexibility, and efficiency in fetching nested data structures.

## Evaluation

### Side-by-side

| Criteria      | JSON Schema | TypeSpec | OpenAPI | Protobuf | GraphQL |
| ------------- | :---------: | :------: | :-----: | :------: | :-----: |
| Validation    |     ✅      |    ✅    |   ✅    |    🟡    |   🟡    |
| Modularity    |     🟡      |    ✅    |   🟡    |    🟡    |   🟡    |
| Extensibility |     🟡      |    ✅    |   🟡    |    🟡    |   🟡    |
| Compatibility |     ✅      |    🟡    |   ✅    |    ✅    |   🟡    |
| Popularity    |     ✅      |    🟡    |   ✅    |    ✅    |   ✅    |

### Option 1: JSON Schema

:::note[Bottom line]
JSON Schema is best if:

- we want to focus on defining a common standard for grant data
  regardless of how it's transported (e.g. REST, GraphQL)
- but we can compromise on the modularity and extensibility of that standard
  :::

- **Pros**
  - Simple and widely adopted.
  - Extensive support in developer tools.
- **Cons**
  - Limited modularity.
  - No central NPM-like registry for JSON schemas.
  - Harder to extend existing schemas or enforce stricter validations without full rewrite.
  - Lacks the strong type safety and intellisense features of TypeSpec.

### Option 2: TypeSpec

:::note[Bottom line]
TypeSpec is best if:

- we wanted to define a modular and extensible data standard,
  with multiple transport formats (e.g. REST, protobuf, etc.)
- but can compromise on popularity and ease of setup
  :::

- **Pros**
  - Optimized for modular and reusable components.
  - Transpiles to JSON Schema, OpenAPI, and protobuf.
  - Strong type safety and IntelliSense support.
  - Easily extensible with custom tools.
- **Cons**
  - Less popular and less widely known.
  - Steeper learning curve than JSON Schema or OpenAPI.
  - Requires additional setup for tooling.

### Option 3: OpenAPI

:::note[Bottom line]
OpenAPI _might_ make sense if:

- we wanted to define a common standard for transmitting grant data via REST API
- but can compromise on extensibility and modularity of the spec
  :::

- **Pros**
  - Popular format for RESTful APIs.
  - Extensive ecosystem of tools.
- **Cons**
  - Not optimized for modularity or extensibility.
  - Focused more on defining API specs for individual services, rather than common data standards.

### Option 4: Protobuf

:::note[Bottom line]
Protobuf _might_ make sense if:

- we wanted to define a unified serialization and transport service for grant data,
- but it isn't well suited for defining a common standard across multiple
  implementations or non protobuf services (e.g. REST or GraphQL)
  :::

- **Pros**
  - Compact and fast format for data serialization.
  - Optimized for communication between microservices.
- **Cons**
  - Limited support for schema validation.
  - Focuses on defining serialization for a single service, rather a common data standard.

### Option 5: GraphQL Schema

:::note[Bottom line]
Defining a GraphQL schema _might_ make sense if:

- we wanted to provide a single unified GraphQL API for querying grant data,
- but it isn't well suited for defining a common standard across multiple
  implementations or non-GraphQL APIs.
  :::

- **Pros**
  - Optimized for providing a flexible interface for querying APIs.
  - Popular and widely adopted, though less common than REST.
  - Defines a unified data schema with strong type safety.
- **Cons**
  - Focused on defining API schemas for a single implementation, rather than a common data standard.
  - Lacks native extensibility for reusable modules.
  - Only applies to GraphQL APIs, not to REST APIs.

## Conclusion

TypeSpec is the best fit for defining the grant protocol and data standard, as it provides modularity, extensibility, and compatibility with existing formats like JSON Schema and OpenAPI. Despite its lower popularity and steeper learning curve, its flexibility and tooling support make it well-suited for the project’s needs.
