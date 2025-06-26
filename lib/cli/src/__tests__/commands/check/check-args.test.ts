import { CheckApiArgsSchema, CheckSpecArgsSchema } from "../../../commands/check/check-args";

describe("Check Args Validation", () => {
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
});
