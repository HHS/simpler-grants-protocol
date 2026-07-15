---
"common-grants-sdk": patch
---

Make snake_case construction of aliased models type-check and validate: the Event models (`eventType`, `startDate`, `startTime`, `endDate`, `endTime`) and the `customValue` field on `OppStatus` / `ApplicantType` now use `validation_alias` + `serialization_alias` (the pattern `CustomField` and `PluginMeta` already use) instead of bare `alias`, and `CommonGrantsBaseModel` sets `populate_by_name=True`. Static type checkers previously rejected idiomatic calls like `SingleDateEvent(event_type=...)`, and validation ignored the snake_case name. Wire I/O is unchanged: parsing still accepts camelCase and `model_dump(by_alias=True)` still emits it. Internal alias readers (filter classification, transform mapping validation) now consult all three alias fields, so both alias styles resolve.
