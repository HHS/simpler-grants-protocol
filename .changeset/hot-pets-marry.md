---
"@common-grants/cli": minor
---

Supports checking APIs against the v0.3.0 CommonGrants OpenAPI spec.

Enables CLI users to check against the v0.3.0 CommonGrants OpenAPI spec. This will be the new default version when running `cg check spec`

Users can still validate against previous versions of the CommonGrants OpenAPI spec by specifying the `--protocol-version` flag. For example:

```bash
cg check spec openapi.yaml --protocol-version 0.2.0
```
