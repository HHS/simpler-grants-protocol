---
"common-grants-sdk": patch
---

Document custom filters in the extensions README, and correct two broken snippets plus the package README's kitchen sink example.

The custom-filter surface shipped without prose documentation — the extensions README had no mention of filters at all, so the only reference was the source. It now covers the routes-vs-schemas split, declaring filters by annotating an `OpportunityFilters` subclass, the ten filter value models and the `f.*` builders, the three-bucket `classify_filters` request body, and validation at both registration time and call time.

Corrections along the way: the extensions README's client example called `Client(base_url=…)`, which raises `TypeError` because the constructor takes `config=Config(…)`; its reusable-plugin example imported `Opportunity` from `schemas.pydantic.models`, which raises `ImportError`, while using `OpportunityBase` in the body. The package README's kitchen sink, rendered on PyPI, still taught the ad-hoc `with_custom_fields()` path and never showed `define_plugin` or `get_client()`; it now mirrors the TypeScript SDK's example. Both READMEs now steer away from the deprecated `status=[…]` shorthand on `search()` toward `filters`.
