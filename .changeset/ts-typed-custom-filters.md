---
"@common-grants/sdk": minor
---

Typed custom-filters authoring surface and plugin-scoped client for the TypeScript SDK:

- `definePlugin()` route keys are closed unions: a misspelled resource or method is a compile error, and an invalid registration throws `FilterError` at definition time.
- `plugin.getClient(config)` returns a client pre-bound to the plugin's schemas and registered filters; responses parse with the plugin schema by default (per-call `schema` override still wins).
- Filter validation is fail-fast: an invalid value on any filter — standard, registered custom, or ad-hoc — throws `FilterError` before the request is sent (compile error where the type is known). Well-formed ad-hoc filters still pass through; `filterInfo.errors` now carries server-returned errors only.
- `search()`/`list()` return `{ items, errors }`: valid rows in `items`, per-row `ParseFailure` (`index`, `raw`, `error`) in `errors`; `onParseError: "throw"` opts into fail-hard, and `get()` remains fail-hard.
- Breaking: `new Client(...)` no longer accepts `routes` (bind them via `plugin.getClient()`); `classifyFilters`/`ClassifyResult` are removed in favor of `categorizeFilters`.
