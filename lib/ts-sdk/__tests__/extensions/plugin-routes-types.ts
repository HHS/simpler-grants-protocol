/**
 * Compile-time assertions for the closed `PluginRoutes` key space.
 *
 * Checked by `tsc --noEmit` only (`pnpm --filter @common-grants/sdk run check:types`)
 * — there is no runtime test. Each `@ts-expect-error` directive IS the assertion:
 * it guards a line that must fail to compile while route keys are closed unions.
 * If the key space ever reopens, the guarded line compiles, the directive becomes
 * unused (ts2578), and the type-check gate fails.
 */

import { definePlugin, F } from "@/extensions";
import type { CustomFilterBag } from "@/client";

// A misspelled resource key is a compile error.
definePlugin({
  routes: {
    // @ts-expect-error - "oportunites" is not a registered resource name
    oportunites: {
      search: { filters: { agency: { filterType: "stringArray" } } },
    },
  },
} as const);

// A misspelled method key is a compile error.
definePlugin({
  routes: {
    opportunities: {
      // @ts-expect-error - "serch" is not a supported route method
      serch: { filters: { agency: { filterType: "stringArray" } } },
    },
  },
} as const);

// Correct spelling compiles clean.
definePlugin({
  routes: {
    opportunities: {
      search: { filters: { agency: { filterType: "stringArray" } } },
    },
  },
} as const);

// ############################################################################
// Registered filter values are typed by their declared filterType
// ############################################################################

const regionPlugin = definePlugin({
  routes: {
    opportunities: {
      search: { filters: { region: { filterType: "stringArray" } } },
    },
  },
} as const);

type RegionBag = CustomFilterBag<NonNullable<typeof regionPlugin.routes>>;

// Registered key accepts its declared value family.
const ok: RegionBag = { region: F.in(["US-CA", "US-NY"]) };

// @ts-expect-error - region is a stringArray filter; eq is an equivalence operator
const wrongOperator: RegionBag = { region: F.eq("US-CA") };

// Ad-hoc keys still pass through (typed as the raw `{operator, value}` shape).
const adHoc: RegionBag = { somethingElse: F.eq("x") };

void regionPlugin;
void ok;
void wrongOperator;
void adHoc;
