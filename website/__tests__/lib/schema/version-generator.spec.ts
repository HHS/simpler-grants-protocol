import { it, describe, expect, beforeEach } from "vitest";
import type { JsonSchema } from "@jsonforms/core";
import {
  generateSchemaVersions,
  type Changelog,
} from "@/lib/schema/version-generator";

// Test fixtures
const createTestSchemas = (): Map<string, JsonSchema> => {
  const schemas = new Map<string, JsonSchema>();

  // Schema that exists from v0.1.0 (baseline, never changes)
  schemas.set("Person", {
    $id: "Person.yaml",
    type: "object",
    properties: {
      id: { type: "string" },
      firstName: { type: "string" },
      lastName: { type: "string" },
    },
    required: ["id", "firstName", "lastName"],
  });

  // Schema added in v0.2.0 as "Form", renamed to "FormBase" in v0.3.0
  // Also gets "version" field added in v0.3.0
  schemas.set("FormBase", {
    $id: "FormBase.yaml",
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      description: { type: "string" },
      version: { type: "string" },
    },
    required: ["id", "name"],
  });

  // Schema that references FormBase (to test $ref updates)
  schemas.set("Competition", {
    $id: "Competition.yaml",
    type: "object",
    properties: {
      id: { type: "string" },
      forms: {
        type: "array",
        items: { $ref: "FormBase.yaml" },
      },
    },
    required: ["id"],
  });

  return schemas;
};

const createTestChangelog = (): Changelog => ({
  versions: ["0.1.0", "0.2.0", "0.3.0"],
  logs: {
    Person: {
      "0.1.0": [
        {
          message: "Added `Person` model",
          action: "added",
          targetKind: "model",
          currTargetName: "Person",
        },
      ],
    },
    FormBase: {
      "0.2.0": [
        {
          message: "Added `Form` model",
          action: "added",
          targetKind: "model",
          currTargetName: "Form",
        },
      ],
      "0.3.0": [
        {
          message: "Renamed model from `Form` to `FormBase`",
          action: "renamed",
          targetKind: "model",
          prevTargetName: "Form",
          currTargetName: "FormBase",
        },
        {
          message: "Added `version` field",
          action: "added",
          targetKind: "field",
          currTargetName: "version",
        },
      ],
    },
    Competition: {
      "0.2.0": [
        {
          message: "Added `Competition` model",
          action: "added",
          targetKind: "model",
          currTargetName: "Competition",
        },
      ],
    },
  },
});

describe("Version Generator", () => {
  let changelog: Changelog;
  let schemas: Map<string, JsonSchema>;

  beforeEach(() => {
    changelog = createTestChangelog();
    schemas = createTestSchemas();
  });

  // #############################################################################
  // # Schema existence
  // #############################################################################

  describe("Schema existence per version", () => {
    it("should include only schemas that exist in v0.1.0", () => {
      // v0.1.0 should only have Person
      const resultV1 = generateSchemaVersions("0.1.0", changelog, schemas);
      expect(resultV1.schemas.has("Person")).toBe(true);
      expect(resultV1.schemas.has("Form")).toBe(false);
      expect(resultV1.schemas.has("FormBase")).toBe(false);
      expect(resultV1.schemas.has("Competition")).toBe(false);
    });

    it("should include new schemas starting from the version they were added", () => {
      // Form was added in v0.2.0
      const formChangesV2 = changelog.logs["FormBase"]?.["0.2.0"];
      expect(formChangesV2).toBeDefined();
      expect(formChangesV2?.[0]?.action).toBe("added");

      // Form should exist in v0.2.0+ (but called "Form", not "FormBase" yet)
      const resultV2 = generateSchemaVersions("0.2.0", changelog, schemas);
      expect(resultV2.schemas.has("Form")).toBe(true);
      expect(resultV2.schemas.has("FormBase")).toBe(false);

      // Form should NOT exist in v0.1.0 (before it was added)
      const resultV1 = generateSchemaVersions("0.1.0", changelog, schemas);
      expect(resultV1.schemas.has("Form")).toBe(false);
      expect(resultV1.schemas.has("FormBase")).toBe(false);
    });

    it("should include all appropriate schemas in v0.2.0", () => {
      const resultV2 = generateSchemaVersions("0.2.0", changelog, schemas);

      // Should have Person (from v0.1.0) and all v0.2.0 additions
      expect(resultV2.schemas.has("Person")).toBe(true);
      expect(resultV2.schemas.has("Form")).toBe(true); // Note: called "Form" in v0.2.0
      expect(resultV2.schemas.has("FormBase")).toBe(false); // Not yet renamed
      expect(resultV2.schemas.has("Competition")).toBe(true);
    });

    it("should include all appropriate schemas in v0.3.0", () => {
      const resultV3 = generateSchemaVersions("0.3.0", changelog, schemas);

      // Should have Person and renamed FormBase
      expect(resultV3.schemas.has("Person")).toBe(true);
      expect(resultV3.schemas.has("FormBase")).toBe(true); // Renamed in v0.3.0
      expect(resultV3.schemas.has("Form")).toBe(false); // Old name gone
      expect(resultV3.schemas.has("Competition")).toBe(true);
    });
  });

  // #############################################################################
  // # Schema renaming
  // #############################################################################

  describe("Schema renaming", () => {
    it("should rename schemas in previous versions", () => {
      // FormBase was renamed from Form in v0.3.0
      // In v0.2.0, it should be called "Form"
      // In v0.3.0+, it should be called "FormBase"

      const formBaseChangesV3 = changelog.logs["FormBase"]?.["0.3.0"];
      const hasRename = formBaseChangesV3?.some(
        (c) => c.action === "renamed" && c.targetKind === "model",
      );

      expect(hasRename).toBe(true);

      // v0.3.0 should have FormBase
      const resultV3 = generateSchemaVersions("0.3.0", changelog, schemas);
      expect(resultV3.schemas.has("FormBase")).toBe(true);
      expect(resultV3.schemas.has("Form")).toBe(false);

      // v0.2.0 should have Form (old name)
      const resultV2 = generateSchemaVersions("0.2.0", changelog, schemas);
      expect(resultV2.schemas.has("Form")).toBe(true);
      expect(resultV2.schemas.has("FormBase")).toBe(false);

      // The schema $id should match the name
      const formV2 = resultV2.schemas.get("Form") as JsonSchema & {
        $id?: string;
      };
      expect(formV2?.$id).toBe("Form.yaml");
    });
  });

  // #############################################################################
  // # Field additions
  // #############################################################################

  describe("Field additions", () => {
    it("should not include fields before they were added", () => {
      // version field was added to FormBase in v0.3.0
      const formBaseChangesV3 = changelog.logs["FormBase"]?.["0.3.0"];
      const hasVersionField = formBaseChangesV3?.some(
        (c) =>
          c.action === "added" &&
          c.targetKind === "field" &&
          c.currTargetName === "version",
      );

      expect(hasVersionField).toBe(true);

      // v0.2.0 should NOT have version field
      const resultV2 = generateSchemaVersions("0.2.0", changelog, schemas);
      const formV2 = resultV2.schemas.get("Form") as JsonSchema;
      expect(formV2?.properties).not.toHaveProperty("version");
      expect(formV2?.properties).toHaveProperty("id");
      expect(formV2?.properties).toHaveProperty("name");
      expect(formV2?.properties).toHaveProperty("description");
    });

    it("should include fields starting from the version they were added", () => {
      // version field was added to FormBase in v0.3.0
      const resultV3 = generateSchemaVersions("0.3.0", changelog, schemas);
      const formBaseV3 = resultV3.schemas.get("FormBase") as JsonSchema;

      // v0.3.0 should have version field
      expect(formBaseV3?.properties).toHaveProperty("version");

      // Should still have all the original fields
      expect(formBaseV3?.properties).toHaveProperty("id");
      expect(formBaseV3?.properties).toHaveProperty("name");
      expect(formBaseV3?.properties).toHaveProperty("description");
    });
  });

  // #############################################################################
  // # Cumulative changes
  // #############################################################################

  describe("Cumulative changes", () => {
    it("should handle both rename and field addition in same version", () => {
      // FormBase:
      // - v0.2.0: Added Form model with id, name, description
      // - v0.3.0: Renamed to FormBase, added version field
      //
      // v0.3.0 should have all original fields plus version

      const resultV2 = generateSchemaVersions("0.2.0", changelog, schemas);
      const formV2 = resultV2.schemas.get("Form") as JsonSchema;
      const v2PropertyCount = Object.keys(formV2?.properties || {}).length;

      const resultV3 = generateSchemaVersions("0.3.0", changelog, schemas);
      const formBaseV3 = resultV3.schemas.get("FormBase") as JsonSchema;
      const v3PropertyCount = Object.keys(formBaseV3?.properties || {}).length;

      // v0.3.0 should have one more property (version) than v0.2.0
      expect(v3PropertyCount).toBe(v2PropertyCount + 1);
      expect(formBaseV3?.properties).toHaveProperty("version");

      // All original properties should still exist
      expect(formBaseV3?.properties).toHaveProperty("id");
      expect(formBaseV3?.properties).toHaveProperty("name");
      expect(formBaseV3?.properties).toHaveProperty("description");
    });

    it("should preserve schemas that don't change between versions", () => {
      // Person should be identical in all versions
      const resultV1 = generateSchemaVersions("0.1.0", changelog, schemas);
      const personV1 = resultV1.schemas.get("Person") as JsonSchema;

      const resultV2 = generateSchemaVersions("0.2.0", changelog, schemas);
      const personV2 = resultV2.schemas.get("Person") as JsonSchema;

      const resultV3 = generateSchemaVersions("0.3.0", changelog, schemas);
      const personV3 = resultV3.schemas.get("Person") as JsonSchema;

      // Person should be identical across all versions
      expect(personV1?.properties).toEqual(personV2?.properties);
      expect(personV2?.properties).toEqual(personV3?.properties);
      expect(personV1?.required).toEqual(personV2?.required);
      expect(personV2?.required).toEqual(personV3?.required);
    });
  });

  // #############################################################################
  // # Version folder structure
  // #############################################################################

  describe("Version folder structure", () => {
    it("should generate schemas in version-specific folders", () => {
      const result = generateSchemaVersions("0.2.0", changelog, schemas);

      // Should return information about where to write files
      expect(result).toHaveProperty("version");
      expect(result).toHaveProperty("schemas");
      expect(result.version).toBe("0.2.0");
      expect(result.schemas).toBeInstanceOf(Map);
    });

    it("should generate all required versions", () => {
      // All versions should be available in the top-level versions array
      expect(changelog.versions).toEqual(["0.1.0", "0.2.0", "0.3.0"]);

      // Should be able to generate schemas for each version
      for (const version of changelog.versions) {
        const result = generateSchemaVersions(version, changelog, schemas);
        expect(result.version).toBe(version);
        expect(result.schemas).toBeInstanceOf(Map);
      }
    });
  });

  // #############################################################################
  // # Schema references
  // #############################################################################

  describe("Schema references", () => {
    it("should update $id references when schemas are renamed", () => {
      // In v0.2.0, FormBase.yaml should reference "Form.yaml" in $id
      // In v0.3.0, it should reference "FormBase.yaml"

      const resultV2 = generateSchemaVersions("0.2.0", changelog, schemas);
      const formV2 = resultV2.schemas.get("Form") as JsonSchema & {
        $id?: string;
      };
      expect(formV2?.$id).toBe("Form.yaml");

      const resultV3 = generateSchemaVersions("0.3.0", changelog, schemas);
      const formBaseV3 = resultV3.schemas.get("FormBase") as JsonSchema & {
        $id?: string;
      };
      expect(formBaseV3?.$id).toBe("FormBase.yaml");
    });

    it("should update $ref references when schemas are renamed", () => {
      // Competition references FormBase, so in v0.2.0 it should reference Form.yaml
      const resultV2 = generateSchemaVersions("0.2.0", changelog, schemas);
      const competitionV2 = resultV2.schemas.get("Competition") as JsonSchema;
      const formsPropertyV2 = competitionV2?.properties?.forms as JsonSchema;
      const formsItemsV2 = formsPropertyV2?.items as { $ref?: string };
      expect(formsItemsV2?.$ref).toBe("Form.yaml");

      // In v0.3.0, it should reference FormBase.yaml
      const resultV3 = generateSchemaVersions("0.3.0", changelog, schemas);
      const competitionV3 = resultV3.schemas.get("Competition") as JsonSchema;
      const formsPropertyV3 = competitionV3?.properties?.forms as JsonSchema;
      const formsItemsV3 = formsPropertyV3?.items as { $ref?: string };
      expect(formsItemsV3?.$ref).toBe("FormBase.yaml");
    });
  });
});
