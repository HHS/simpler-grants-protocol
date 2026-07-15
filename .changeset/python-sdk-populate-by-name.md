---
"common-grants-sdk": patch
---

camelCase wire naming now comes from a shared alias generator on the model config instead of per-field `alias=` declarations. Validation and serialization use each field's `to_camel` alias, `populate_by_name` keeps snake_case construction working, and static type checkers now accept snake_case constructor calls like `SingleDateEvent(event_type=...)`, which bare `alias=` declarations made them reject. The config applies to `CommonGrantsBaseModel` and to the wire models that don't extend it (sorting, pagination, filters). Wire I/O is unchanged: every removed declaration matched its field's `to_camel` form exactly, and irregular wire names (`CustomField.schema_url` -> `"schema"`) keep explicit field-level aliases.
