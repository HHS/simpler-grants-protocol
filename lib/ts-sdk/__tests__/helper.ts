import { ZodSchema } from "zod";
import { expect } from "vitest";
import { checkZodMatchesJsonSchema } from "./utils/fuzz-test";

/**
 * Validates that a Zod schema matches a JSON schema and throws on failure.
 * This is the main function to use in tests for schema validation.
 *
 * @param zodSchema - The Zod schema to test
 * @param jsonSchemaId - The JSON schema ID
 */
export function expectZodMatchesJsonSchema(zodSchema: ZodSchema, jsonSchemaId: string): void {
  const result = checkZodMatchesJsonSchema(zodSchema, jsonSchemaId);

  if (!result.passed) {
    const mismatchDetails = result.mismatches
      .map((m, i) => {
        return `
Mismatch ${i + 1}:
  Sample: ${JSON.stringify(m.sample, null, 2)}
  JSON Schema valid: ${m.jsonSchemaValid}
  Zod valid: ${m.zodValid}
  ${m.jsonSchemaErrors ? `JSON Schema errors: ${m.jsonSchemaErrors.join(", ")}` : ""}
  ${m.zodError ? `Zod error: ${m.zodError}` : ""}`;
      })
      .join("\n");

    throw new Error(
      `Zod schema does not match JSON schema "${jsonSchemaId}". ` +
        `${result.mismatches.length} mismatch(es) found out of ${result.totalTests} tests.\n` +
        `Success rate: ${result.successCount}/${result.totalTests}\n` +
        mismatchDetails
    );
  }

  // If using vitest expect, we can also use it for better test output
  expect(result.passed).toBe(true);
  expect(result.mismatches.length).toBe(0);
}
