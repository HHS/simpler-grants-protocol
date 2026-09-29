/**
 * The FAIN identifier builder, shared by the award fixtures and the
 * opportunity fixtures that reference those awards under `awards`.
 *
 * It lives in its own module so both fixture sets build the identifier shape
 * from one definition: `fixtures.ts` cannot import `awards.ts` at runtime
 * without closing an import cycle. The only import here is type-only, so it
 * is erased at build time and this module has no runtime dependencies.
 */

import type { AwdIds } from "./awards";

/** Builds a FAIN identifier collection, FAIN on its base (top-level) key. */
export function fain(value: string, systemId: string): AwdIds {
  return {
    systemId: { registry: { code: "awd:grants.gov:system" }, id: systemId },
    "awd:us:fain": {
      registry: {
        code: "awd:us:fain",
        url: "https://commongrants.org/registries/awd-us-fain",
      },
      id: value,
    },
  };
}
