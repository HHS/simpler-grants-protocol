---
title: "Form Library Framework"
description: "ADR documenting the choice of JSON Forms over RJSF and Uniforms for our CommonGrants form library"
---

We need a way to define, render, and manage complex grant application forms using serialized configuration files that can be mapped to custom components and a standard data model.

## Decision

We chose to use **JSON Forms** for our CommonGrants form library for its flexibility, serialized configuration, and ability to support custom renderers.

**Positive consequences**

- Enables mapping individual schema properties or objects to custom renderers using a flexible tester/renderer architecture.
- Cleanly separates data schema (JSON Schema), UI schema (UISchema), and custom renderer mapping, supporting fully serialized configuration.
- Supports React, Angular, and Vue (with React as primary), offering long-term framework portability.
- Facilitates granular UI control for complex, nested forms and multi-field components (e.g., phone number, addresses).
- Scales well as form requirements grow in complexity.
- The serialized configuration also enables us to support a client-side form editor in the future.

**Negative consequences**

- Higher learning curve for advanced UISchema and custom renderer setup compared to simpler frameworks.
- Slightly smaller ecosystem and fewer out-of-the-box themes than RJSF or Uniforms.
- Requires more boilerplate for some custom layouts or deeply nested data structures.

### Criteria

- **Custom renderers:** Can we map specific properties (fields or objects) to custom renderers beyond simple type mapping?
- **UI/schema serialization:** Can data schema, UI schema, and renderer mapping be stored and managed independently as portable files or database records?
- **Multi-framework support:** Can we migrate to another front-end framework in the future without rewriting all schemas and logic?
- **Complex layout support:** Can we handle nested, composite, or multi-property fields (like addresses, phone numbers) with custom renderers?
- **Developer experience:** Is documentation and ecosystem strong enough to support maintainable, testable forms at scale?

### Options considered

- **JSON Forms:** Framework-agnostic library supporting JSON Schema, UISchema, and fine-grained custom renderer mapping.
- **React JSON Schema Form (RJSF):** React-only JSON Schema form generator with UI customization via `uiSchema` and widget overrides.
- **Uniforms:** React-focused schema-to-form toolkit supporting multiple schema types (JSON Schema, SimpleSchema, GraphQL, Zod).

## Evaluation

### Side-by-side comparison

| Criteria                | JSON Forms | RJSF | Uniforms |
| ----------------------- | :--------: | :--: | :------: |
| Custom renderers        |     ✅     |  ✅  |    ✅    |
| UI/schema serialization |     ✅     |  🟡  |    🟡    |
| Multi-framework support |     ✅     |  ❌  |    ❌    |
| Complex layout support  |     ✅     |  🟡  |    🟡    |
| Developer experience    |     🟡     |  ✅  |    🟡    |

### JSON Forms

Use [JSON Forms](https://jsonforms.io/) to define, serialize, and render forms using a combination of JSON Schema, UISchema, and custom renderer/tester registration.

:::note[Bottom line]
JSON Forms is best if:

- We want fully decoupled, serialized schemas and UI layouts that are portable between frameworks, and need per-field or per-object custom renderers,
- but we're willing to accept a steeper learning curve for advanced usage and a smaller ecosystem.
  :::

- **Pros**
  - Fully decouples schema, UI schema, and renderer logic; ideal for storing in version control or as database records.
  - Renderer tester pattern enables per-property and per-object custom renderers (e.g., multi-field widgets).
  - UI schema is serialized as a JSON file—no code required for UI logic.
  - Supports migration to Angular/Vue in future with reusable schemas and UISchemas.
- **Cons**
  - Advanced usage (custom layouts, nested objects) can be complex and under-documented.
  - Requires defining testers and renderers for each custom component.
  - Server-side rendering (SSR) can raise issues with hydration mismatches.

### React JSON Schema Form (RJSF)

Use [RJSF](https://react-jsonschema-form.readthedocs.io/en/stable/) to quickly generate forms in React using JSON Schema and `uiSchema` for field-level customization.

:::note[Bottom line]
RJSF is best if:

- We want to prioritize a rapid form prototyping tool with a large ecosystem and active community,
- but we're willing to accept limits on serialization, framework portability, and customizability.
  :::

- **Pros**
  - Simple to use, quick prototyping.
  - UI customization via `uiSchema` and custom widgets.
  - Large, active community and many themes.
- **Cons**
  - `uiSchema` is tied to React and tightly coupled with code, making serialization and external editing harder.
  - Custom renderers are limited to type/field widget mapping; more complex mapping (e.g., for object fields) is less ergonomic.
  - No non-React framework support.

### Uniforms

Use Uniforms if you want to build forms with multiple schema types and a highly flexible React approach.

:::note[Bottom line]
Uniforms is best if:

- We want maximum flexibility in React and can define layouts/components in code,
- but we're willing to give up on framework portability and serialized configurations.
  :::

- **Pros**
  - Flexible and works with multiple schema types.
  - Modern React patterns and hooks.
  - Custom fields/components are straightforward.
- **Cons**
  - UI schema/layout is React code, not serialized config.
  - Not framework agnostic—React only.
  - Schema flexibility comes at the expense of strong schema-driven UI/UX guarantees.
