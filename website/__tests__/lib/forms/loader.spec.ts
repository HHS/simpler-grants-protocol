import { describe, it, expect, beforeAll } from "vitest";
import type { FormItem } from "@/lib/forms";
import { loadFormItem, loadAllFormItems, getFormIds } from "@/lib/forms";

/**
 * End-to-end loader tests against the forms loader. The compiled YAMLs
 * must exist at website/.form-schemas/ (e.g. KeyContact.yaml,
 * SF424Mandatory.yaml), which the typespec:forms emit step produces.
 * CI runs `pnpm build` (which runs typespec first) before `pnpm test`;
 * locally, run `pnpm typespec` once.
 */

describe("forms loader", () => {
  // =============================================================================
  // getFormIds
  // =============================================================================

  describe("getFormIds", () => {
    it("returns the slugs in typespec-index.json", () => {
      expect(getFormIds()).toContain("key-contact");
      expect(getFormIds()).toContain("sf424-mandatory");
    });
  });

  // =============================================================================
  // loadFormItem
  // =============================================================================

  describe("loadFormItem", () => {
    // =============================================================================
    // key-contact form
    // =============================================================================

    describe("key-contact form", () => {
      let item: FormItem | null;

      beforeAll(async () => {
        item = await loadFormItem("key-contact");
      });

      it("loads the key-contact form by id with all metadata fields populated", async () => {
        expect(item).not.toBeNull();
        expect(item?.id).toBe("key-contact");
        expect(item?.schema).toBe("KeyContact");
        expect(item?.label).toBe("Key Contact");
        expect(item?.description).toContain("Key Contacts");
        expect(item?.tags).toEqual(
          expect.arrayContaining(["key-contact", "application"]),
        );
        expect(item?.properties).toHaveProperty("org");
        expect(item?.properties).toHaveProperty("contact");
        expect(item?.properties).toHaveProperty("projectRole");
      });

      it("composes a VerticalLayout UI schema from the form's properties", async () => {
        expect(item?.uiSchema.type).toBe("VerticalLayout");
        const elements = item?.uiSchema.elements as Record<string, unknown>[];
        expect(elements).toHaveLength(3);
      });

      it("re-scopes inherited Control scopes under the property name", async () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"scope":"#/properties/org/properties/name"');
        expect(json).toContain(
          '"scope":"#/properties/contact/properties/name/properties/firstName"',
        );
      });

      it("generates a default Control for atomic form-only fields", async () => {
        const elements = item?.uiSchema.elements as Record<string, unknown>[];
        const projectRoleEl = elements[elements.length - 1];
        expect(projectRoleEl).toEqual({
          type: "Control",
          scope: "#/properties/projectRole",
        });
      });

      it("applies the field-level x-overrides label", async () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"label":"Applicant Organization Name"');
      });

      it("aggregates field-level overrides under the property name", async () => {
        expect(item?.overrides.uiSchema).toEqual({
          "org.name": { label: "Applicant Organization Name" },
        });
      });

      it("composes mappingFromCg by nesting child mappings under the property name", async () => {
        expect(item?.mappingFromCg).toMatchObject({
          org: { name: { field: "organizations.primary.name" } },
          contact: {
            name: {
              firstName: { field: "contacts.primary.name.firstName" },
            },
          },
        });
      });

      it("composes mappingToCg by rewriting field references with the property name prefix", async () => {
        const orgPath = (
          (item?.mappingToCg.organizations as Record<string, unknown>)
            ?.primary as Record<string, unknown>
        )?.name as { field: string };
        expect(orgPath.field).toBe("org.name");
      });
    });

    // =============================================================================
    // sf424-mandatory form (multi-composite with shared refs)
    // =============================================================================

    describe("sf424-mandatory form (multi-composite with shared refs)", () => {
      let item: FormItem | null;

      beforeAll(async () => {
        item = await loadFormItem("sf424-mandatory");
      });

      it("loads without error (verifies no AJV shared-ref init failure)", () => {
        expect(item).not.toBeNull();
        expect(item?.id).toBe("sf424-mandatory");
        expect(item?.schema).toBe("SF424Mandatory");
        expect(item?.label).toBe("SF-424 Mandatory Contacts");
        expect(item?.tags).toEqual(
          expect.arrayContaining(["sf424-mandatory", "application"]),
        );
      });

      it("exposes org, contact, and aor properties", () => {
        expect(item?.properties).toHaveProperty("org");
        expect(item?.properties).toHaveProperty("contact");
        expect(item?.properties).toHaveProperty("aor");
      });

      it("composes a VerticalLayout with three top-level group elements", () => {
        expect(item?.uiSchema.type).toBe("VerticalLayout");
        const elements = item?.uiSchema.elements as Record<string, unknown>[];
        expect(elements).toHaveLength(3);
      });
    });

    // =============================================================================
    // unknown form id
    // =============================================================================

    it("returns null for an unknown form id", async () => {
      const item = await loadFormItem("does-not-exist");
      expect(item).toBeNull();
    });
  });

  // =============================================================================
  // loadAllFormItems
  // =============================================================================

  describe("loadAllFormItems", () => {
    it("returns a map keyed by form id", async () => {
      const all = await loadAllFormItems();
      expect(all["key-contact"]).toBeDefined();
      expect(all["key-contact"].label).toBe("Key Contact");
      expect(all["sf424-mandatory"]).toBeDefined();
    });

    it("caches across calls (same reference returned)", async () => {
      const first = await loadAllFormItems();
      const second = await loadAllFormItems();
      expect(second).toBe(first);
    });
  });
});
