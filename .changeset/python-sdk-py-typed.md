---
"common-grants-sdk": patch
---

Ship a PEP 561 `py.typed` marker so downstream type checkers use the SDK's inline type annotations.

The package is fully type-annotated but shipped no marker, so `mypy` treated every `common_grants_sdk` import as untyped (`import-untyped`, "missing library stubs or py.typed marker") and consumers got no type-checking from the SDK. Adding the marker brings the Python SDK to parity with the TypeScript SDK, which already ships its `.d.ts` types.
