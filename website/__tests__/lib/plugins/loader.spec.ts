import { describe, it, expect } from "vitest";
import { loadAllPlugins } from "@/lib/plugins";

/**
 * End-to-end loader tests against the generated metadata cache at
 * website/cache/plugin-metadata.json, which the plugin-metadata step produces.
 * CI runs `pnpm build` (which runs generate first) before `pnpm test`;
 * locally, run `pnpm generate:plugin-metadata` once.
 */

describe("plugins loader", () => {
  // =============================================================================
  // resolvedFilters
  // =============================================================================

  describe("resolvedFilters", () => {
    // The nested declarations lose their resource and method on the way to a
    // flat card list, so this is what catches them being dropped or swapped.
    it("keeps the route a filter was declared under", () => {
      const plugin = loadAllPlugins().find((p) => p.id === "ts-cg-grants-gov");
      const agency = plugin?.resolvedFilters.find((f) => f.name === "agency");

      expect(agency).toMatchObject({
        filterType: "stringArray",
        resource: "opportunities",
        method: "search",
        docsHref: "/protocol/filters/string#stringarrayfilter",
      });
      // Authored per filter in index.json; "" means the wiring dropped it.
      expect(agency?.description).not.toBe("");
    });

    // The one filter type with no protocol model of its own, so it is the one
    // whose href comes from the fallback rather than the anchor map.
    it("sends a booleanComparison filter to the filters index", () => {
      const plugin = loadAllPlugins().find((p) => p.id === "cg-grants-gov");
      const costSharing = plugin?.resolvedFilters.find(
        (f) => f.name === "costSharing",
      );

      expect(costSharing?.filterType).toBe("booleanComparison");
      expect(costSharing?.docsHref).toBe("/protocol/filters/");
    });
  });
});
