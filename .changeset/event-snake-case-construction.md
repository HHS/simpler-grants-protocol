---
"common-grants-sdk": patch
---

Fix Event models silently dropping snake_case constructor arguments. `SingleDateEvent`, `DateRangeEvent`, `OtherEvent`, and `EventBase` now accept snake_case field names (`event_type`, `start_date`, `end_date`, ...) at construction and validation time, so a supplied event type can no longer be ignored in favor of the field default. CamelCase wire names (`eventType`, `startDate`, ...) still validate, `model_dump(by_alias=True)` still emits the camelCase wire shape, and `build_transforms()` / `schema()` mapping validation still recognizes camelCase Event keys as valid mapping targets.
