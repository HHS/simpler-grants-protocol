---
"@common-grants/core": minor
---

Adds models and routes for application reviews.

- Adds new OpenAPI tag for "Application reviews"
- Adds new route `POST /common-grants/applications/search/` and a set of supporting models
- Changes `NumberComparisonFilter.operator` type to `ComparisonOperators | EquivalenceOperators` so that we can filter using `eq` and `neq` in addition to `ge`, `gte`, etc.
- Adds explicit `@Versioning.added()` decorator to all schemas, so that the version in which a schema was added is explicitly defined, rather than defaulting to v0.1.0
