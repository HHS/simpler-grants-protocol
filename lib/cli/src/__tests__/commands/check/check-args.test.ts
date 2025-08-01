import {
  CheckApiArgsSchema,
  CheckSpecArgsSchema,
  CheckSpecOptionsSchema,
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
    it("should accept valid protocolVersion 0.1.0", () => {
      const result = CheckSpecOptionsSchema.safeParse({
        protocolVersion: "0.1.0",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid protocolVersion 0.2.0", () => {
      const result = CheckSpecOptionsSchema.safeParse({
        protocolVersion: "0.2.0",
      });
      expect(result.success).toBe(true);
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
});
