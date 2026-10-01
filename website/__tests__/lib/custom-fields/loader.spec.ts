import { describe, it, expect } from "vitest";
import { loadCustomField, loadAllCustomFields } from "@/lib/custom-fields";

/**
 * End-to-end loader tests against the generated extension schemas at
 * website/.extension-schemas/, which the TypeSpec extensions emitter produces.
 * CI runs `pnpm build` (which runs generate first) before `pnpm test`;
 * locally, run `pnpm --filter website run typespec:extensions` once.
 */

describe("custom-fields loader", () => {
  // =============================================================================
  // deprecated
  // =============================================================================

  describe("deprecated", () => {
    it("surfaces the deprecation note on the agency field", () => {
      const agency = loadCustomField("agency");

      expect(agency?.deprecated?.note).toContain("v0.5");
      expect(agency?.deprecated?.note).toContain("OpportunityBase.funders");
    });

    it("surfaces a deprecation href pointing at the custom-fields overview with an anchor", () => {
      const agency = loadCustomField("agency");

      expect(agency?.deprecated?.href).toMatch(/^\/custom-fields\/overview\//);
      expect(agency?.deprecated?.href).toContain("#");
    });

    it("leaves every other field's deprecated undefined", () => {
      const fields = loadAllCustomFields();

      // Without this the loop asserts nothing when the catalog fails to build.
      expect(Object.keys(fields).length).toBeGreaterThan(1);

      for (const [id, field] of Object.entries(fields)) {
        if (id === "agency") continue;
        expect(field.deprecated).toBeUndefined();
      }
    });
  });
});
