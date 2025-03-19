---
title: Custom routes
description: ADR documenting the approach to supporting custom routes in the CommonGrants protocol.
---

The CommonGrants protocol needs to provide a mechanism for APIs to define custom routes while ensuring compatibility with standard routes. This mechanism should balance ease of adoption, validation, and future compatibility.

## Decision

All protocol-defined routes should be prefixed with `/common-grants/` and custom routes can be defined at the root level without any prefix.

- **Positive consequences**
  - Makes it easier to incrementally adopt the protocol.
  - Provides clear separation between standard and non-standard routes.
  - Enables endpoint "shadowing" to support both compliant and non-compliant versions of protocol-defined routes.
- **Negative consequences**
  - Slightly more complex routing logic for API implementations.
  - Requires clients to be aware of the `/common-grants/` namespace.
  - May be more confusing for APIs that don't use custom routes.

### Criteria

- Supports incremental adoption of protocol-defined routes.
- Ensures ease of validation against the base protocol.
- Enables endpoint "shadowing" to support both compliant and non-compliant versions of protocol-defined routes.

### Options considered

- No support for custom routes
- Custom and standard routes exist at the same level (no prefix needed)
- Prefix custom routes with `/custom/`
- Prefix protocol-defined routes with `/common-grants/`

## Evaluation

### Side-by-side comparison

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria             | No support | No prefix needed | Prefix custom routes | Prefix protocol routes |
| -------------------- | :--------: | :--------------: | :------------------: | :--------------------: |
| Incremental adoption |     ❌     |        ✅        |          🟡          |           ✅           |
| Ease of validation   |     ✅     |        ❌        |          ✅          |           ✅           |
| Endpoint "shadowing" |     ❌     |        ❌        |          ✅          |           ✅           |

### Option 1: No support

:::note[Bottom line]
No support for custom routes is best if:

- We want strict adherence to the standard protocol.
- But can compromise on flexibility for implementations.
  :::

- **Pros**
  - Simplifies validation against the base protocol.
  - Ensures all implementations are fully compatible.
- **Cons**
  - Does not support incremental adoption.
  - Limits flexibility for implementations with unique needs.

### Option 2: No prefix needed

:::note[Bottom line]
Custom and standard routes at the same level are best if:

- We want maximum flexibility for API implementations.
- But can compromise on validation and avoiding conflicts.
  :::

- **Pros**
  - Most flexible approach, allowing implementations to define custom routes freely.
  - No need for additional prefixes or modifications.
- **Cons**
  - Harder to validate against the base protocol.
  - Risk of naming conflicts with future standard routes.
  - Can create compatibility issues when merging implementations.

### Option 3: Prefix custom routes

:::note[Bottom line]
The `/custom/` prefix is best if:

- We want to clearly distinguish custom from standard routes.
- We're okay with requiring clients to change the path of existing routes.
  :::

- **Pros**
  - Provides clear separation between standard and non-standard routes.
  - Ensures that protocol validation can be performed efficiently.
  - Allows for incompatible versions of endpoints without interfering with standard functionality.
- **Cons**
  - Slightly more complex routing logic for API implementations.
  - Requires all clients to be aware of the `/custom/` namespace.

### Option 4: Prefix protocol-defined routes

:::note[Bottom line]
The `/common-grants/` prefix is best if:

- We want to maximize for incremental adoption and ease of implementation.
- We're okay with having a prefix on all standard routes, even without custom routes.
  :::

- **Pros**
  - Provides explicit scoping for protocol-defined endpoints.
  - Guarantees that all endpoints conform to a single standard namespace.
- **Cons**
  - Makes less sense if we don't have custom routes.
  - May frame protocol-defined routes as a special case, rather than the default.
