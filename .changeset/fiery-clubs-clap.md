---
"@common-grants/core": patch
---

Fix peer dependencies and UEI example value

- `npm install` raised a warning about peer dependencies for `@typespec/rest` and `@typespec/versioning` so we updated them to align with the other TypeSpec packages.
- The previous UEI example values didn't match the pattern required for the UEI type, so we updated the example to match.
