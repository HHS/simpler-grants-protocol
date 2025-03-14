---
title: Protocol compliance
description: ADR documenting the decision to define compliance as implementing all required routes and models.
---

In addition to defining the protocol, we need to define what it means to “comply” with that protocol. This definition should guarantee some consistency across implementations, while also enabling platforms to extend the spec to meet their unique needs.

## Decision

We define compliance as implementing all required models and routes from the base spec while allowing implementations to support additional routes and models outside the spec.

- **Positive consequences**
  - Provides a guarantee that all implementation support a minimum set of operations.
  - Allows platforms the flexibility to extend the protocol for unique use cases.
- **Negative consequences**
  - Platforms may implement conflicting or incompatible extensions without additional governance.
  - It may be harder to define the protocol and test for compliance using this definition.
  - Some platforms may be hesitant to start adopting the protocol if they can't implement all required routes.

### Decision drivers

- **Adoption:** Enable incremental adoption by allowing platforms to gradually integrate and replace existing components with the protocol.
- **Interoperability:** Ensure platforms implementing the protocol can interoperate seamlessly using shared core models and routes.
- **Flexibility:** Allow platforms to extend functionality to meet unique requirements without breaking compliance.
- **Consistency:** Prevent partial implementations of the core specification, ensuring a consistent baseline.

### Options considered

- **Strict implementation:** APIs must implement the base spec exactly as defined.
- **Full implementation with extensions:** APIs must implement all required routes from the base spec (with approved extensions), and may also define additional routes.
- **Partial implementation:** APIs only need to implement a subset of required routes.

## Evaluation

### Side-by-side

| Criteria         | Option 1 | Option 2 | Option 3 |
| ---------------- | :------: | :------: | :------: |
| Adoption         |    ❌    |    🟡    |    ✅    |
| Interoperability |    ✅    |    🟡    |    🟡    |
| Flexibility      |    ❌    |    ✅    |    ✅    |
| Consistency      |    ✅    |    ✅    |    ❌    |

### Option 1: Strict implementation

The API implementation must match the base spec exactly.

:::note[Bottom line]
Option 1 is best if:

- we want strict adherence to the base specification.
- but can compromise on flexibility for extensions.
  :::

- **Pros**
  - Simplifies validation since all inputs align with the base spec.
  - Ensures strict adherence to the base specification.
- **Cons**
  - Restricts platforms from extending the protocol to address unique use cases.
  - Limits innovation and scalability.

### Option 2: Full implementation with extensions

The API implementation includes all required routes from the base spec (with approved extensions). It may also define additional routes that are not specified in the base spec, as long as they don't conflict with the base spec.

:::note[Bottom line]
Option 2 is best if:

- we want to balance adherence to the base spec with flexibility for extensions.
- but can accept potential divergence in unsupported extensions.
  :::

- **Pros**
  - Balances adherence to the base spec with flexibility for extensions.
  - Encourages innovation while maintaining compatibility with the base spec.
  - Guarantees that a minimum set of operations are supported by each implementation.
- **Cons**
  - Increases the risk of future conflicts as more operations are added to the base spec.
  - Makes compliance testing slightly more complex

### Option 3: Partial implementation

The API implementation doesn't have to implement all required routes and models, but the routes and models it implements can't conflict with the base spec.

:::note[Bottom line]
Option 3 is best if:

- we want to maximize flexibility for unique implementations.
- but can accept partial adoption of the spec.
  :::

- **Pros**
  - Offers maximum flexibility for platforms to define their own functionality.
  - Supports a wide range of use cases without restricting innovation.
  - Supports incremental adoption of the protocol.
- **Cons**
  - Increases the risk of non-interoperable implementations.
  - Provides no guarantees to users that an implementation supports certain operations.
  - Makes compliance testing more complex.
