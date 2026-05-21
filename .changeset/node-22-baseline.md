---
"@common-grants/core": patch
"@common-grants/cli": patch
"@common-grants/sdk": patch
---

Document Node 22 as the minimum supported runtime via `engines.node: ">=22.0.0"`. Node 20 reached end of maintenance on 2026-04-30; this aligns the packages with current LTS and matches the runtime requirement upstream from `@typespec/compiler` 1.12+.

Consumers of `@common-grants/sdk` who only import the published Zod schemas or TypeScript types at runtime are unaffected. The Node 22 floor applies when invoking `tsp` (via `@common-grants/cli` or compiling `@common-grants/core`) or building the SDK from source.

Migration: the repo includes `.nvmrc` at root. Switch your local Node with `nvm use`, `fnm use`, or your runtime manager of choice.
