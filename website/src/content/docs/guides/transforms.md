# Bidirectional Transforms

The transform feature converts between a source system's native data format and the CommonGrants protocol format — in both directions. `toCommon` converts native → CommonGrants; `fromCommon` reverses it.

Both directions are always **author-provided**. The SDK never inverts one mapping from the other, because many-to-one handlers (like `match`) are not reversible.

> **Status:** Proof-of-concept tracked in [#798](https://github.com/HHS/simpler-grants-protocol/issues/798). The contract follows [ADR-0022](https://commongrants.org/governance/adr/0022-plugin-framework/) and [ADR-0017](https://commongrants.org/governance/adr/0017-mapping-format/).

## Table of contents

- [How it works](#how-it-works)
- [Built-in handlers](#built-in-handlers)
- [Null handling](#null-handling)
- [Defining transforms](#defining-transforms)
  - [Style 1: Declarative mappings](#style-1-declarative-mappings)
  - [Style 2: Hand-written functions](#style-2-hand-written-functions)
- [Wiring transforms into a plugin](#wiring-transforms-into-a-plugin)
- [Schema validation](#schema-validation)
- [Custom handlers](#custom-handlers)
- [Error handling](#error-handling)
- [API reference](#api-reference)

---

## How it works

A **mapping** is a nested object (TypeScript) or dict (Python) where:

- **Primitive leaves** (`string`, `number`, `boolean`, `null`) are returned as literal values.
- **Handler nodes** — an object whose first key is a registered handler name — dispatch to that handler with the source data and the handler argument. The handler's return value replaces the node.
- **Shape nodes** — an object whose first key is not a handler name — recursively build an output object. Each key-value pair is transformed and assembled.

Mappings are plain data — they can be serialized to JSON, stored in a database, or generated programmatically.

### Example

Given this source data:

```json
{
  "opportunity_status": "posted",
  "opportunity_amount": 1000
}
```

And this mapping:

```json
{
  "status": { "field": "opportunity_status" },
  "amount": {
    "value": { "field": "opportunity_amount" },
    "currency": "USD"
  }
}
```

The result is:

```json
{
  "status": "posted",
  "amount": {
    "value": 1000,
    "currency": "USD"
  }
}
```

`"USD"` is a literal leaf. `{ "field": "opportunity_amount" }` dispatches the `field` handler.

> **Note:** Bare string values are **literals**, not field paths. To extract a value from the source, use the `field` handler:
>
> ```json
> // ✓ extracts the title field
> { "title": { "field": "data.opportunity_title" } }
>
> // ✗ sets title to the literal string "data.opportunity_title"
> { "title": "data.opportunity_title" }
> ```

---

## Built-in handlers

Both SDKs ship the same set of built-in handlers:

| Handler          | Spec shape                                                          | Behavior                                                                                                |
| ---------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `field`          | `{ "field": "dot.notation.path" }`                                 | Extracts a value from the source via dot-notation. Terminal `null` preserved; absent path → `undefined`. |
| `const`          | `{ "const": <literal> }`                                           | Returns the literal value, ignoring source data entirely.                                               |
| `match`          | `{ "match": { "field": "...", "case": {...}, "default": "..." } }` | Case-based lookup on a source field value.                                                              |
| `switch`         | Same as `match`                                                     | Convenience alias — both point at the same handler function.                                            |
| `numberToString` | `{ "numberToString": "dot.notation.path" }`                        | Extracts a value and coerces to string. Returns `null` on `null` source; absent → `undefined`.          |
| `stringToNumber` | `{ "stringToNumber": "dot.notation.path" }`                        | Extracts a string and coerces to `int` (when possible) or `float`. Throws on non-numeric input.         |

---

## Null handling

Optional fields carry three distinct states, each preserved through every built-in handler:

| State      | Meaning                                                                  | Output                |
| ---------- | ------------------------------------------------------------------------ | --------------------- |
| **absent** | "Not provided" — the publisher did not supply this data                  | `undefined` / omitted |
| **`null`** | "Doesn't apply" — the publisher actively asserts the field is irrelevant | `null` (present key)  |
| **value**  | "Has a value"                                                            | the coerced value     |

The output object preserves all three states: absent → key omitted; `null` → key present with `null` value; value → key present with the value.

### `match` and `null` source

By default, a `null` source passes through unchanged. To translate it to a target-side sentinel, opt in via a `"null"` case key:

```json
// status=null source → status=null output  (default pass-through)
{ "match": { "field": "status", "case": { "posted": "open" }, "default": "custom" } }

// status=null source → status="n_a" output  (opt-in translation)
{ "match": { "field": "status", "case": { "posted": "open", "null": "n_a" }, "default": "custom" } }
```

`default` is **not** consulted for `null` source — it applies only to "unrecognized value," not "publisher asserts irrelevant."

> **Python SDK divergence:** The TypeScript SDK fully implements ADR-0024's three-state contract. The Python SDK predates it: the coercing handlers (`numberToString`, `stringToNumber`) collapse `None` source into the "not provided" path rather than passing it through. Bringing Python to parity is a pending follow-up.

---

## Defining transforms

There are two authoring styles: **declarative mappings** and **hand-written functions**. These are mutually exclusive on a single plugin entry.

### Style 1: Declarative mappings

Mappings are plain dicts compiled by the SDK into typed `toCommon`/`fromCommon` callables. Use this for field extraction and value remapping.

**TypeScript:**

```typescript
import { buildTransforms } from "@common-grants/sdk/extensions";

const { toCommon, fromCommon } = buildTransforms(
  // toCommonMapping: source system → CommonGrants
  {
    id:    { field: "data.opportunity_uuid" },
    title: { field: "data.opportunity_title" },
    status: {
      value: {
        match: {
          field: "data.opportunity_status",
          case: { posted: "open", archived: "closed", forecasted: "forecasted" },
          default: "custom",
        },
      },
    },
    customFields: {
      legacyId: {
        value:     { field: "data.opportunity_id" },
        name:      "legacyId",
        fieldType: "integer",
      },
    },
  },
  // fromCommonMapping: CommonGrants → source system
  {
    data: {
      opportunity_uuid:  { field: "id" },
      opportunity_title: { field: "title" },
      opportunity_id:    { field: "customFields.legacyId.value" },
    },
  }
);

const result = toCommon(sourceData);
if (result.errors.length === 0) {
  console.log(result.result);
}
```

**Python:**

```python
from common_grants_sdk.extensions import build_transforms

to_common, from_common = build_transforms(
    to_common_mapping={
        "id":    {"field": "opportunity_uuid"},
        "title": {"field": "opportunity_title"},
        "status": {
            "value": {
                "match": {
                    "field": "opportunity_status",
                    "case": {"posted": "open", "archived": "closed"},
                    "default": "custom",
                }
            }
        },
        "customFields": {
            "agencyCode": {
                "value":     {"field": "agency_code"},
                "name":      {"const": "agencyCode"},
                "fieldType": {"const": "string"},
            }
        },
    },
    from_common_mapping={
        "opportunity_uuid":  {"field": "id"},
        "opportunity_title": {"field": "title"},
        "agency_code":       {"field": "customFields.agencyCode.value"},
    },
)

result = to_common(source_data)
if not result.errors:
    print(result.result)
```

### Style 2: Hand-written functions

Use this when the logic exceeds what declarative mappings can express — computed fields, conditional branching, custom formatting. Each function receives the full source object and returns a `TransformResult`.

**TypeScript:**

Use the `ToCommon<T>` and `FromCommon<T>` helper types to annotate your functions. Pass a `TransformTypes` object specifying the `model`, `sourceSchema`, and optional `customFields` — the SDK resolves the common type from those inputs.

```typescript
import type { ToCommon, FromCommon } from "@common-grants/sdk/extensions";

type OppTransform = {
  model: "Opportunity";
  sourceSchema: typeof GrantsGovOpportunity;
  customFields: typeof customFields;
};

const toCommon: ToCommon<OppTransform> = source => ({
  result: {
    id:             source.data.opportunity_uuid,
    title:          source.data.opportunity_title,
    status:         { value: source.data.opportunity_status === "posted" ? "open" : "custom" },
    createdAt:      new Date(source.data.created_at),
    lastModifiedAt: new Date(source.data.last_modified_at),
    customFields: {
      legacyId: { name: "legacyId", fieldType: "integer", value: source.data.opportunity_id },
    },
  },
  errors: [],
});

const fromCommon: FromCommon<OppTransform> = common => ({
  result: {
    data: {
      opportunity_uuid:   common.id,
      opportunity_id:     common.customFields?.legacyId?.value ?? 0,
      opportunity_title:  common.title,
      opportunity_status: "posted",
      created_at:         common.createdAt.toISOString(),
      last_modified_at:   common.lastModifiedAt.toISOString(),
    },
  },
  errors: [],
});
```

**Python:**

Use `validate_into` so the result is validated into the target model and any failure is routed to `TransformResult.errors` rather than raised.

```python
from common_grants_sdk.extensions import TransformResult, validate_into


def to_common(
    source: GrantsGovOpportunity,
) -> TransformResult[OpportunityBase[OpportunityFields]]:
    return validate_into(
        OpportunityBase[OpportunityFields],
        {
            "id":    source.opportunity_uuid,
            "title": source.opportunity_title,
            "status": {"value": "open" if source.opportunity_status == "posted" else "custom"},
        },
    )


def from_common(
    common: OpportunityBase[OpportunityFields],
) -> TransformResult[GrantsGovOpportunity]:
    return validate_into(
        GrantsGovOpportunity,
        {
            "opportunity_uuid":   common.id,
            "opportunity_title":  common.title,
            "opportunity_status": "posted",
        },
    )
```

---

## Wiring transforms into a plugin

Pass transforms to `definePlugin()` (TypeScript) or `schema()` + `define_plugin()` (Python). The SDK validates the mapping structure and wires the callables together.

**TypeScript:**

```typescript
import { z } from "zod";
import { definePlugin } from "@common-grants/sdk/extensions";

const GrantsGovOpportunity = z.object({
  data: z.object({
    opportunity_uuid:   z.string().uuid(),
    opportunity_id:     z.number().int(),
    opportunity_title:  z.string(),
    opportunity_status: z.string(),
  }),
});

const plugin = definePlugin({
  meta: {
    name: "my-system",
    sourceSystem: "my-system.example.gov",
    capabilities: ["customFields", "transforms"],
  },
  schemas: {
    Opportunity: {
      sourceSchema: GrantsGovOpportunity,
      customFields: {
        legacyId: { fieldType: "integer", description: "Numeric ID from the legacy system" },
      },
      // Use `mappings` for the declarative style, or `toCommon`/`fromCommon` for hand-written.
      // These are mutually exclusive on the same entry.
      mappings: {
        toCommon: {
          id:    { field: "data.opportunity_uuid" },
          title: { field: "data.opportunity_title" },
          status: {
            value: {
              match: {
                field: "data.opportunity_status",
                case: { posted: "open", archived: "closed" },
                default: "custom",
              },
            },
          },
          customFields: {
            legacyId: {
              value:     { field: "data.opportunity_id" },
              name:      "legacyId",
              fieldType: "integer",
            },
          },
        },
        fromCommon: {
          data: {
            opportunity_uuid:  { field: "id" },
            opportunity_title: { field: "title" },
            opportunity_id:    { field: "customFields.legacyId.value" },
          },
        },
      },
    },
  },
} as const);

// Invoke at runtime:
const { result, errors } = plugin.schemas.Opportunity.toCommon(sourceData);
```

**Python:**

```python
from typing import Optional
from pydantic import Field
from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    PassthroughModel,
    PluginMeta,
    PluginSchemas,
    define_plugin,
    schema,
)
from common_grants_sdk.schemas.pydantic import OpportunityBase


class OpportunityFields(CustomFieldSet):
    legacy_id: Optional[CustomField[int]] = Field(
        default=None, description="Numeric ID from the legacy system"
    )


my_plugin = define_plugin(
    PluginSchemas(
        Opportunity=schema(
            source_schema=PassthroughModel,
            common_schema=OpportunityBase[OpportunityFields],
            mappings={
                "to_common": {
                    "id":    {"field": "opportunity_uuid"},
                    "title": {"field": "opportunity_title"},
                    "status": {
                        "value": {
                            "match": {
                                "field": "opportunity_status",
                                "case": {"posted": "open", "archived": "closed"},
                                "default": "custom",
                            }
                        }
                    },
                },
                "from_common": {
                    "opportunity_uuid":  {"field": "id"},
                    "opportunity_title": {"field": "title"},
                },
            },
        )
    ),
    meta=PluginMeta(name="my-system", source_system="my-system.example.gov"),
)

# Invoke at runtime:
result = my_plugin.schemas.Opportunity.to_common(source_data)
if not result.errors:
    common = result.result
```

> **`PassthroughModel`** is a permissive source schema (`extra="allow"`) for when you do not want to model the full source shape. Output-path validation is skipped for it. Replace it with a real Pydantic model when you want strict source validation.

---

## Schema validation

Pass an optional schema to validate the transform output at runtime.

**TypeScript:**

Pass `commonSchema` to validate `toCommon` output and `sourceSchema` to validate `fromCommon` output. Always pass the **fully extended schema** (the result of `withCustomFields()`), not the base — passing the base silently weakens validation of typed custom fields.

```typescript
import { buildTransforms, withCustomFields } from "@common-grants/sdk/extensions";
import { OpportunityBaseSchema } from "@common-grants/sdk/schemas";
import { z } from "zod";

const ExtendedOpportunity = withCustomFields(OpportunityBaseSchema, {
  legacyId: { fieldType: "integer", value: z.number().int() },
} as const);

const { toCommon } = buildTransforms(
  toCommonMapping,
  fromCommonMapping,
  undefined,           // no custom handlers
  ExtendedOpportunity  // validates toCommon output
);
```

**Python:**

Pass `common_schema` and/or `source_schema` to `build_transforms()`. The SDK calls `model_validate` on the transform result and routes any `ValidationError` into `TransformResult.errors` rather than raising.

```python
from common_grants_sdk.extensions import build_transforms

to_common, from_common = build_transforms(
    to_common_mapping={...},
    from_common_mapping={...},
    common_schema=OpportunityBase[OpportunityFields],  # validates to_common output
    source_schema=GrantsGovOpportunity,                # validates from_common output
)
```

When schema validation fails, `TransformResult.result` holds the raw transformed object alongside `errors` so you can inspect the malformed data.

---

## Custom handlers

Register additional handlers per `buildTransforms()` call. Names must not collide with built-in handler names — collisions raise an error at call time rather than silently overriding.

Custom handlers should follow the three-state null contract: return `undefined`/`None` for absent input, `null`/`None` for "doesn't apply," and a value otherwise.

**TypeScript:**

```typescript
import { buildTransforms, getFromPath } from "@common-grants/sdk/extensions";

// Joins multiple fields into one string.
// Note: concatenation has no meaningful null behavior, so this drops both
// `undefined` and `null`. Most handlers should preserve null per the three-state contract.
const join = (data: unknown, spec: unknown) => {
  const s = spec as { fields?: string[]; sep?: string };
  const parts = (s.fields ?? [])
    .map(p => getFromPath(data, p))
    .filter(v => v !== undefined && v !== null)
    .map(String);
  return parts.length > 0 ? parts.join(s.sep ?? " ") : undefined;
};

const { toCommon } = buildTransforms(
  { fullName: { join: { fields: ["first_name", "last_name"], sep: " " } } },
  {},
  new Map([["join", join]])
);
```

**Python:**

```python
from common_grants_sdk.extensions import build_transforms


def handle_upper(data: dict, path: str) -> str | None:
    parts = path.split(".")
    val = data
    for p in parts:
        val = val.get(p) if isinstance(val, dict) else None
    return str(val).upper() if val is not None else None


to_common, _ = build_transforms(
    to_common_mapping={"title": {"upper": "opportunity_title"}},
    from_common_mapping={},
    handlers={"upper": handle_upper},
)
```

---

## Error handling

Every transform returns `TransformResult` unconditionally — `{ result, errors }`. Failures surface in `errors` rather than being thrown, so callers choose their own strict-vs-lenient handling.

**TypeScript:**

```typescript
const out = toCommon(sourceData);

if (out.errors.length > 0) {
  for (const err of out.errors) {
    // Log a redacted projection — see PII warning below
    console.warn({
      name:    err.name,
      message: err.message,
      path:    err.path,    // dot-notation field path, if known
      handler: err.handler, // handler name, if a handler threw
    });
  }
} else {
  use(out.result);
}
```

`TransformError` properties (TypeScript):

| Property      | Type                   | Description                                                    |
| ------------- | ---------------------- | -------------------------------------------------------------- |
| `message`     | `string`               | Human-readable description of the failure.                     |
| `path`        | `string \| undefined`  | Dot-notation path to the failing field, when known.            |
| `handler`     | `string \| undefined`  | Handler name that threw, when applicable.                      |
| `sourceValue` | `unknown`              | The full input record passed to the transform (see PII note).  |
| `cause`       | `unknown`              | The original error or thrown value.                            |

**Python:**

```python
result = to_common(source_data)

if result.errors:
    for err in result.errors:
        # Log a redacted projection — see PII warning below
        print({
            "message": str(err),
            "path":    err.path,
            "handler": err.handler,
        })
else:
    use(result.result)
```

`TransformError` properties (Python):

| Property       | Type               | Description                                                   |
| -------------- | ------------------ | ------------------------------------------------------------- |
| `message`      | `str`              | Human-readable description of the failure.                    |
| `path`         | `str \| None`      | Dot-notation path to the failing field, when known.           |
| `handler`      | `str \| None`      | Handler name that threw, when applicable.                     |
| `source_value` | `Any`              | The full input record passed to the transform (see PII note). |
| `cause`        | `Exception \| None`| The original exception.                                       |

> **PII warning:** The SDK does **not** redact source data by default. `TransformError.sourceValue` / `source_value` holds the **entire input record** — not just the failing field — and flows through `JSON.stringify`, `console.log`, and any logger that enumerates object properties. If your transform processes applicant data, log a redacted projection (`name`, `message`, `path`, `handler`) rather than the full error object.
>
> On the TypeScript Zod-validation path, `TransformError.message` may also embed the rejected value from Zod's default error map. Redact `message` alongside `sourceValue` in that case. Full message sanitization is tracked in [#744](https://github.com/HHS/simpler-grants-protocol/issues/744).

---

## API reference

### TypeScript (`@common-grants/sdk/extensions`)

| Export                   | Kind      | Description                                                                                                                                    |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildTransforms()`      | function  | Compiles `(toCommonMapping, fromCommonMapping, handlers?, commonSchema?, sourceSchema?)` into `{ toCommon, fromCommon }`. Validates at call time. |
| `BuiltTransforms`        | interface | Return shape of `buildTransforms()` — `{ toCommon, fromCommon }`.                                                                              |
| `transformFromMapping()` | function  | Low-level mapping walker. Use `buildTransforms()` unless you need the bare walker without validation or error wrapping.                         |
| `DEFAULT_HANDLERS`       | const     | `Map<string, Handler>` of built-ins: `const`, `field`, `match`, `numberToString`, `stringToNumber`, `switch`.                                  |
| `getFromPath()`          | function  | Extracts a value from an object via dot-notation path.                                                                                          |
| `TransformResult`        | interface | Return shape `{ result, errors }` for every transform call.                                                                                     |
| `TransformError`         | class     | Structured error with `path`, `handler`, `sourceValue`, `cause`. Extends `Error`.                                                               |
| `Handler`                | type      | Signature for handler functions: `(data: unknown, arg: unknown) => unknown`.                                                                   |
| `ToCommon<T>`            | type      | Helper type for annotating hand-written `toCommon` functions. `T` extends `TransformTypes`.                                                    |
| `FromCommon<T>`          | type      | Helper type for annotating hand-written `fromCommon` functions. `T` extends `TransformTypes`.                                                  |
| `TransformTypes`         | interface | Named arg for `ToCommon`/`FromCommon`: `{ model, sourceSchema, customFields? }`.                                                               |

### Python (`common_grants_sdk.extensions`)

| Export                    | Kind     | Description                                                                                                                           |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `build_transforms()`      | function | Compiles `(to_common_mapping, from_common_mapping, handlers?, common_schema?, source_schema?)` into `(to_common, from_common)`. Validates at call time. |
| `transform_from_mapping()`| function | Low-level mapping walker. Use `build_transforms()` unless you need the bare walker.                                                   |
| `DEFAULT_HANDLERS`        | dict     | Registry of built-ins: `const`, `field`, `match`, `numberToString`, `stringToNumber`, `switch`.                                       |
| `get_from_path()`         | function | Extracts a value from a dict via dot-notation path.                                                                                    |
| `TransformResult`         | class    | Return shape `(result, errors)` — always returned, never raised.                                                                      |
| `TransformError`          | class    | Structured error with `path`, `handler`, `source_value`, `cause`.                                                                    |
| `validate_into()`         | function | Constructs a Pydantic model from a dict and routes `ValidationError` into `TransformResult.errors`. For use in hand-written functions. |
| `HandlerError`            | class    | Wraps handler exceptions with the handler name for attribution. Extends `ValueError`.                                                 |
| `PassthroughModel`        | class    | Permissive Pydantic model (`extra="allow"`) for use as `source_schema` when you don't want to model the full source shape.            |
