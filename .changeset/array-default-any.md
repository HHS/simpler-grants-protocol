---
"common-grants-sdk": patch
---

Change default ARRAY field type annotation from `list[str]` to `list[Any]` in plugin code generation. This more accurately reflects that an array field with no explicit `value` type should not assume string elements.
