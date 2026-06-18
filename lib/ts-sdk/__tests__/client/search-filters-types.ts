/**
 * Compile-time assertions for the routes-driven `search({ filters })` narrowing.
 *
 * Checked by `tsc --noEmit` only — there is no runtime test. Each `@ts-expect-error`
 * IS an assertion: it guards a line that must fail to compile.
 *
 * Why the narrowing is partial: because `definePlugin` preserves the literal
 * `routes` type (its `const TRoutes` generic), declared filter names get autocomplete
 * and their values are type-checked. But the spec supports AD-HOC filters (an open key
 * set), so an unknown key cannot be rejected — a typo on a declared name is structurally
 * an intentional ad-hoc filter. Narrowing therefore gives autocomplete + value-shape
 * checking, NOT typo-rejection. The two `@ts-expect-error`s below pin the part that DOES
 * hold (value-shape enforcement); the un-guarded "typo" line documents what does not.
 */

import { definePlugin, F } from "@/extensions";
import { Client } from "@/client";

declare const client: Client;

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

// Compile-only — never executed.
async function _assertions(): Promise<void> {
  // Declared filter names accepted, values built with the F.* helpers.
  await client.opportunities.search({
    routes: plugin.routes,
    filters: {
      fundingMax: F.between(0, 100),
      agency: F.in(["HHS", "NSF"]),
    },
  });

  // Ad-hoc (unregistered) key accepted — spec escape hatch, classifyFilters bucket 3.
  await client.opportunities.search({
    routes: plugin.routes,
    filters: { legacyTag: F.eq("conservation-2024") },
  });

  // FINDING (intentionally NO @ts-expect-error): a typo on a declared name compiles,
  // because it is indistinguishable from an intentional ad-hoc key. This is the
  // documented limitation of narrowing against an open (ad-hoc-supporting) key set.
  await client.opportunities.search({
    routes: plugin.routes,
    filters: { fundingMaxx: F.between(0, 100) },
  });

  // Value SHAPE is enforced even though keys are open.
  await client.opportunities.search({
    routes: plugin.routes,
    filters: {
      // @ts-expect-error — a filter value must be `{ operator, value }`, not a bare string.
      fundingMax: "not-a-filter",
    },
  });

  // Works with no routes/filters (back-compat: R defaults to PluginRoutes).
  await client.opportunities.search({ query: "education", statuses: ["open"] });
}

void _assertions;
