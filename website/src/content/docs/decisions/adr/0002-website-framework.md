---
title: Website framework
description: ADR documenting the decision to use Astro's Starlight template for project documentation.
---

## Summary

### Problem statement

We need a framework to build and maintain our documentation site for the protocol that balances simplicity, extensibility, and dynamic content generation. The solution should align with existing tooling for the project and be widely supported within the developer community.

### Decision outcome

We chose [Astro's Starlight template](https://starlight.astro.build/) for our documentation framework.

- **Positive consequences**
  - Simple to set up and maintain.
  - Extensible for customization and component overrides.
  - Supports dynamic routing and static site generation from structured data.
  - Uses TypeScript, aligning with other tools in the project.
- **Negative consequences**
  - Fewer prebuilt themes than MkDocs or Hugo.
  - Less popular than MkDocs or Next.js, resulting in potentially fewer community resources.

### Decision drivers

- **Simplicity** - Easy to set up, maintain, and host documentation.
- **Extensibility** - Allows customization and supports reusable components.
- **Dynamic routing** - Enables generating routes from structured data at build time.
- **Popularity** - Supported by a growing community and used in open-source projects.
- **Familiar tooling** - Leverages TypeScript, aligning with existing project frameworks.

### Options considered

- **Astro's Starlight (TypeScript)** - [Starlight](https://docs.astro.build/) is a simple and extensible static site generator that supports dynamic routing and is built with TypeScript.
- **Next.js (TypeScript)** - [Next.js](https://nextjs.org/docs) is a highly extensible React-based framework popular for dynamic applications and content-driven websites.
- **MkDocs (Python)** - [MkDocs](https://www.mkdocs.org/) is a simple, theme-rich static site generator designed for project documentation and written in Python.
- **Hugo (Go)** - [Hugo](https://gohugo.io/documentation/) is a fast and flexible static site generator focused on speed and simplicity, built with Go.

## Evaluation

### Side-by-side

| Criteria         | Starlight | Next.js | MkDocs | Hugo |
| ---------------- | :-------: | :-----: | :----: | :--: |
| Simplicity       |    ✅     |   🟡    |   ✅   |  ✅  |
| Extensibility    |    ✅     |   ✅    |   🟡   |  🟡  |
| Dynamic routing  |    ✅     |   ✅    |   ❌   |  ❌  |
| Popularity       |    🟡     |   ✅    |   ✅   |  🟡  |
| Familiar tooling |    ✅     |   ✅    |   🟡   |  ❌  |

### Option 1: Astro's Starlight

:::note[Bottom line]
Starlight is best if:

- we prioritize simplicity and extensibility
- but can compromise on prebuilt themes and popularity
  :::

- **Pros**
  - Easy to set up and maintain.
  - Good balance between simplicity and extensibility.
  - Supports dynamic routing from structured data.
  - Uses TypeScript, matching other tools.
- **Cons**
  - Fewer prebuilt themes than MkDocs or Hugo.
  - Less popular than MkDocs and Next.js.

### Option 2: Next.js

:::note[Bottom line]
Next.js is best if:

- we prioritize extensibility and popularity
- but can compromise on added complexity
  :::

- **Pros**
  - Highly extensible and customizable.
  - Supports dynamic routing from structured data.
  - Popular and widely supported.
- **Cons**
  - More complex setup and maintenance.
  - Overkill for simpler documentation needs.

### Option 3: MkDocs

:::note[Bottom line]
MkDocs is best if:

- we prioritize simplicity and prebuilt themes
- but can compromise on extensibility and dynamic routing
  :::

- **Pros**
  - Very simple setup and maintenance.
  - Large selection of prebuilt themes.
  - Popular in open-source documentation.
- **Cons**
  - Limited extensibility.
  - No dynamic routing support.
  - Uses Python instead of TypeScript.

### Option 4: Hugo

:::note[Bottom line]
Hugo is best if:

- we prioritize speed and static site generation
- but can compromise on extensibility and familiarity
  :::

- **Pros**
  - Extremely fast builds.
  - Good for purely static sites.
- **Cons**
  - Limited extensibility and dynamic routing.
  - Uses Go, which is less familiar.

## Conclusion

Astro's Starlight template strikes the right balance of simplicity, extensibility, and familiarity with TypeScript, making it the best fit for our documentation site despite its slightly lower popularity and fewer prebuilt themes compared to MkDocs.
