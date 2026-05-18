---
"@common-grants/core": patch
"@common-grants/cli": patch
"@common-grants/sdk": patch
---

Document Node 22 as the minimum supported runtime via `engines.node: ">=22.0.0"`. TypeSpec 1.12+ requires Node 22, so consumers of these packages must use Node 22 or later. The accompanying CI baseline bump (workspace workflows from Node 20.x to 22.x) makes this requirement enforceable across builds.
