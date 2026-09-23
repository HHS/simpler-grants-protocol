import { describe, it, expect } from "vitest";
import { z } from "zod";
import { UTCDateTimeSchema } from "../../src/schemas/zod/types";
import { createAjvFromDefs } from "./ajv-validator";
import { checkZodMatchesJsonSchema, SAMPLE_SIZE } from "./fuzz-test";

describe("Fuzz Testing Helper", () => {
  // #########################################################
  // checkZodMatchesJsonSchema
  // #########################################################

  describe("checkZodMatchesJsonSchema", () => {
    it("should validate a matching UUID schema", async () => {
      const zodSchema = z.uuid();
      const result = await checkZodMatchesJsonSchema(zodSchema, "uuid.yaml");

      expect(result.passed).toBe(true);
      expect(result.successCount).toBe(SAMPLE_SIZE);
      expect(result.validated).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBe(0);
    });

    it("should validate a matching email schema", async () => {
      const zodSchema = z.email();
      const result = await checkZodMatchesJsonSchema(zodSchema, "email.yaml");

      expect(result.passed).toBe(true);
      expect(result.successCount).toBe(SAMPLE_SIZE);
      expect(result.validated).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBe(0);
    });

    it("should detect a mismatch when schemas don't match", async () => {
      // Create a Zod schema that doesn't match the UUID JSON schema
      const zodSchema = z.string().min(100); // This won't match UUID format
      const result = await checkZodMatchesJsonSchema(zodSchema, "uuid.yaml");

      // Should find mismatches since UUIDs generated might not be SAMPLE_SIZE+ chars
      expect(result.validated).toBe(SAMPLE_SIZE);
      expect(result.passed).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });

    it("should return detailed mismatch information", async () => {
      const zodSchema = z.string().min(50); // Won't match UUID
      const result = await checkZodMatchesJsonSchema(zodSchema, "uuid.yaml");

      if (result.mismatches.length > 0) {
        const mismatch = result.mismatches[0];
        expect(mismatch).toHaveProperty("sample");
        expect(mismatch).toHaveProperty("jsonSchemaValid");
        expect(mismatch).toHaveProperty("zodValid");
        // At least one should be false since they don't match
        expect(mismatch.jsonSchemaValid !== mismatch.zodValid).toBe(true);
      }
    });

    it("should handle schema not found error", async () => {
      const zodSchema = z.string();
      await expect(checkZodMatchesJsonSchema(zodSchema, "nonexistent-schema.yaml")).rejects.toThrow(
        'JSON schema "nonexistent-schema.yaml" not found'
      );
    });
  });

  // #########################################################
  // Complex Schema Testing
  // #########################################################

  describe("Complex Schema Testing", () => {
    it("should validate a schema with multiple properties", async () => {
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

      const result = await checkZodMatchesJsonSchema(zodSchema, "Address.yaml");

      // Should have some successes (might have some failures due to generation issues)
      expect(result.validated).toBe(SAMPLE_SIZE);
      // At least some tests should complete
      expect(result.successCount + result.mismatches.length).toBe(result.validated);
    });

    it("should flag when zod schema is missing required properties", async () => {
      const zodSchema = z.object({
        street1: z.string(),
        street2: z.string().optional(),
        city: z.string(),
        // missing stateOrProvince
        // missing country
        // missing postalCode
      });
      const result = await checkZodMatchesJsonSchema(zodSchema, "Address.yaml");

      expect(result.passed).toBe(false);
      expect(result.successCount).toBeLessThan(SAMPLE_SIZE);
      expect(result.validated).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });

    it("should flag when zod schema is missing optional properties", async () => {
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
      const result = await checkZodMatchesJsonSchema(zodSchema, "Address.yaml");
      expect(result.passed).toBe(false);
      expect(result.successCount).toBeLessThan(SAMPLE_SIZE);
      expect(result.validated).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });

    it("should flag when zod schema has extra required properties", async () => {
      const zodSchema = z.object({
        street1: z.string(),
        street2: z.string().optional(),
        city: z.string(),
        stateOrProvince: z.string(),
        country: z.string(),
        postalCode: z.string(),
        extra: z.string(), // extra required property
      });
      const result = await checkZodMatchesJsonSchema(zodSchema, "Address.yaml");
      expect(result.passed).toBe(false);
      expect(result.successCount).toBeLessThan(SAMPLE_SIZE);
      expect(result.validated).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBeGreaterThan(0);
    });

    it("should validate Money schema with $ref to decimalString", async () => {
      // Money.yaml has a $ref to decimalString.yaml for the amount field
      // This tests that $ref resolution works correctly
      const zodSchema = z.object({
        amount: z.string().regex(/^-?[0-9]+\.?[0-9]*$/),
        currency: z.string(),
      });

      const result = await checkZodMatchesJsonSchema(zodSchema, "Money.yaml");

      expect(result.validated).toBe(SAMPLE_SIZE);
      // Log mismatches if any to help debug
      if (result.mismatches.length > 0) {
        console.log(
          "Money schema mismatches:",
          JSON.stringify(result.mismatches.slice(0, 2), null, 2)
        );
      }
      expect(result.passed).toBe(true);
    });

    it("should validate CustomField schema with $ref to CustomFieldType", async () => {
      // CustomField.yaml has a $ref to CustomFieldType.yaml for the fieldType field
      // This tests that enum $refs are resolved correctly
      const zodSchema = z.object({
        name: z.string(),
        fieldType: z.enum(["string", "number", "integer", "boolean", "object", "array"]),
        value: z.unknown(),
        schema: z.url().optional(),
        description: z.string().optional(),
      });

      const result = await checkZodMatchesJsonSchema(zodSchema, "CustomField.yaml");

      expect(result.passed).toBe(true);
      expect(result.validated).toBe(SAMPLE_SIZE);
      expect(result.successCount).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBe(0);
    });

    it("should validate EmailCollection schema with $ref to email", async () => {
      // EmailCollection.yaml has $ref to email.yaml in multiple places
      // This tests nested $ref resolution in complex object structures
      const emailSchema = z.email();
      const zodSchema = z.object({
        primary: emailSchema,
        otherEmails: z.record(z.string(), emailSchema).optional(),
      });

      const result = await checkZodMatchesJsonSchema(zodSchema, "EmailCollection.yaml");

      expect(result.passed).toBe(true);
      expect(result.validated).toBe(SAMPLE_SIZE);
      expect(result.successCount).toBe(SAMPLE_SIZE);
      expect(result.mismatches.length).toBe(0);
    });
  });

  // #########################################################
  // Integration Tests
  // #########################################################

  describe("Integration Tests", () => {
    it("should work end-to-end with a real schema", async () => {
      const zodSchema = z.uuid();
      const result = await checkZodMatchesJsonSchema(zodSchema, "uuid.yaml");

      expect(result.validated).toBe(SAMPLE_SIZE);
      expect(result.passed).toBe(true);
      expect(result.mismatches.length).toBe(0);
    });

    it("should validate multiple schemas in sequence", async () => {
      const uuidSchema = z.uuid();
      const emailSchema = z.email();

      const uuidResult = await checkZodMatchesJsonSchema(uuidSchema, "uuid.yaml");
      const emailResult = await checkZodMatchesJsonSchema(emailSchema, "email.yaml");

      expect(uuidResult.passed).toBe(true);
      expect(emailResult.passed).toBe(true);
    });
  });
});

// #########################################################
// Sample accounting
//
// The harness used to compute `passed` from the absence of mismatches and
// report SAMPLE_SIZE as the number of tests run, so a run that generated
// nothing at all reported success. These cover the accounting itself.
// #########################################################

describe("sample accounting", () => {
  const probeAjv = createAjvFromDefs(
    { Probe: { $id: "Probe.yaml", type: "string" } },
    "synthetic:accounting"
  );

  it("should account for every attempted sample on a clean run", async () => {
    const result = await checkZodMatchesJsonSchema(z.string(), "Probe.yaml", { ajv: probeAjv });

    expect(result.passed).toBe(true);
    expect(result.generationAttempted).toBe(SAMPLE_SIZE);
    expect(result.generationSucceeded).toBe(SAMPLE_SIZE);
    expect(result.generationFailures).toEqual([]);
  });

  it("should fail the run when no sample could be generated", async () => {
    const result = await checkZodMatchesJsonSchema(z.string(), "Probe.yaml", {
      ajv: probeAjv,
      generateSample: async () => {
        throw new Error("generator unavailable");
      },
    });

    // The defect this replaces: zero samples compared, zero mismatches found,
    // `passed: true`.
    expect(result.passed).toBe(false);
    expect(result.generationAttempted).toBe(SAMPLE_SIZE);
    expect(result.generationSucceeded).toBe(0);
    expect(result.validated).toBe(0);
    expect(result.successCount).toBe(0);
    expect(result.generationFailures).toHaveLength(SAMPLE_SIZE);
    expect(result.generationFailures[0].error).toMatch(/generator unavailable/);
  });

  it("should fail the run when only some samples could be generated", async () => {
    let calls = 0;
    const result = await checkZodMatchesJsonSchema(z.string(), "Probe.yaml", {
      ajv: probeAjv,
      generateSample: async () => {
        calls += 1;
        if (calls % 2 === 0) throw new Error("intermittent generator failure");
        return "a string";
      },
    });

    expect(result.passed).toBe(false);
    expect(result.generationAttempted).toBe(SAMPLE_SIZE);
    expect(result.generationFailures.length).toBeGreaterThan(0);
    // Everything that did generate was still compared — a partial run is
    // reported, not discarded.
    expect(result.validated).toBe(result.generationSucceeded);
    expect(result.successCount).toBe(result.generationSucceeded);
  });

  it("should refuse a generated sample the protocol schema rejects", async () => {
    // A sample drawn from the protocol schema that no longer satisfies it makes
    // both validators reject, which reads as agreement and scores as a success.
    // That is the vacuous pass this harness exists to close, so it is a harness
    // defect rather than a quiet result.
    await expect(
      checkZodMatchesJsonSchema(z.string(), "Probe.yaml", {
        ajv: probeAjv,
        generateSample: async () => undefined,
      })
    ).rejects.toThrow(/schema it was generated from rejects/);
  });

  it("should record which samples failed to generate, not merely how many", async () => {
    // The chosen positions are the independent expectation: a harness that only
    // counted failures, or reported them off by one, would not reproduce them.
    const failAt = new Set([0, 7, 24]);
    let index = -1;

    const result = await checkZodMatchesJsonSchema(z.string(), "Probe.yaml", {
      ajv: probeAjv,
      generateSample: async () => {
        index += 1;
        if (failAt.has(index)) throw new Error(`generator gave up at ${index}`);
        return "a string";
      },
    });

    expect(result.generationFailures.map(f => f.index)).toEqual([0, 7, 24]);
    expect(result.generationFailures[0].error).toMatch(/generator gave up at 0/);
    expect(result.generationSucceeded).toBe(SAMPLE_SIZE - 3);
  });
});

// #########################################################
// Boundary cases — the reverse direction
//
// Generated samples are protocol-valid by construction, so they can only catch
// a Zod schema that is stricter than the protocol. These pairs are deliberately
// mismatched synthetic schemas, not production ones, so the coverage does not
// depend on a live model disagreement staying unresolved.
// #########################################################

describe("boundary cases", () => {
  /** Protocol side: a required integer with a lower bound of 1. */
  const boundedAjv = createAjvFromDefs(
    {
      Bounded: {
        $id: "Bounded.yaml",
        type: "object",
        properties: { n: { type: "integer", minimum: 1 } },
        required: ["n"],
      },
    },
    "synthetic:boundary"
  );

  /** Protocol side: a plain non-nullable string. */
  const stringAjv = createAjvFromDefs(
    { Str: { $id: "Str.yaml", type: "string" } },
    "synthetic:boundary"
  );

  it("should catch a Zod schema that accepts below the protocol's lower bound", async () => {
    // Exactly the shape of the live pageSize divergence, on a synthetic pair.
    const permissive = z.object({ n: z.number().int().min(0) });

    const result = await checkZodMatchesJsonSchema(permissive, "Bounded.yaml", {
      ajv: boundedAjv,
      cases: [{ label: "n at zero", value: { n: 0 } }],
    });

    expect(result.passed).toBe(false);
    expect(result.boundaryCases).toBe(1);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0].source).toBe("n at zero");
    expect(result.mismatches[0].zodValid).toBe(true);
    expect(result.mismatches[0].jsonSchemaValid).toBe(false);
  });

  it("should catch a Zod schema that accepts null where the protocol does not", async () => {
    const nullable = z.string().nullable();

    const result = await checkZodMatchesJsonSchema(nullable, "Str.yaml", {
      ajv: stringAjv,
      cases: [{ label: "explicit null", value: null }],
    });

    expect(result.passed).toBe(false);
    expect(result.mismatches[0].source).toBe("explicit null");
    expect(result.mismatches[0].zodValid).toBe(true);
  });

  it("should catch a Zod schema that drops a protocol-required property", async () => {
    const optionalised = z.object({ n: z.number().int().min(1).optional() });

    const result = await checkZodMatchesJsonSchema(optionalised, "Bounded.yaml", {
      ajv: boundedAjv,
      cases: [{ label: "property omitted", value: {} }],
    });

    expect(result.passed).toBe(false);
    expect(result.mismatches[0].source).toBe("property omitted");
    expect(result.mismatches[0].zodValid).toBe(true);
    expect(result.mismatches[0].jsonSchemaValid).toBe(false);
  });

  it("should catch a Zod schema that is stricter than the protocol", async () => {
    const restrictive = z.object({ n: z.number().int().min(10) });

    const result = await checkZodMatchesJsonSchema(restrictive, "Bounded.yaml", {
      ajv: boundedAjv,
      cases: [{ label: "n inside protocol range but below Zod's floor", value: { n: 5 } }],
    });

    expect(result.passed).toBe(false);
    expect(result.mismatches[0].zodValid).toBe(false);
    expect(result.mismatches[0].jsonSchemaValid).toBe(true);
  });

  it("should pass when a boundary case agrees on both sides", async () => {
    const aligned = z.object({ n: z.number().int().min(1) });

    const result = await checkZodMatchesJsonSchema(aligned, "Bounded.yaml", {
      ajv: boundedAjv,
      cases: [
        { label: "n at the shared floor", value: { n: 1 } },
        { label: "n below the shared floor", value: { n: 0 } },
        { label: "n not an integer", value: { n: 1.5 } },
      ],
    });

    expect(result.passed).toBe(true);
    expect(result.boundaryCases).toBe(3);
    expect(result.validated).toBe(SAMPLE_SIZE + 3);
    expect(result.successCount).toBe(SAMPLE_SIZE + 3);
  });
});

// #########################################################
// Tracked divergences
// #########################################################

describe("tracked divergences", () => {
  const boundedAjv = createAjvFromDefs(
    {
      Bounded: {
        $id: "Bounded.yaml",
        type: "object",
        properties: { n: { type: "integer", minimum: 1 } },
        required: ["n"],
      },
    },
    "synthetic:divergence"
  );

  const permissive = z.object({ n: z.number().int().min(0) });

  it("should tolerate a declared divergence that is still real, and report it", async () => {
    const result = await checkZodMatchesJsonSchema(permissive, "Bounded.yaml", {
      ajv: boundedAjv,
      cases: [
        {
          label: "n at zero",
          value: { n: 0 },
          expect: "divergent",
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1130",
        },
      ],
      expectedDivergences: 1,
    });

    expect(result.passed).toBe(true);
    expect(result.mismatches).toEqual([]);
    expect(result.knownDivergences).toEqual([
      { label: "n at zero", issue: "https://github.com/HHS/simpler-grants-protocol/issues/1130" },
    ]);
    expect(result.resolvedDivergences).toEqual([]);
    // A tolerated divergence is not an agreement, so only the generated
    // samples count as successes.
    expect(result.successCount).toBe(SAMPLE_SIZE);
  });

  it("should fail when a tolerated divergence is not declared", async () => {
    // The entry names its owner and still diverges, so nothing is stale. It
    // fails anyway: the caller never said it was tolerating anything.
    const result = await checkZodMatchesJsonSchema(permissive, "Bounded.yaml", {
      ajv: boundedAjv,
      cases: [
        {
          label: "n at zero",
          value: { n: 0 },
          expect: "divergent",
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1130",
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.mismatches).toEqual([]);
    expect(result.knownDivergences).toHaveLength(1);
  });

  it("should fail once a tracked divergence has been fixed", async () => {
    // The Zod schema now agrees with the protocol, so the entry is stale. It has
    // to fail, or a tracked divergence outlives its fix and the list rots.
    const aligned = z.object({ n: z.number().int().min(1) });

    const result = await checkZodMatchesJsonSchema(aligned, "Bounded.yaml", {
      ajv: boundedAjv,
      cases: [
        {
          label: "n at zero",
          value: { n: 0 },
          expect: "divergent",
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1130",
        },
      ],
      expectedDivergences: 1,
    });

    expect(result.passed).toBe(false);
    expect(result.resolvedDivergences).toHaveLength(1);
    expect(result.knownDivergences).toEqual([]);
  });

  it("should refuse a divergent case that names no owning issue", async () => {
    await expect(
      checkZodMatchesJsonSchema(permissive, "Bounded.yaml", {
        ajv: boundedAjv,
        cases: [{ label: "n at zero", value: { n: 0 }, expect: "divergent" }],
      })
    ).rejects.toThrow(/must name the issue/i);
  });
});

// #########################################################
// Wire representation
//
// The SDK accepts a `Date` as input for datetime fields and the protocol
// describes the serialized string. Comparing the runtime value against the
// protocol schema reads as a mismatch even when the SDK is correct, so the
// comparison is made against the JSON wire form.
// #########################################################

describe("wire representation", () => {
  const dateTimeAjv = createAjvFromDefs(
    { Dt: { $id: "Dt.yaml", type: "string", format: "date-time" } },
    "synthetic:wire"
  );

  it("should compare a Date by its serialized form, not its runtime type", async () => {
    const result = await checkZodMatchesJsonSchema(UTCDateTimeSchema, "Dt.yaml", {
      ajv: dateTimeAjv,
      cases: [{ label: "Date instance", value: new Date("2026-01-02T03:04:05Z") }],
    });

    expect(result.passed).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  it("should still reject a value whose wire form violates the format", async () => {
    // Normalizing to the wire form must not become a way of laundering bad
    // values past format validation.
    const result = await checkZodMatchesJsonSchema(UTCDateTimeSchema, "Dt.yaml", {
      ajv: dateTimeAjv,
      cases: [
        { label: "not a datetime at all", value: "yesterday" },
        { label: "date-only string", value: "2026-01-02" },
        { label: "invalid Date instance", value: new Date("nonsense") },
      ],
    });

    // Both sides reject all three, so they agree and the run is clean.
    expect(result.passed).toBe(true);
    expect(result.successCount).toBe(SAMPLE_SIZE + 3);
  });

  it("should not throw on a value with no JSON representation", async () => {
    const result = await checkZodMatchesJsonSchema(UTCDateTimeSchema, "Dt.yaml", {
      ajv: dateTimeAjv,
      cases: [
        { label: "undefined", value: undefined },
        { label: "bigint", value: 10n },
      ],
    });

    expect(result.validated).toBe(SAMPLE_SIZE + 2);
  });
});
