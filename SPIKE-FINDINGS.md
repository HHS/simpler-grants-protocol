# Spike: custom-filter classification behind the search endpoint

**Branch:** `spike/filters-in-search` (off `HOLD-filters`) · **Status:** spike / exploratory — not for merge as-is.

## What this validates

Move custom-filter classification off the consumer and behind the API client, so a
consumer calls `client.opportunities.search({ filters, routes })` with a flat filter
bag instead of calling `classifyFilters(...)` by hand and threading the result.

## Why this shape (pattern match, not invention)

The SDK already has three plugin/option → method patterns. Classification matches the
first two and not the third:

| Pattern | Owner | Why |
|---|---|---|
| `schema` option (per-call) → response parsing | **Client** | It's the CommonGrants wire response. Marshalling the API surface is the client's job. |
| `statuses` shorthand → `buildSearchBody` builds `OppFilters` | **Client** | It's the wire request body. Same reason. |
| transforms (`buildTransforms` / `toCommon`) | **Consumer** | Maps the consumer's *own* source shape ↔ CommonGrants; the client can't know it. |

Filter classification is wire-request marshalling — the `statuses`/`schema` category.
`buildSearchBody` already converts the friendly `statuses` shorthand into `OppFilters`;
`classifyFilters` is the same operation generalized. So the change is: extend
`buildSearchBody` to call `classifyFilters` when a flat `filters` bag is present, with
`routes` arriving per-call (mirroring the per-call `schema` option). No `getClient`
factory — that matches nothing in the CommonGrants client today and would be the actual
re-invention.

## Changes

- `lib/ts-sdk/src/client/opportunities.ts` — `SearchOptions` gains `filters?` (flat bag)
  + `routes?`; `buildSearchBody` classifies via `classifyFilters` beside the `statuses`
  branch it mirrors. Back-compat: with no `filters`/`routes`, behaviour is unchanged.
- `lib/ts-sdk/src/extensions/custom-filters.ts` + `index.ts` — `FILTER_TYPE_SCHEMAS`
  exported read-only for consumer introspection.
- `lib/python-sdk/.../extensions/__init__.py` — `FILTER_TYPE_SCHEMAS` parity export.
- Tests: `__tests__/client/opportunities.spec.ts` (runtime, three-bucket routing through
  the real `search()` surface) and `__tests__/client/search-filters-types.ts`
  (compile-time narrowing assertions).

## Verification

- `pnpm exec tsc --noEmit` — clean (incl. the `@ts-expect-error` type-test assertions).
- `pnpm exec vitest run __tests__/client/opportunities.spec.ts` — 19/19 pass.
- Python `extensions/__init__.py` compiles; `FILTER_TYPE_SCHEMAS` in `__all__`.
- Consumer (tarball) scenario: `sgp-consumer-playground/ts/spike-filters-search.ts` —
  8/8 checks pass. The new export and `search({ filters, routes })` resolve and classify
  correctly from a real downstream install; the consumer never calls `classifyFilters`.

## Typed key-narrowing — the finding

The open question was whether `filters` can be typed to the declared filter names.

- **It ports.** `definePlugin` already preserves the literal `routes` type (its
  `const TRoutes` generic; `Plugin.routes?: TRoutes`), so a plugin defined inline yields
  concrete filter-name literals. `SearchOptions<S, R>` derives the declared names from
  `R` and surfaces them in autocomplete with typed values. The precondition is already
  met in-repo — no `definePlugin` rework needed.
- **But ad-hoc support caps it.** The spec supports ad-hoc (escape-hatch) filters — an
  open key set (`classifyFilters` bucket 3). So an unknown key can't be *rejected* at the
  type level: a typo on a declared name is structurally indistinguishable from an
  intentional ad-hoc key. Narrowing therefore delivers **autocomplete + value-shape
  checking for declared filters, NOT typo-rejection on filter names**. (This is the
  CommonGrants-specific divergence from `@common-benefits` #11, which has no ad-hoc path
  and can fully reject unknown keys.)
- **Deeper layer deferred:** value-type-per-`filterType` (e.g. `numberRange` ⇒
  `{ min: number; max: number }`) is a further step. The compile-time `FilterTypeMap` in
  `__tests__/extensions/custom-filters-types.ts` already mirrors it and could feed it.

## Graduating to real (out of scope here)

1. Mirror the endpoint integration into the Python client (`client/opportunities.py`).
2. Capture the request/response ownership decision as an ADR-0012 / ADR-0022 amendment.
3. Decide whether to offer a strict (no-ad-hoc) typed mode that *can* reject unknown keys.
4. Remove spike framing (this file, comment pointers) on promotion.
