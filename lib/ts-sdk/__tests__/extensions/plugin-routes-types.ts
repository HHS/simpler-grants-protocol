/**
 * Compile-time assertions for the closed `PluginRoutes` key space.
 *
 * Checked by `tsc --noEmit` only (`pnpm --filter @common-grants/sdk run check:types`)
 * — there is no runtime test. Each `@ts-expect-error` directive IS the assertion:
 * it guards a line that must fail to compile while route keys are closed unions.
 * If the key space ever reopens, the guarded line compiles, the directive becomes
 * unused (ts2578), and the type-check gate fails.
 */

import { definePlugin } from "@/extensions";

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
