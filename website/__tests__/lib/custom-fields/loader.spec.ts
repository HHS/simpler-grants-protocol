import { describe, it, expect } from "vitest";
import { loadCustomField, loadAllCustomFields } from "@/lib/custom-fields";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Repo root, two levels up from `website/`. */
const REPO_ROOT = join(import.meta.dirname, "../../../..");

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

    // The href's anchor is derived from a heading in the overview MDX, so a
    // heading rename would break the link with nothing else failing.
    it("points at a heading that actually exists in the overview page", () => {
      const anchor = loadCustomField("agency")?.deprecated?.href.split("#")[1];
      expect(anchor).toBeTruthy();

      const mdx = readFileSync(
        join(REPO_ROOT, "website/src/content/docs/custom-fields/overview.mdx"),
        "utf-8",
      );
      const slugs = [...mdx.matchAll(/^#{2,3} (.+)$/gm)].map(([, heading]) =>
        heading
          .toLowerCase()
          .replace(/`/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-"),
      );

      expect(slugs).toContain(anchor);
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
