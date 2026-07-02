/**
 * Compile-time assertions for the routes-driven `search({ filters })` narrowing.
 *
 * Checked by `tsc --noEmit` only — there is no runtime test. Each `@ts-expect-error`
 * IS an assertion: it guards a line that must fail to compile.
 *
 * Why the narrowing is partial: because `definePlugin` preserves the literal
 * `routes` type (its `const TRoutes` generic), declared filter names get autocomplete
 * and their values are typed by their declared `filterType` (a wrong value family is
 * a compile error). But the spec supports AD-HOC filters (an open key set), so an
 * unknown key cannot be rejected — a typo on a declared name is structurally an
 * intentional ad-hoc filter. Narrowing therefore gives autocomplete + per-`filterType`
 * value checking on declared names, NOT typo-rejection (that ends up ad-hoc, validated
 * at runtime by `categorizeFilters`). The un-guarded "typo" line documents the limit.
 */

import { definePlugin, F } from "@/extensions";
import { Client, Opportunities } from "@/client";

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

// routes are resource-bound: supplied once at construction, so `search` narrows
// filter names from the resource's `R` generic (plugin.getClient() does this
// wiring for consumers). Compile-only — baseUrl unused.
const client = new Client({ baseUrl: "http://localhost" });
const opportunities = new Opportunities(
  client,
  undefined,
  plugin.routes as NonNullable<typeof plugin.routes>
);

// Compile-only — never executed.
async function _assertions(): Promise<void> {
  // Declared filter names accepted, values built with the F.* helpers.
  await opportunities.search({
    filters: {
      fundingMax: F.between(0, 100),
      agency: F.in(["HHS", "NSF"]),
    },
  });

  // Ad-hoc (unregistered) key accepted — spec escape hatch (categorizeFilters bucket 3).
  await opportunities.search({
    filters: { legacyTag: F.eq("conservation-2024") },
  });

  // Intentionally NO @ts-expect-error: a typo on a declared name compiles,
  // because it is indistinguishable from an intentional ad-hoc key. This is the
  // documented limitation of narrowing against an open (ad-hoc-supporting) key set.
  await opportunities.search({
    filters: { fundingMaxx: F.between(0, 100) },
  });

  // Wrong value family on a declared name is a compile error.
  await opportunities.search({
    filters: {
      // @ts-expect-error — fundingMax is a numberRange filter; eq is not valid for it
      fundingMax: F.eq(100),
    },
  });

  // The `{ operator, value }` envelope is enforced even though keys are open.
  await opportunities.search({
    filters: {
      // @ts-expect-error — a filter value must be `{ operator, value }`, not a bare string.
      fundingMax: "not-a-filter",
    },
  });

  // Works with no filters, on the client's default resource slot.
  await client.opportunities.search({ query: "education", statuses: ["open"] });
}

void _assertions;
