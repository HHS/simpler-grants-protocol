import { ZodType } from "zod";
import { expect } from "vitest";
import {
  checkZodMatchesJsonSchema,
  type BoundaryCase,
  type FuzzTestResult,
} from "./utils/fuzz-test";

/**
 * Validates that a Zod schema matches a JSON schema and throws on failure.
 * This is the main function to use in tests for schema validation.
 *
 * @param zodSchema - The Zod schema to test
 * @param jsonSchemaId - The JSON schema ID
 * @param cases - Deterministic boundary cases probing values the generated
 *   samples cannot reach, because every generated sample is protocol-valid by
 *   construction. Required to catch a Zod schema more permissive than the
 *   protocol.
 * @param expectedDivergences - How many of `cases` are expected to still
 *   diverge. Defaults to 0, so tolerating a divergence has to be declared here,
 *   next to the entries that name their owning issues, and the test fails when
 *   the observed count differs.
 * @returns The comparison result.
 */
export async function expectZodMatchesJsonSchema(
  zodSchema: ZodType,
  jsonSchemaId: string,
  cases: BoundaryCase[] = [],
  expectedDivergences = 0
): Promise<FuzzTestResult> {
  const result = await checkZodMatchesJsonSchema(zodSchema, jsonSchemaId, {
    cases,
    expectedDivergences,
  });

  if (!result.passed) {
    const mismatchDetails = result.mismatches
      .map((m, i) => {
        return `
Mismatch ${i + 1} (${m.source}):
  Sample: ${JSON.stringify(m.sample, null, 2)}
  JSON Schema valid: ${m.jsonSchemaValid}
  Zod valid: ${m.zodValid}
  ${m.jsonSchemaErrors ? `JSON Schema errors: ${m.jsonSchemaErrors.join(", ")}` : ""}
  ${m.zodError ? `Zod error: ${m.zodError}` : ""}`;
      })
      .join("\n");

    const generationDetails = result.generationFailures.length
      ? `\n${result.generationFailures.length} sample(s) could not be generated, ` +
        `so the comparison never ran for them:\n` +
        result.generationFailures.map(f => `  [${f.index}] ${f.error}`).join("\n")
      : "";

    const staleDetails = result.resolvedDivergences.length
      ? `\n${result.resolvedDivergences.length} tracked divergence(s) no longer reproduce. ` +
        `The schemas now agree, so remove the entry (and close out the issue):\n` +
        result.resolvedDivergences.map(d => `  ${d.label} — ${d.issue}`).join("\n")
      : "";

    const divergenceDetails =
      result.knownDivergences.length !== expectedDivergences
        ? `\n${result.knownDivergences.length} tolerated divergence(s) observed but ` +
          `${expectedDivergences} declared. Update the expectedDivergences argument:\n` +
          result.knownDivergences.map(d => `  ${d.label} — ${d.issue}`).join("\n")
        : "";

    throw new Error(
      `Zod schema does not match JSON schema "${jsonSchemaId}". ` +
        `${result.mismatches.length} mismatch(es) found across ${result.validated} validated ` +
        `sample(s) (${result.generationSucceeded}/${result.generationAttempted} generated, ` +
        `${result.boundaryCases} boundary case(s)).\n` +
        `Success rate: ${result.successCount}/${result.validated}\n` +
        generationDetails +
        staleDetails +
        divergenceDetails +
        mismatchDetails
    );
  }

  // If using vitest expect, we can also use it for better test output
  expect(result.passed).toBe(true);
  expect(result.mismatches.length).toBe(0);

  return result;
}
