/**
 * Test the AJV validator utility loaded with auto-generated CommonGrants JSON schemas
 */

import { describe, it, expect } from "vitest";
import { createAjvValidator, validate } from "./ajv-validator";

const ajv = createAjvValidator();

describe("AJV validator utility", () => {
  // #########################################################
  // Formats validation
  // #########################################################

  it("should validate a UUID string", () => {
    const result = validate(ajv, "uuid.yaml", "30a12e5e-5940-4c08-921c-17a8960fcf4b");

    expect(result.isValid).toBe(true);
    expect(result.errors).toBeNull();
  });

  it("should validate an email address", () => {
    const result = validate(ajv, "email.yaml", "test@example.com");

    expect(result.isValid).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = validate(ajv, "email.yaml", "not-an-email");

    expect(result.isValid).toBe(false);
    expect(result.errors).not.toBeNull();
  });

  // #########################################################
  // Simple schema validation
  // #########################################################

  it("should validate data against a simple schema", () => {
    const address = {
      street1: "123 Main St",
      city: "Anytown",
      stateOrProvince: "CA",
      country: "US",
      postalCode: "12345",
    };

    const result = validate(ajv, "Address.yaml", address);

    expect(result.isValid).toBe(true);
  });

  it("should show validation errors for invalid data against a simple schema", () => {
    const invalidAddress = {
      street1: "123 Main St",
      // Missing city
      // Missing stateOrProvince
      // Missing country
      postalCode: 12345, // Number instead of string
    };

    const result = validate(ajv, "Address.yaml", invalidAddress);

    expect(result.isValid).toBe(false);
    expect(result.errors).not.toBeNull();
    expect(result.errors?.length).toBe(4);
  });

  // #########################################################
  // Complex schema validation
  // #########################################################

  it("should validate data against a complex, nested schema", () => {
    const opportunity = {
      id: "30a12e5e-5940-4c08-921c-17a8960fcf4b",
      title: "Small business grant program",
      status: {
        value: "open",
        description: "The opportunity is currently accepting applications",
      },
      description: "This program provides funding to small businesses",
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-01T00:00:00Z",
    };

    const result = validate(ajv, "OpportunityBase.yaml", opportunity);

    expect(result.isValid).toBe(true);
  });

  it("should show validation errors for invalid data against a complex, nested schema", () => {
    const invalidOpportunity = {
      id: "30a12e5e-5940-4c08-921c-17a8960fcf4b",
      title: "Small business grant program",
      status: {
        value: "fake-status", // Invalid status value
        // missing description
      },
      // Missing createdAt
      // Missing lastModifiedAt
    };

    const result = validate(ajv, "OpportunityBase.yaml", invalidOpportunity);

    expect(result.isValid).toBe(false);
    expect(result.errors).not.toBeNull();
    expect(result.errors?.length).toBe(4);
  });
});
