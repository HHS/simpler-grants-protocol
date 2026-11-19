import {
  CheckApiArgsSchema,
  CheckSpecArgsSchema,
  CheckSpecOptionsSchema,
  availableVersions,
  parseBaseVersions,
} from "../../../commands/check/check-args";

describe("Check Args Validation", () => {
  // #########################################################
  // # Check API Args
  // #########################################################

  describe("CheckApiArgsSchema", () => {
    it("should accept valid JSON file", () => {
      const result = CheckApiArgsSchema.safeParse({
        apiUrl: "http://example.com",
        specPath: "spec.json",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid YAML file", () => {
      const result = CheckApiArgsSchema.safeParse({
        apiUrl: "http://example.com",
        specPath: "spec.yaml",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid YML file", () => {
      const result = CheckApiArgsSchema.safeParse({
        apiUrl: "http://example.com",
        specPath: "spec.yml",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid file extension", () => {
      const result = CheckApiArgsSchema.safeParse({
        apiUrl: "http://example.com",
        specPath: "spec.txt",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid URL", () => {
      const result = CheckApiArgsSchema.safeParse({
        apiUrl: "not-a-url",
        specPath: "spec.yaml",
      });
      expect(result.success).toBe(false);
    });
  });

  // #########################################################
  // # Check Spec Args
  // #########################################################

  describe("CheckSpecArgsSchema", () => {
    it("should accept valid JSON file", () => {
      const result = CheckSpecArgsSchema.safeParse({
        specPath: "spec.json",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid YAML file", () => {
      const result = CheckSpecArgsSchema.safeParse({
        specPath: "spec.yaml",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid YML file", () => {
      const result = CheckSpecArgsSchema.safeParse({
        specPath: "spec.yml",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid file extension", () => {
      const result = CheckSpecArgsSchema.safeParse({
        specPath: "spec.txt",
      });
      expect(result.success).toBe(false);
    });
  });

  // #########################################################
  // # Check Spec Options
  // #########################################################

  describe("CheckSpecOptionsSchema", () => {
    it.each(["0.1.0", "0.2.0", "0.3.0", "0.4.0", "0.5.0"])(
      "should accept valid protocolVersion %s",
      version => {
        const result = CheckSpecOptionsSchema.safeParse({
          protocolVersion: version,
        });
        expect(result.success).toBe(true);
      }
    );

    it("should list 0.5.0 as the latest (default) protocolVersion", () => {
      expect(availableVersions[0]).toBe("0.5.0");
    });

    it("should reject invalid protocolVersion", () => {
      const result = CheckSpecOptionsSchema.safeParse({
        protocolVersion: "1.0.0",
      });
      expect(result.success).toBe(false);
    });

    it("should accept protocolVersion with base option", () => {
      const result = CheckSpecOptionsSchema.safeParse({
        base: "base.yaml",
        protocolVersion: "0.1.0",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty options", () => {
      const result = CheckSpecOptionsSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  // #########################################################
  // # Parse Base Versions
  // #########################################################

  describe("parseBaseVersions", () => {
    it("should sort versions newest first by version number, not by string", () => {
      // Arrange
      const fileNames = ["openapi.0.9.0.yaml", "openapi.0.10.0.yaml", "openapi.0.2.0.yaml"];

      // Act
      const versions = parseBaseVersions(fileNames);

      // Assert
      expect(versions).toEqual(["0.10.0", "0.9.0", "0.2.0"]);
    });

    it("should ignore files whose name does not match openapi.<semver>.yaml", () => {
      // Arrange
      const fileNames = [
        "openapi.0.5.0.yaml",
        "openapi.latest.yaml",
        "README.md",
        "openapi.0.10.0.yaml",
      ];

      // Act
      const versions = parseBaseVersions(fileNames);

      // Assert
      expect(versions).toEqual(["0.10.0", "0.5.0"]);
    });
  });
});
