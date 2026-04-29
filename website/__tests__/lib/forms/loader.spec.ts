import { describe, it, expect, beforeAll } from "vitest";
import type { FormItem } from "@/lib/forms";
import { loadFormItem, loadAllFormItems, getFormIds } from "@/lib/forms";

/**
 * End-to-end loader tests against the KeyContact form. The compiled YAML
 * must exist at website/.extension-schemas/KeyContact.yaml, which the
 * typespec emit step produces. CI runs `pnpm build` (which runs typespec
 * first) before `pnpm test`; locally, run `pnpm typespec` once.
 */

describe("forms loader", () => {
  // =============================================================================
  // getFormIds
  // =============================================================================

  describe("getFormIds", () => {
    it("returns the slugs in typespec-index.json", () => {
      expect(getFormIds()).toContain("key-contact");
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
        expect(item?.description).toContain("key contacts");
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
        expect(elements).toHaveLength(6);
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
        expect(projectRoleEl).toMatchObject({
          type: "Control",
          scope: "#/properties/projectRole",
        });
      });

      it("applies the field-level x-overrides label", async () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"label":"Applicant Organization Name"');
      });

      it("aggregates field-level overrides under the property name", async () => {
        expect(item?.overrides.uiSchema).toMatchObject({
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
    // formA form
    // =============================================================================

    describe("formA form", () => {
      let item: FormItem | null;

      beforeAll(async () => {
        item = await loadFormItem("formA");
      });

      it("loads formA with all metadata fields populated", () => {
        expect(item).not.toBeNull();
        expect(item?.id).toBe("formA");
        expect(item?.schema).toBe("FormA");
        expect(item?.label).toBe("Form A - Basic Grant");
        expect(item?.tags).toEqual(
          expect.arrayContaining(["formA", "application"]),
        );
        expect(item?.properties).toHaveProperty("contact");
        expect(item?.properties).toHaveProperty("org");
        expect(item?.properties).toHaveProperty("applicantType");
        expect(item?.properties).toHaveProperty("project");
      });

      it("applies the Applicant Information group label override", () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"label":"Applicant Information"');
      });

      it("re-scopes contact controls under contact property", () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain(
          '"scope":"#/properties/contact/properties/name/properties/firstName"',
        );
      });

      it("re-scopes project controls under project property", () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"scope":"#/properties/project/properties/title"');
      });

      it("applies Requested Amount (USD) label override", () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"label":"Requested Amount (USD)"');
      });

      it("composes mappingFromCg for contact fields", () => {
        expect(item?.mappingFromCg).toMatchObject({
          contact: {
            name: {
              firstName: { field: "contacts.primary.name.firstName" },
            },
            email: { field: "contacts.primary.emails.primary" },
          },
        });
      });

      it("composes mappingFromCg for org name", () => {
        expect(item?.mappingFromCg).toMatchObject({
          org: { name: { field: "organizations.primary.name" } },
        });
      });
    });

    // =============================================================================
    // formB form
    // =============================================================================

    describe("formB form", () => {
      let item: FormItem | null;

      beforeAll(async () => {
        item = await loadFormItem("formB");
      });

      it("loads formB with all metadata fields populated", () => {
        expect(item).not.toBeNull();
        expect(item?.id).toBe("formB");
        expect(item?.schema).toBe("FormB");
        expect(item?.label).toBe("Form B - Research Grant");
        expect(item?.tags).toEqual(
          expect.arrayContaining(["formB", "research", "application"]),
        );
        expect(item?.properties).toHaveProperty("contact");
        expect(item?.properties).toHaveProperty("org");
        expect(item?.properties).toHaveProperty("institutionType");
        expect(item?.properties).toHaveProperty("project");
      });

      it("applies the Principal Investigator group label override", () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"label":"Principal Investigator"');
      });

      it("applies PI First Name label override on firstName control", () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"label":"PI First Name"');
      });

      it("applies Institution Name label override on org.name", () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"label":"Institution Name"');
      });

      it("applies Research Project Name label override on project title", () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"label":"Research Project Name"');
      });

      it("applies Total Budget (USD) label on amount field", () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"label":"Total Budget (USD)"');
      });

      it("applies Kick-off Date and Completion Date label overrides", () => {
        const json = JSON.stringify(item?.uiSchema);
        expect(json).toContain('"label":"Kick-off Date"');
        expect(json).toContain('"label":"Completion Date"');
      });

      it("composes mappingFromCg for contact (PI) fields", () => {
        expect(item?.mappingFromCg).toMatchObject({
          contact: {
            name: {
              firstName: { field: "contacts.primary.name.firstName" },
            },
            email: { field: "contacts.primary.emails.primary" },
          },
        });
      });

      it("composes mappingFromCg for org name", () => {
        expect(item?.mappingFromCg).toMatchObject({
          org: { name: { field: "organizations.primary.name" } },
        });
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
    });

    it("caches across calls (same reference returned)", async () => {
      const first = await loadAllFormItems();
      const second = await loadAllFormItems();
      expect(second).toBe(first);
    });
  });
});
