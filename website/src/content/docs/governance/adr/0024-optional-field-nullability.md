---
title: Optional field nullability in the protocol spec and SDKs
description: ADR documenting the decision on whether optional fields in the CommonGrants protocol should be nullable at the spec level.
---

Both the Python SDK (`Optional[X]` via Pydantic) and the TypeScript SDK (`.nullish()` via Zod) currently render optional fields as nullable. This is intentional for cross-language compatibility, since Python's `Optional[X]` requires nullability. However, the base protocol spec (TypeSpec-generated) declares these fields as optional but non-nullable. Once the `resolveAnyOf()` bug in `cg check spec` is fixed (see [#735](https://github.com/HHS/simpler-grants-protocol/issues/735)), both SDK implementations will correctly fail validation because they add `nullable` where the protocol doesn't allow it. A decision is needed on whether the base protocol should align with the SDKs, or vice versa.

Experience from production grant data publishing systems highlights a subtlety that shapes this decision: `optional + nullable` is not sufficient on its own. Publishers need to express three distinct field states, not two:

| State                    | Meaning                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| Field absent             | "Not provided" — the publisher did not supply this data                 |
| Explicit N/A value       | "Doesn't apply" — the field is intentionally irrelevant for this record |
| Field present with value | "Has a value"                                                           |

The key insight is that the three-state model can be preserved under a nullable spec — but only if `null` and absent are given distinct, explicitly defined meanings. If `null` is defined as "doesn't apply" (an active publisher assertion) and field absence is defined as "not provided," the full semantic space is preserved for all field types, including scalars like dates where no natural sentinel value exists. This is not possible under a non-nullable spec, where scalar fields have no ergonomic way to express "doesn't apply."

## Decision

We've decided to make optional fields nullable in the base protocol (Option 1), with explicitly defined semantics for each field state. Field absence means "not provided." An explicit `null` means "doesn't apply" — the publisher actively asserts the field is irrelevant for this record. A present value means "has a value." The SDKs already reflect this model and require no changes.

| Wire representation | Meaning                                                              |
| ------------------- | -------------------------------------------------------------------- |
| Field absent        | "Not provided" — publisher did not supply this data                  |
| `null`              | "Doesn't apply" — publisher actively asserts the field is irrelevant |
| Value               | "Has a value"                                                        |

- **Positive consequences**
  - Preserves the full three-state semantic model for all field types, including scalars like dates where no sentinel value is practical
  - Matches current behavior of both SDKs — no SDK changes required
  - Publishers can actively assert "doesn't apply" on any field type using `null`
  - Aligns with OpenAPI 3.1 / JSON Schema nullable conventions
- **Negative consequences**
  - Requires clear documentation of the `null` vs. absent distinction — consumers must not treat them as equivalent
  - Slightly increases implementation burden on consumers, who must handle both absent and `null` and interpret them differently

### Criteria

- **Cross-language compatibility:** The solution should work naturally for Python, TypeScript, and future SDK implementations without requiring awkward workarounds.
- **Wire-format clarity:** It should be clear whether `null` and absent/omitted carry the same semantic meaning or differ.
- **Semantic expressiveness:** Publishers should be able to distinguish "not provided" from "doesn't apply" without ambiguity.
- **Backwards compatibility:** Existing implementations should not be unnecessarily broken.
- **Alignment with OpenAPI 3.1 / JSON Schema conventions:** The approach should follow established conventions for optional and nullable fields.

### Options considered

- **Option 1 — Make optional fields nullable in the base protocol**
- **Option 2 — Keep optional fields non-nullable; update the SDKs**
- **Option 3 — Allow both representations (treat `null` and absent as equivalent)**

## Evaluation

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                                 | Option 1 (nullable in spec) | Option 2 (non-nullable, fix SDKs) | Option 3 (allow both) |
| ---------------------------------------- | :-------------------------: | :-------------------------------: | :-------------------: |
| Cross-language compatibility             |             ✅              |                🟡                 |          ✅           |
| Wire-format clarity                      |             ✅              |                ✅                 |          ❌           |
| Semantic expressiveness                  |             ✅              |                🟡                 |          ❌           |
| Backwards compatibility                  |             ✅              |                ❌                 |          ✅           |
| Alignment with OpenAPI 3.1 / JSON Schema |             ✅              |                ✅                 |          🟡           |

### Option 1 — Make optional fields nullable in the base protocol

:::note[Bottom line]
Option 1 is best if:

- we want to preserve the full three-state semantic model across all field types, including scalars like dates
- and are willing to document and enforce the `null` vs. absent distinction in the spec and consumer guidance
  :::

Update the TypeSpec source to use nullable optionals, aligning with both SDKs. `null` and field absence are given distinct, protocol-defined meanings: `null` means "doesn't apply" and absence means "not provided." Publishers must actively send `null` to assert N/A — they cannot simply omit the field.

- **Pros**
  - Preserves the three-state semantic model for all field types, including dates and other scalars where sentinel values are impractical
  - Matches current behavior of both SDKs — no SDK changes required
  - Natural fit for Python (`Optional[X]`) and TypeScript (`.nullish()`)
- **Cons**
  - Requires clear, enforced documentation of the `null` vs. absent distinction — without it, consumers may treat them as equivalent and lose the semantic benefit
  - Slightly increases consumer implementation burden (must handle and distinguish both states)

### Option 2 — Keep optional fields non-nullable; update the SDKs

:::note[Bottom line]
Option 2 is best if:

- all optional fields in the protocol are numerics or categoricals where a sentinel value is practical
- but does not work for scalar types like dates, where no natural "doesn't apply" value exists
  :::

Both SDKs stop using `.nullish()` / `Optional[X]` and rely solely on field absence. The Python SDK would need a custom Pydantic config to omit `None` fields from serialization rather than sending `null`. Publishers use explicit sentinel values (zero for numerics, a `not_applicable` enum variant for categoricals) to assert "doesn't apply."

- **Pros**
  - `null` is never sent on the wire — no ambiguity between `null` and absent
  - Works well for numerics and categoricals where a sentinel value is natural
  - Aligns with OpenAPI 3.1 / JSON Schema conventions for non-nullable fields
- **Cons**
  - Does not solve the "doesn't apply" problem for scalar types like dates — no ergonomic sentinel exists
  - Requires changes to both SDKs and any existing implementations that send `null`
  - Python's `Optional[X]` is idiomatic for "may not be present" — working around it adds complexity

### Option 3 — Allow both representations

:::note[Bottom line]
Option 3 is best if:

- we want to maximize pragmatic compatibility across implementations
- but can accept a looser spec where `null` and absent are treated as semantically equivalent
  :::

The protocol accepts either an absent field or an explicit `null`. The `cg check spec` validator is updated to treat a `type: T` schema as compatible with `type: [T, "null"]`.

- **Pros**
  - No breaking changes for any existing implementation
  - Maximum flexibility for SDK authors
- **Cons**
  - Collapses "not provided" and "doesn't apply" into a single ambiguous state
  - Loosens the spec in a way that may hide real compatibility issues
  - Makes it harder to tighten the spec or introduce meaningful N/A semantics in the future
