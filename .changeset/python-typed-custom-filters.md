---
"common-grants-sdk": minor
---

Add codegen-free typed custom-filter authoring and client-side filtered search to the Python SDK.

- `OpportunityFilters` (a `TypedDict`) is the typed authoring surface for opportunity-search filters: a consumer annotates their filter dict with it — or a `total=False` subclass — to get per-key autocomplete and value-type narrowing, and to give each custom filter its own typed key. Clean value aliases (`StringArray`, `NumberComparison`, `DateComparison`, …) read at the call site.
- `define_plugin(routes=...)` accepts a route-keyed `PluginRoutes` map of `CustomFilterSpec` (`routes[resource][method].filters[name]`, per ADR-0022 Decision #10) and threads it onto `plugin.routes`.
- `Opportunities.search()` gains optional `filters` and `routes` parameters: the consumer's filter dict is classified via `classify_filters` into the three-bucket search body (default named fields + a `customFilters` record) and POSTed, returning typed `OpportunityBase` rows. `status` is now an optional shorthand merged into the filter set.
