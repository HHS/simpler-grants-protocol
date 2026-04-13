import { describe, it, expect } from "vitest";
import { loadFormItem, loadAllFormItems, getFormIds } from "@/lib/forms";

/**
 * End-to-end loader tests against the KeyContact form. The compiled YAML
 * must exist at website/.extension-schemas/KeyContact.yaml, which the
 * typespec emit step produces. CI runs `pnpm build` (which runs typespec
 * first) before `pnpm test`; locally, run `pnpm typespec` once.
 */

describe("forms loader", () => {
  describe("getFormIds", () => {
    it("returns the slugs in typespec-index.json", () => {
      expect(getFormIds()).toContain("key-contact");
    });
  });

  describe("loadFormItem", () => {
    it("loads the key-contact form by id with all metadata fields populated", async () => {
      const item = await loadFormItem("key-contact");

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
      const item = await loadFormItem("key-contact");
      expect(item?.uiSchema.type).toBe("VerticalLayout");
      const elements = item?.uiSchema.elements as Record<string, unknown>[];
      expect(elements).toHaveLength(3);
    });

    it("re-scopes inherited Control scopes under the property name", async () => {
      const item = await loadFormItem("key-contact");
      const json = JSON.stringify(item?.uiSchema);
      expect(json).toContain('"scope":"#/properties/org/properties/name"');
      expect(json).toContain(
        '"scope":"#/properties/contact/properties/name/properties/firstName"',
      );
    });

    it("generates a default Control for atomic form-only fields", async () => {
      const item = await loadFormItem("key-contact");
      const elements = item?.uiSchema.elements as Record<string, unknown>[];
      const projectRoleEl = elements[elements.length - 1];
      expect(projectRoleEl).toEqual({
        type: "Control",
        scope: "#/properties/projectRole",
      });
    });

    it("applies the field-level x-overrides label", async () => {
      const item = await loadFormItem("key-contact");
      const json = JSON.stringify(item?.uiSchema);
      expect(json).toContain('"label":"Applicant Organization Name"');
    });

    it("aggregates field-level overrides under the property name", async () => {
      const item = await loadFormItem("key-contact");
      expect(item?.overrides.uiSchema).toEqual({
        "org.name": { label: "Applicant Organization Name" },
      });
    });

    it("composes mappingFromCg by nesting child mappings under the property name", async () => {
      const item = await loadFormItem("key-contact");
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
      const item = await loadFormItem("key-contact");
      const orgPath = (
        (item?.mappingToCg.organizations as Record<string, unknown>)
          ?.primary as Record<string, unknown>
      )?.name as { field: string };
      expect(orgPath.field).toBe("org.name");
    });

    it("returns null for an unknown form id", async () => {
      const item = await loadFormItem("does-not-exist");
      expect(item).toBeNull();
    });
  });

  describe("loadAllFormItems", () => {
    it("returns a map keyed by form id", async () => {
      const all = await loadAllFormItems();
      expect(all["key-contact"]).toBeDefined();
      expect(all["key-contact"].label).toBe("Key Contact");
    });

    it("caches across calls (same reference returned)", async () => {
      const first = await loadAllFormItems();
      const second = await loadAllFormItems();
      expect(second).toBe(first);
    });
  });
});
