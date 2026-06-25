---
"@common-grants/core": minor
---

Add `BooleanComparisonFilter` and `IntegerComparisonFilter` to the core filter catalog (#895).
`BooleanComparisonFilter` compares a boolean value with `eq`/`neq`; `IntegerComparisonFilter`
compares an integer value with the full comparison + equivalence operator set. Both are added at
protocol version 0.3.0 and emitted to JSON Schema output.
