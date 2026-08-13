---
"@common-grants/cli": minor
---

Bundle the v0.4.0 CommonGrants base spec with the CLI (#1052), so `cg check spec` can validate
an implementation against protocol version 0.4.0 via `--protocol-version 0.4.0`. Relative to
0.3.0, the 0.4.0 base spec adds the Awards (`/common-grants/awards`) and Organizations
(`/common-grants/orgs`) route groups.

`cg check spec` resolves the default base spec to the highest bundled version, so a run without
`--protocol-version` now validates against 0.4.0 instead of 0.3.0. Implementations that were
compliant with 0.3.0 remain compliant: every route the 0.4.0 base spec adds is tagged
`experimental`, and the only `required`-tagged routes are `GET /common-grants/opportunities` and
`GET /common-grants/opportunities/{oppId}`, unchanged since 0.3.0. Pass `--protocol-version
0.3.0` to pin the previous base spec, or `--base <path>` to supply your own.
