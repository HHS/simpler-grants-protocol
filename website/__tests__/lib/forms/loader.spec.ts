import { describe, it, expect } from "vitest";
import { loadFormItem, loadAllFormItems, getFormIds } from "@/lib/forms";

/**
 * These tests exercise the end-to-end loader against the FormCanary schema.
 * The canary YAML must exist at website/.extension-schemas/FormCanary.yaml,
 * which the typespec emit step produces. CI runs `pnpm build` (which runs
 * typespec first) before `pnpm test`; locally, run `pnpm typespec` once.
 */

describe("forms loader", () => {
  describe("getFormIds", () => {
    it("returns the slugs in typespec-index.json", () => {
      const ids = getFormIds();
      expect(ids).toContain("form-canary");
    });
  });

  describe("loadFormItem", () => {
    it("loads the canary form by id with all fields populated", async () => {
      const item = await loadFormItem("form-canary");

      expect(item).not.toBeNull();
      expect(item?.id).toBe("form-canary");
      expect(item?.schema).toBe("FormCanary");
      expect(item?.label).toBe("Canary");
      expect(item?.description).toContain("Canary form");
      expect(item?.tags).toEqual([]);
      expect(item?.properties).toHaveProperty("note");
    });

    it("extracts the canary's x-ui-schema verbatim", async () => {
      const item = await loadFormItem("form-canary");

      expect(item?.uiSchema).toEqual({
        type: "Group",
        label: "Canary",
        elements: [
          { type: "Control", scope: "#/properties/note", label: "Note" },
        ],
      });
    });

    it("extracts both x-mapping-from-cg and x-mapping-to-cg", async () => {
      const item = await loadFormItem("form-canary");

      expect(item?.mappingFromCg).toEqual({
        note: { field: "customFields.canary.note" },
      });
      expect(item?.mappingToCg).toEqual({
        note: { field: "customFields.canary.note" },
      });
    });

    it("returns null for an unknown form id", async () => {
      const item = await loadFormItem("does-not-exist");
      expect(item).toBeNull();
    });
  });

  describe("loadAllFormItems", () => {
    it("returns a map keyed by form id", async () => {
      const all = await loadAllFormItems();
      expect(all["form-canary"]).toBeDefined();
      expect(all["form-canary"].label).toBe("Canary");
    });

    it("caches across calls (same reference returned)", async () => {
      const first = await loadAllFormItems();
      const second = await loadAllFormItems();
      expect(second).toBe(first);
    });
  });
});
