---
"@common-grants/sdk": patch
---

Correct the package README's kitchen sink example, which did not compile, and fix a stale filter-type count in the extensions docs.

The kitchen sink rendered on npm used `definePlugin({ extensions: … })` — a key that does not exist; custom fields live under `schemas.<Model>.customFields` — and passed `plugin.schemas.Opportunity` where a Zod schema was expected, though that value is a compiled entry object whose schema is at `.commonSchema`. Both were type errors, so the first example a new adopter copies could not build. The example now declares custom fields and a custom filter, gets a pre-bound client from `plugin.getClient()`, and searches with both a standard and a registered custom filter.

Also: `CustomFilterType` was described as an 11-value enum in the extensions README and in its own TSDoc, but has held 10 values since `integerComparison` was dropped. The extensions README additionally cross-links the Python SDK's new custom-filter docs and notes that the two SDKs diverge in authoring shape (annotated TypedDict vs. `filterType` string) while sharing one wire contract.
