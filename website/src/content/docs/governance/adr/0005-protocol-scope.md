---
title: Protocol design and scope
description: ADR documenting the decision to use FHIR as a mental model for the grant protocol.
---

We need to determine the scope of our grant protocol specification. Existing protocols range from simple data standards (like GeoJSON) to comprehensive specifications that include both data models and standardized operations (like FHIR and ActivityPub).

## Decision

We chose to adopt an approach inspired by **FHIR**, defining both standard models for grant data and a minimum set of client-to-server operations that grant platforms should support (e.g. searching for and applying to grant opportunities).

- **Positive consequences**
  - Enables third-parties to build tools that are interoperable with any platform that adopts the protocol.
  - Keeps the door open for standardizing server-to-server interactions in the future.
- **Negative consequences**
  - Doesn't provide a consistent pattern for sharing data _between_ platforms that adopt this protocol.
  - The protocol's client-to-server operations might be too complex for some grant platforms to adopt and too restrictive for others that want to support additional functionality.
  - Some grant platforms may be hesitant to adopt the protocol if the required operations differ significantly from their existing API.

### Criteria

- **Interoperability**: Make it easier for third-party developers to build tools that work with multiple grant platforms.
- **Scalability**: Make it easier to support a large number of grant platforms.
- **Flexibility**: Accommodate multiple use cases without compromising core specifications.
- **Ease of Adoption**: Simplicity to encourage widespread adoption by systems with limited resources.

### Options considered

- **Option 1:** Data standard only
- **Option 2:** Data standard and client-to-server operations
- **Option 3:** Data standard, client-to-server, and server-to-server operations

## Evaluation

### Side-by-side

| Criteria         | Option 1 | Option 2 | Option 3 |
| ---------------- | :------: | :------: | :------: |
| Interoperability |    🟡    |    ✅    |    ✅    |
| Scalability      |    ❌    |    ✅    |    ✅    |
| Flexibility      |    ✅    |    🟡    |    🟡    |
| Ease of Adoption |    ✅    |    ✅    |    ❌    |

### Option 1: Data standard only

Focus exclusively on data structure and semantics, without defining a standard set of operations for interacting with that data. GeoJSON is an example of standard that follows this approach.

For the grant protocol, this would look like defining a data model for grant opportunities, applications, and awards, but not standardizing how users search or apply for those opportunities.

- **Pros**
  - Simple and easy to adopt.
  - Minimal specification with room for implementer-defined workflows.
- **Cons**
  - Risk of inconsistent implementations.
  - No standardization around common operations like searching or applying for grants.
  - Makes it difficult to build fully interoperable tools.

### Option 2: Adding client-to-server operations

Define both a standardized data model and a minimum set of operations that a platform needs to support related to that data. FHIR is an example of a standard that follows this approach.

For the grant protocol, this would look like defining a data model for grant opportunities, applications, and awards, _and_ standardizing how users can search or apply for those opportunities. But it would not specify if/how grant systems would exchange data with one another.

- **Pros**
  - Increases the interoperability of grant platforms.
  - Provides clearer guidance for supporting common operations like searching and applying for grants.
- **Cons**
  - Increases the complexity of implementing the protocol.
  - Doesn't provide a standardized way to share data _between_ systems.
  - Standardizing API endpoints is more challenging than defining data standards.

### Option 3: Adding server-to-server operations

In addition to a standardized data model and client-to-server operations, expand the protocol to define server-to-server communication. ActivityPub is an example of a standard that follows this approach.

For the grant protocol, this would look like defining a data model for opportunities, applications, and awards; standardizing how users can search and apply for opportunities; and standardizing how opportunity and award data can be shared between grant platforms.

- **Pros**
  - Standardizes how data is exchanged between grant systems.
  - Encourages scalability and resilience, decreasing user reliance on a single grant platform.
- **Cons**
  - High design and implementation complexity.
  - Greater barrier to adoption due to increased requirements.
  - Some grant platforms may not want to share data with other systems.
