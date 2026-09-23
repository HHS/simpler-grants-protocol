/**
 * Test the AJV validator utility loaded with auto-generated CommonGrants JSON schemas
 */

import { describe, it, expect } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  ajv,
  assertFormatValidationActive,
  createAjvFromDefs,
  createAjvValidator,
  validate,
} from "./ajv-validator";

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

// #########################################################
// Harness setup integrity
//
// The parity harness is only as trustworthy as the reference it compares
// against. These tests cover the ways that reference can quietly stop
// validating anything while the suite still reports parity.
// #########################################################

describe("createAjvFromDefs", () => {
  it("should register synthetic schemas by $id", () => {
    const probe = createAjvFromDefs(
      { Probe: { $id: "Probe.yaml", type: "object", properties: { n: { type: "integer" } } } },
      "synthetic:test"
    );

    expect(validate(probe, "Probe.yaml", { n: 1 }).isValid).toBe(true);
    expect(validate(probe, "Probe.yaml", { n: "one" }).isValid).toBe(false);
  });

  it("should keep schema registries separate between instances", () => {
    createAjvFromDefs({ Isolated: { $id: "Isolated.yaml", type: "string" } }, "synthetic:test");

    // The shared production instance must not have learned about the synthetic schema.
    expect(() => validate(ajv, "Isolated.yaml", "x")).toThrow(/not found/);
  });
});

describe("assertFormatValidationActive", () => {
  it("should pass for an instance built by createAjvFromDefs", () => {
    const probe = createAjvFromDefs({ Probe: { $id: "Probe.yaml", type: "string" } }, "test");

    expect(() => assertFormatValidationActive(probe, "test")).not.toThrow();
  });

  it("should throw when formats are registered but not enforced", () => {
    // `validateFormats: false` is the silent killer: every `format:` constraint
    // in the protocol schemas passes, so the harness reports parity while
    // checking nothing about uuid, uri, or date-time.
    const inert = new Ajv2020({ strict: false, validateFormats: false });
    addFormats(inert);

    expect(() => assertFormatValidationActive(inert, "inert-instance")).toThrow(
      /format validation is not active/i
    );
  });

  it("should throw when only some of the guarded formats are registered", () => {
    // ajv-formats registers formats one at a time. A list narrowed to uuid
    // passes a uuid-only probe while uri and date-time silently accept anything.
    const partial = new Ajv2020({ strict: false, validateFormats: true });
    addFormats(partial, ["uuid"]);

    expect(() => assertFormatValidationActive(partial, "partial-instance")).toThrow(
      /format: "uri"/
    );
  });

  it("should throw when no format validators are registered at all", () => {
    const bare = new Ajv2020({ strict: false, validateFormats: true });

    expect(() => assertFormatValidationActive(bare, "bare-instance")).toThrow(
      /format validation is not active/i
    );
  });
});

describe("createAjvValidator", () => {
  it("should name the missing file and the remedy when the reference is absent", () => {
    // The bundle is TypeSpec build output, so "missing" almost always means
    // "not built yet" — say so instead of surfacing a bare ENOENT.
    expect(() => createAjvValidator("/nonexistent/schemas.yaml")).toThrow(
      /\/nonexistent\/schemas\.yaml[\s\S]*pnpm build/
    );
  });

  it("should reject a bundle that carries no $defs", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-empty-bundle-"));
    const empty = path.join(dir, "schemas.yaml");
    fs.writeFileSync(empty, "openapi: 3.0.0\n");

    try {
      expect(() => createAjvValidator(empty)).toThrow(/does not contain \$defs/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
