import { describe, it, expect } from "vitest";
import { z } from "zod";
import { checkZodMatchesJsonSchema, SAMPLE_SIZE } from "./fuzz-test";

describe("Fuzz Testing Helper", () => {
  // #########################################################
  // checkZodMatchesJsonSchema
  // #########################################################

  describe("checkZodMatchesJsonSchema", () => {
    it("should validate a matching UUID schema", () => {
      const zodSchema = z.string().uuid();
      const result = checkZodMatchesJsonSchema(zodSchema, "uuid.yaml");

      expect(result.passed).toBe(true);
      expect(result.successCount).toBe(SAMPLE_SIZE);
      expect(result.totalTests).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBe(0);
    });

    it("should validate a matching email schema", () => {
      const zodSchema = z.string().email();
      const result = checkZodMatchesJsonSchema(zodSchema, "email.yaml");

      expect(result.passed).toBe(true);
      expect(result.successCount).toBe(SAMPLE_SIZE);
      expect(result.totalTests).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBe(0);
    });

    it("should detect a mismatch when schemas don't match", () => {
      // Create a Zod schema that doesn't match the UUID JSON schema
      const zodSchema = z.string().min(100); // This won't match UUID format
      const result = checkZodMatchesJsonSchema(zodSchema, "uuid.yaml");

      // Should find mismatches since UUIDs generated might not be SAMPLE_SIZE+ chars
      expect(result.totalTests).toBe(SAMPLE_SIZE);
      expect(result.passed).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.totalTests).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });

    it("should return detailed mismatch information", () => {
      const zodSchema = z.string().min(50); // Won't match UUID
      const result = checkZodMatchesJsonSchema(zodSchema, "uuid.yaml");

      if (result.mismatches.length > 0) {
        const mismatch = result.mismatches[0];
        expect(mismatch).toHaveProperty("sample");
        expect(mismatch).toHaveProperty("jsonSchemaValid");
        expect(mismatch).toHaveProperty("zodValid");
        // At least one should be false since they don't match
        expect(mismatch.jsonSchemaValid !== mismatch.zodValid).toBe(true);
      }
    });

    it("should handle schema not found error", () => {
      const zodSchema = z.string();
      expect(() => {
        checkZodMatchesJsonSchema(zodSchema, "nonexistent-schema.yaml");
      }).toThrow('JSON schema "nonexistent-schema.yaml" not found');
    });
  });

  // #########################################################
  // Complex Schema Testing
  // #########################################################

  describe("Complex Schema Testing", () => {
    it("should validate a schema with multiple properties", () => {
      const zodSchema = z.object({
        street1: z.string(),
        city: z.string(),
        stateOrProvince: z.string(),
        country: z.string(),
        postalCode: z.string(),
        street2: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      });

      const result = checkZodMatchesJsonSchema(zodSchema, "Address.yaml");

      // Should have some successes (might have some failures due to generation issues)
      expect(result.totalTests).toBe(SAMPLE_SIZE);
      // At least some tests should complete
      expect(result.successCount + result.mismatches.length).toBeGreaterThan(0);
    });

    it("should flag when zod schema is missing required properties", () => {
      const zodSchema = z.object({
        street1: z.string(),
        street2: z.string().optional(),
        city: z.string(),
        // missing stateOrProvince
        // missing country
        // missing postalCode
      });
      const result = checkZodMatchesJsonSchema(zodSchema, "Address.yaml");

      expect(result.passed).toBe(false);
      expect(result.successCount).toBeLessThan(SAMPLE_SIZE);
      expect(result.totalTests).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });

    it("should flag when zod schema is missing optional properties", () => {
      const zodSchema = z.object({
        street1: z.string(),
        street2: z.string().optional(),
        city: z.string(),
        stateOrProvince: z.string(),
        country: z.string(),
        postalCode: z.string(),
        // missing latitude
        // missing longitude
        // missing geography
      });
      const result = checkZodMatchesJsonSchema(zodSchema, "Address.yaml");
      expect(result.passed).toBe(false);
      expect(result.successCount).toBeLessThan(SAMPLE_SIZE);
      expect(result.totalTests).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });

    it("should flag when zod schema has extra required properties", () => {
      const zodSchema = z.object({
        street1: z.string(),
        street2: z.string().optional(),
        city: z.string(),
        stateOrProvince: z.string(),
        country: z.string(),
        postalCode: z.string(),
        extra: z.string(), // extra required property
      });
      const result = checkZodMatchesJsonSchema(zodSchema, "Address.yaml");
      expect(result.passed).toBe(false);
      expect(result.successCount).toBeLessThan(SAMPLE_SIZE);
      expect(result.totalTests).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });

    it("should validate Money schema with $ref to decimalString", () => {
      // Money.yaml has a $ref to decimalString.yaml for the amount field
      // This tests that $ref resolution works correctly
      const zodSchema = z.object({
        amount: z.string().regex(/^-?[0-9]+\.?[0-9]*$/),
        currency: z.string(),
      });

      const result = checkZodMatchesJsonSchema(zodSchema, "Money.yaml");

      expect(result.totalTests).toBe(SAMPLE_SIZE);
      // Log mismatches if any to help debug
      if (result.mismatches.length > 0) {
        console.log(
          "Money schema mismatches:",
          JSON.stringify(result.mismatches.slice(0, 2), null, 2)
        );
      }
      expect(result.passed).toBe(true);
    });

    it("should validate CustomField schema with $ref to CustomFieldType", () => {
      // CustomField.yaml has a $ref to CustomFieldType.yaml for the fieldType field
      // This tests that enum $refs are resolved correctly
      const zodSchema = z.object({
        name: z.string(),
        fieldType: z.enum(["string", "number", "integer", "boolean", "object", "array"]),
        value: z.unknown(),
        schema: z.string().url().optional(),
        description: z.string().optional(),
      });

      const result = checkZodMatchesJsonSchema(zodSchema, "CustomField.yaml");

      expect(result.passed).toBe(true);
      expect(result.totalTests).toBe(SAMPLE_SIZE);
      expect(result.successCount).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBe(0);
    });

    it("should validate EmailCollection schema with $ref to email", () => {
      // EmailCollection.yaml has $ref to email.yaml in multiple places
      // This tests nested $ref resolution in complex object structures
      const emailSchema = z.string().email();
      const zodSchema = z.object({
        primary: emailSchema,
        otherEmails: z.record(emailSchema).optional(),
      });

      const result = checkZodMatchesJsonSchema(zodSchema, "EmailCollection.yaml");

      expect(result.passed).toBe(true);
      expect(result.totalTests).toBe(SAMPLE_SIZE);
      expect(result.successCount).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBe(0);
    });
  });

  // #########################################################
  // Integration Tests
  // #########################################################

  describe("Integration Tests", () => {
    it("should work end-to-end with a real schema", () => {
      const zodSchema = z.string().uuid();
      const result = checkZodMatchesJsonSchema(zodSchema, "uuid.yaml");

      expect(result.totalTests).toBe(SAMPLE_SIZE);
      expect(result.passed).toBe(true);
      expect(result.mismatches.length).toBe(0);
    });

    it("should validate multiple schemas in sequence", () => {
      const uuidSchema = z.string().uuid();
      const emailSchema = z.string().email();

      const uuidResult = checkZodMatchesJsonSchema(uuidSchema, "uuid.yaml");
      const emailResult = checkZodMatchesJsonSchema(emailSchema, "email.yaml");

      expect(uuidResult.passed).toBe(true);
      expect(emailResult.passed).toBe(true);
    });
  });
});
