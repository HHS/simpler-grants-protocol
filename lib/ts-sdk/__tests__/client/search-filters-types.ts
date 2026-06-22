/**
 * Compile-time assertions for the routes-driven `search({ filters })` narrowing.
 *
 * Checked by `tsc --noEmit` only — there is no runtime test. Each `@ts-expect-error`
 * IS an assertion: it guards a line that must fail to compile.
 *
 * Why the narrowing is partial: because `definePlugin` preserves the literal
 * `routes` type (its `const TRoutes` generic), declared filter names get autocomplete
 * and their values are envelope-checked. But the spec supports AD-HOC filters (an open
 * key set), so an unknown key cannot be rejected — a typo on a declared name is
 * structurally an intentional ad-hoc filter. Narrowing therefore gives autocomplete +
 * filter-envelope checking (`{ operator, value }` shape), NOT typo-rejection and NOT
 * per-`filterType` value validation (that runs at runtime in `classifyFilters`). The
 * single `@ts-expect-error` below pins the part that DOES hold (the `{ operator, value }`
 * envelope); the un-guarded "typo" line documents what does not.
 */

import { definePlugin, F } from "@/extensions";
import { Client } from "@/client";

const plugin = definePlugin({
  routes: {
    opportunities: {
      search: {
        filters: {
          fundingMax: { filterType: "numberRange" },
          agency: { filterType: "stringArray" },
        },
      },
    },
  },
} as const);

// routes is client-bound: supplied once at construction, so `search` narrows
// filter names from the client's `R` generic. Compile-only — baseUrl unused.
const client = new Client({ routes: plugin.routes });

// Compile-only — never executed.
async function _assertions(): Promise<void> {
  // Declared filter names accepted, values built with the F.* helpers.
  await client.opportunities.search({
    filters: {
      fundingMax: F.between(0, 100),
      agency: F.in(["HHS", "NSF"]),
    },
  });

  // Ad-hoc (unregistered) key accepted — spec escape hatch, classifyFilters bucket 3.
  await client.opportunities.search({
    filters: { legacyTag: F.eq("conservation-2024") },
  });

  // FINDING (intentionally NO @ts-expect-error): a typo on a declared name compiles,
  // because it is indistinguishable from an intentional ad-hoc key. This is the
  // documented limitation of narrowing against an open (ad-hoc-supporting) key set.
  await client.opportunities.search({
    filters: { fundingMaxx: F.between(0, 100) },
  });

  // The `{ operator, value }` envelope is enforced even though keys are open.
  await client.opportunities.search({
    filters: {
      // @ts-expect-error — a filter value must be `{ operator, value }`, not a bare string.
      fundingMax: "not-a-filter",
    },
  });

  // Works with no filters (back-compat: R defaults to PluginRoutes).
  await client.opportunities.search({ query: "education", statuses: ["open"] });
}

void _assertions;
