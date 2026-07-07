---
"@common-grants/cli": patch
---

Bump js-yaml from 4.2.0 to 4.3.0 (runtime dependency), picking up the backported `maxTotalMergeKeys` loader option that bounds the number of keys processed by YAML merge (`<<`) per parse.
