# Forms specs

TypeSpec models for grant application forms (SF-424 family, key contacts, etc.).
Forms are composed from question-bank questions instead of hand-writing the
underlying JSON Schema, UI schema, and mapping files.

A form spec compiles through the existing `pnpm typespec:extensions` pipeline
into `website/.extension-schemas/<FormName>.yaml`, alongside the question-bank
and custom-fields schemas. The `lib/forms` loader (see
`website/src/lib/forms/`) reads that YAML, dereferences `$ref`s into the
composed QB schemas, and exposes a normalized `FormItem` to the
`/forms-new/` pages.

## Anatomy of a form spec

```typespec
import "@typespec/json-schema";
import "../question-bank/primary-org/org-name.tsp";
import "../question-bank/poc/poc-details.tsp";

using JsonSchema;
using QuestionBank.OrgName;
using QuestionBank.PocDetails;

namespace Forms.MyForm;

model MyForm {
  /** Applicant organization */
  @extension(
    "x-overrides",
    #{ uiSchema: #{ name: #{ label: "Applicant Organization Name" } } }
  )
  org: QuestionOrgName;

  /** Primary point of contact */
  contact: QuestionPocDetails;

  /** This contact's role on the project */
  @example("Project Director")
  projectRole: string;
}
```

Things to call out:

- **Composition over redeclaration.** Embed a QB question as a property
  (`contact: QuestionPocDetails`) rather than restating its fields. The
  compiled output uses `$ref`. The loader composes a form-level
  `x-ui-schema` and `x-mapping-*` by walking the form's properties and
  stitching their respective extensions together; you do not need to
  re-emit any of those at the form level.
- **Atomic form-only fields.** Use plain TypeSpec for fields that have no
  QB counterpart (e.g. `projectRole: string`). The loader generates a
  default Control referencing `#/properties/<propName>` for each one.
- **Inherit examples.** When a field is composed from or extends a type
  that already has `@example` decorators, the inherited examples flow
  through the JSON Schema emit and the openapi-sampler-driven example
  generator picks them up. Only add `@example` for new fields without an
  inherited example. Use enum members directly (`NamePrefix.Ms`) when an
  example field has an enum type, not the underlying string.
- **Override individual fields, do not redeclare the whole tree.** Use
  the `x-overrides` extension on the property whose composed type you
  want to patch (see below); avoid model-level re-declarations of the
  inherited UI schema or mapping.

## How compose, overrides, and the loader fit together

```
  TypeSpec spec (.tsp)
  ┌──────────────────────────────────┐
  │  model KeyContact {              │
  │    org: QuestionOrgName;         │    ← composed QB questions
  │    contact: QuestionPocDetails;  │
  │    projectRole: string;          │    ← atomic form-only field
  │  }                               │
  └──────────────┬───────────────────┘
                 │ pnpm typespec
                 ▼
  Compiled YAML (.extension-schemas/KeyContact.yaml)
  ┌──────────────────────────────────┐
  │  properties:                     │
  │    org: { $ref: OrgName.yaml }   │    ← still $ref'd, not inlined
  │    contact: { $ref: Poc... }     │
  │    projectRole: { type: string } │
  │  x-tags: [key-contact]           │
  └──────────────┬───────────────────┘
                 │ loader.ts: dereferenceSchema()
                 ▼
  Dereferenced schema (in memory)
  ┌──────────────────────────────────┐
  │  properties:                     │
  │    org:                          │
  │      name: { type: string }      │    ← $ref inlined, x-ui-schema
  │      x-ui-schema: { ... }        │      and x-mapping-* carried in
  │      x-overrides: { ... }        │
  │    contact:                      │
  │      name: { ... }               │
  │      title: { ... }              │
  │      x-ui-schema: { ... }        │
  │      x-mapping-from-cg: { ... }  │
  │    projectRole:                  │
  │      type: string                │
  └──────────────┬───────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
  compose.ts           overrides.ts
  ┌─────────────┐      ┌────────────────┐
  │ Walks each  │      │ Reads          │
  │ property's  │      │ x-overrides    │
  │ x-ui-schema │      │ from each      │
  │ and         │      │ property,      │
  │ x-mapping-* │      │ re-keys paths  │
  │ to build a  │      │ with property  │
  │ form-level  │      │ name prefix,   │
  │ composite   │      │ then patches   │
  │             │      │ the composed   │
  │             │      │ result         │
  │ Re-scopes   │      │                │
  │ UI Control  │      │ Strict mode:   │
  │ paths under │      │ bad path =     │
  │ property    │      │ build error    │
  │ names       │      │                │
  └─────┬───────┘      └───────┬────────┘
        │                      │
        └────────┬─────────────┘
                 ▼
  Final FormItem (returned by loader.ts)
  ┌──────────────────────────────────┐
  │  uiSchema: { ... }               │  ← composed + overrides applied
  │  mappingFromCg: { ... }          │  ← composed + overrides applied
  │  mappingToCg: { ... }            │  ← composed + overrides applied
  │  rawSchema: { ... }              │  ← full dereferenced schema
  │  overrides: { ... }              │  ← raw x-overrides for debugging
  │  properties, tags, name, ...     │
  └──────────────────────────────────┘
```

**compose.ts** synthesizes a form-level UI schema and mappings by
stitching together the extensions from each question bank question
referenced in the form spec. It only runs when the form spec does not
declare its own explicit `x-ui-schema` or `x-mapping-*`.

**overrides.ts** applies per-field patches on top of the composed (or
explicit) result. Each override is keyed by a dotted property path that
gets translated to a JSON-Forms scope (for UI) or walked segment-by-
segment (for mappings).

**loader.ts** orchestrates both: dereference the schema, compose if
needed, apply overrides, and return a normalized `FormItem`.

## `x-overrides` extension

The `x-overrides` block patches the UI schema and mappings the loader
inherits from the composed QB questions. Three optional sub-objects:

| Sub-object      | Patches                                        |
| --------------- | ---------------------------------------------- |
| `uiSchema`      | Per-Control fields (label, options, rule, ...) |
| `mappingFromCg` | Leaf entries in `x-mapping-from-cg`            |
| `mappingToCg`   | Leaf entries in `x-mapping-to-cg`              |

Each sub-object is keyed by **dotted property path**. The loader
translates the path into the matching JSON-Forms scope when applying UI
overrides and walks the path segment-by-segment when applying mapping
overrides.

### Field-level overrides (preferred)

For patches into a property's composed type, declare `x-overrides` on
the property itself. The paths inside are relative to the property's
type, and the loader re-keys them with the property name when
aggregating into the form-level overrides.

```typespec
model MyForm {
  @extension(
    "x-overrides",
    #{
      uiSchema: #{ name: #{ label: "Applicant Organization Name" } },
    }
  )
  org: QuestionOrgName;

  @extension(
    "x-overrides",
    #{
      uiSchema: #{
        `name.firstName`: #{ label: "AOR First Name" },
      },
      mappingFromCg: #{
        `name.firstName`: #{
          field: "contacts.otherContacts.aor.name.firstName",
        },
      },
    }
  )
  contact: QuestionPocDetails;
}
```

### Model-level overrides (escape hatch)

For cross-cutting or top-level patches, `x-overrides` may also be
declared on the model itself; paths are absolute (relative to the
form root):

```typespec
@extension(
  "x-overrides",
  #{
    uiSchema: #{
      `org.name`: #{ label: "Applicant Organization Name" },
    },
  }
)
model MyForm { ... }
```

### Backtick rule for dotted paths

TypeSpec object-literal keys without backticks must be valid identifiers,
which excludes dots. Wrap any dotted path in backticks:

```typespec
uiSchema: #{
  `contact.name.firstName`: #{ label: "AOR First Name" },
}
```

The backticks are stripped at compile time, so the emitted YAML still
uses `contact.name.firstName` as the key.

### Strict failure mode

Any override path that does not resolve in the base structure throws at
load time. A typo in a path is a build-time error, not a silent no-op.

## Registering a form

Add an entry to `website/src/content/forms/typespec-index.json`:

```json
{
  "my-form": {
    "schema": "MyForm",
    "label": "My Form"
  }
}
```

The `schema` value matches the TypeSpec model name and the `<schema>.yaml`
filename emitted into `.extension-schemas/`. The slug becomes the URL
under `/forms-new/<slug>`.

## Local workflow

```bash
cd website
pnpm typespec   # emits .extension-schemas/<schema>.yaml for every form
pnpm dev        # serves /forms-new/<slug> with hot reload
pnpm test       # runs the loader + compose + override unit tests
```

CI runs `pnpm ci`, which compiles TypeSpec before tests, so the loader's
canary integration test always has its schema available.
