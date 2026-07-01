---
"common-grants-sdk": minor
---

Typed custom-filter authoring and consumption for the Python SDK.

- `OpportunityFilters` is now an open `TypedDict` (PEP 728 `extra_items`): standard filter keys are typed to their value models, a `total=False` subclass gives each registered custom filter its own typed key, and unregistered keys still pass through. One source of truth for both registration and the consumer's `search(filters=...)` call site. Clean value aliases (`StringArray`, `NumberComparison`, `DateComparison`, …) read at the call site.
- `define_plugin(routes=...)` takes typed route carriers — `PluginRoutes(opportunities=ResourceRoutes(search=OppSearchFilters))` — so a misspelled route/method is a type error, replacing the stringly-typed route dict.
- `Plugin.get_client(config)` returns a client already scoped with the plugin's routes and schemas: `opportunities.search()` / `.list()` parse responses with the plugin's custom fields by default and return `SearchResult` / `ListResult` that partition successfully parsed `items` from per-row parse `errors`, so one malformed row no longer fails the batch. Filter-value validation stays fail-soft (collected into `filter_info.errors`).
