---
"@common-grants/core": patch
---

Fix version decorators for OpenAPI spec.

Decorates the routes, schemas, and properties that were added in v0.2.0 with the `@Versioning.added()` decorator. This ensures that those items are omitted from the v0.1.0 OpenAPI spec when it is generated from the TypeSpec project.
