import { ZodType } from "zod";
import type Ajv2020 from "ajv/dist/2020";
import { ajv as defaultAjv, validate as validateWithAjv } from "./ajv-validator";
import { generate } from "json-schema-faker";

/** Number of test samples to generate for each schema validation. */
export const SAMPLE_SIZE = 25;

/** Default seed for repeatable test generation. */
export const DEFAULT_SEED = 12345;

/** A single disagreement between the Zod schema and the protocol schema. */
export interface FuzzTestMismatch {
  /** Label identifying where the sample came from. */
  source: string;
  sample: unknown;
  jsonSchemaValid: boolean;
  zodValid: boolean;
  jsonSchemaErrors?: string[];
  zodError?: string;
}

/**
 * A hand-written sample fed to both validators, used to probe the part of the
 * value space generated samples cannot reach.
 */
export interface BoundaryCase {
  /** Human-readable identifier, used in failure output. */
  label: string;
  /** The value to put past both validators. */
  value: unknown;
  /**
   * What the two validators are expected to do with `value`:
   *
   * - `"agree"` (default) — both must reach the same verdict. This is the assertion.
   * - `"divergent"` — they are known to disagree today and the fix is tracked
   *   elsewhere. The disagreement is tolerated, *and the case fails once it
   *   stops disagreeing*, so an entry cannot outlive the fix it is waiting on.
   *
   * Known limit of `"divergent"`: it asserts only *that* the two validators
   * disagree, not that they disagree for the reason the label names. If the
   * tracked divergence were fixed and a different one appeared in the same
   * value, the entry would absorb it and still report green. Keep each
   * divergent value one field away from a known-good baseline, and keep the
   * agreeing controls that cover that baseline, so a substituted failure
   * surfaces there instead.
   */
  expect?: "agree" | "divergent";
  /** The issue that owns the fix. Required when `expect` is `"divergent"`. */
  issue?: string;
}

/** A boundary case whose divergence is tracked against an owning issue. */
export interface TrackedDivergence {
  label: string;
  issue: string;
}

/** Result of a fuzz test comparison. */
export interface FuzzTestResult {
  /** Whether the run is clean: every sample accounted for and every expectation met. */
  passed: boolean;
  /** Number of samples on which the two schemas agreed as expected. */
  successCount: number;
  /** Samples the harness tried to generate from the protocol schema. */
  generationAttempted: number;
  /** Samples the generator actually produced. */
  generationSucceeded: number;
  /** Explicit boundary cases supplied by the caller. */
  boundaryCases: number;
  /** Samples that reached the Zod-vs-protocol comparison. */
  validated: number;
  /** Samples that could not be generated. A non-empty list fails the run. */
  generationFailures: Array<{ index: number; error: string }>;
  /** Array of mismatches found. */
  mismatches: FuzzTestMismatch[];
  /** Divergences that are still real, each naming the issue that owns the fix. */
  knownDivergences: TrackedDivergence[];
  /** Divergences that no longer reproduce, so their entry is stale. Fails the run. */
  resolvedDivergences: TrackedDivergence[];
}

/** Options for {@link checkZodMatchesJsonSchema}. */
export interface FuzzTestOptions {
  /** Seed for repeatable generation. Defaults to {@link DEFAULT_SEED}. */
  seed?: number;
  /**
   * Deterministic boundary cases, run after the generated samples. This is the
   * only way to probe values the protocol rejects but a more permissive SDK
   * schema accepts, since generated samples are protocol-valid by construction.
   */
  cases?: BoundaryCase[];
  /**
   * The validator holding the reference schemas. Defaults to the shared
   * instance built from the TypeSpec output. Tests override it to compare
   * against deliberately mismatched synthetic schemas.
   */
  ajv?: Ajv2020;
  /**
   * Sample generator, defaulting to json-schema-faker. Injectable because
   * json-schema-faker returns a value for almost any input, so the harness's
   * own generation-failure accounting cannot otherwise be exercised.
   */
  generateSample?: (schema: unknown, seed: number) => Promise<unknown>;
}

/**
 * Resolves $ref references in a schema by looking them up in AJV's schema registry
 * or in the schema's $defs section. This is needed because json-schema-faker
 * doesn't automatically resolve $ref references.
 */
function resolveRefs(
  ajv: Ajv2020,
  schema: unknown,
  visited = new Set<string>(),
  currentSchema?: Record<string, unknown>
): unknown {
  if (typeof schema !== "object" || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(item => resolveRefs(ajv, item, visited, currentSchema));
  }

  const schemaObj = schema as Record<string, unknown>;

  // On first call, use the schema itself as the current schema
  if (!currentSchema) {
    currentSchema = schemaObj;
  }

  // If this is a $ref, resolve it
  if ("$ref" in schemaObj && typeof schemaObj.$ref === "string") {
    const refId = schemaObj.$ref;
    // Avoid circular references
    if (visited.has(refId)) {
      return schemaObj;
    }

    visited.add(refId);

    // Check if it's a $defs reference (starts with #/$defs/)
    if (refId.startsWith("#/$defs/")) {
      const defName = refId.replace("#/$defs/", "");
      // Use the current schema's $defs, not the root schema
      if (currentSchema.$defs && typeof currentSchema.$defs === "object") {
        const defs = currentSchema.$defs as Record<string, unknown>;
        if (defName in defs) {
          const resolvedSchema = resolveRefs(ajv, defs[defName], visited, currentSchema);
          visited.delete(refId);
          return resolvedSchema;
        }
      }
    } else {
      // Look up the referenced schema in AJV
      const refValidator = ajv.getSchema(refId);
      if (refValidator && refValidator.schema) {
        // When resolving an external reference, use that schema as the new current schema
        const referencedSchema = refValidator.schema as Record<string, unknown>;
        const resolvedSchema = resolveRefs(ajv, referencedSchema, visited, referencedSchema);
        visited.delete(refId);
        return resolvedSchema;
      }
    }

    visited.delete(refId);
    return schemaObj;
  }

  // Recursively resolve all properties
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schemaObj)) {
    // Preserve $defs in the current schema so json-schema-faker can access them if needed
    if (key === "$defs" && schemaObj === currentSchema) {
      resolved[key] = value;
    } else {
      resolved[key] = resolveRefs(ajv, value, visited, currentSchema);
    }
  }

  return resolved;
}

/**
 * Simple hash function to convert a string to a number.
 * Used to create unique seeds for different schema IDs.
 *
 * @param str - The string to hash
 * @returns A numeric hash value
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash | 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Converts a value to the JSON representation it would have on the wire.
 *
 * The protocol schemas describe serialized data: a datetime is
 * `{ type: "string", format: "date-time" }`. The SDK, by contrast, accepts a
 * `Date` as input and returns one from `parse`. Handing that `Date` straight to
 * AJV compares a runtime object against a string constraint and reports a
 * mismatch the SDK did not make. Serializing first compares the two schemas on
 * the representation they both actually describe — and keeps format validation
 * meaningful, since the result is the string a consumer would receive.
 *
 * A value with no JSON form (a `bigint`, a cycle, bare `undefined`) is passed
 * through unchanged so the reference validator can reject it on its merits
 * rather than the harness throwing.
 *
 * Only the reference side is normalized; Zod still sees the original value,
 * because the SDK's whole point is accepting runtime values a consumer would
 * serialize. One consequence for boundary-case authors: an object with an
 * `undefined`-valued key loses that key here but keeps it in the Zod `.strict()`
 * check, which reports a mismatch. Omit the key rather than setting it to
 * `undefined`.
 */
function toWire(value: unknown): unknown {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? value : JSON.parse(serialized);
  } catch {
    return value;
  }
}

/** Default sample generator: json-schema-faker, seeded for repeatability. */
async function generateWithFaker(schema: unknown, seed: number): Promise<unknown> {
  return generate(schema as Parameters<typeof generate>[0], { seed });
}

/**
 * Validates that a Zod schema matches a JSON schema by ensuring both schemas
 * reach the same verdict on the same samples.
 *
 * Samples come from json-schema-faker, driven by the protocol schema. Note the
 * direction: every generated sample is protocol-valid by construction, so this
 * pass can only catch a Zod schema that is *stricter* than the protocol. A Zod
 * schema that accepts a superset of the protocol's domain is invisible to it —
 * there is no generated sample in the gap. Pass explicit boundary cases to
 * cover the other direction.
 *
 * @param zodSchema - The Zod schema to test
 * @param jsonSchemaId - The JSON schema ID (e.g., "uuid.yaml", "Address.yaml")
 * @param options - Seed, reference validator, and generator overrides
 * @returns The result of the fuzz test comparison
 */
export async function checkZodMatchesJsonSchema(
  zodSchema: ZodType,
  jsonSchemaId: string,
  options: FuzzTestOptions = {}
): Promise<FuzzTestResult> {
  const {
    seed = DEFAULT_SEED,
    ajv = defaultAjv,
    cases = [],
    generateSample = generateWithFaker,
  } = options;

  // A tolerated divergence without an owner is an untracked bug with a test
  // vouching for it. Refuse it before any comparison runs.
  for (const boundaryCase of cases) {
    if (boundaryCase.expect === "divergent" && !boundaryCase.issue) {
      throw new Error(
        `Boundary case "${boundaryCase.label}" on "${jsonSchemaId}" is marked divergent but ` +
          `must name the issue that owns the fix.`
      );
    }
  }

  // Get the JSON schema from AJV
  const jsonSchemaValidator = ajv.getSchema(jsonSchemaId);
  if (!jsonSchemaValidator) {
    throw new Error(`JSON schema "${jsonSchemaId}" not found`);
  }

  // Get the actual schema object for json-schema-faker
  let jsonSchema = jsonSchemaValidator.schema as Record<string, unknown>;

  // Resolve all $ref references so json-schema-faker can work with it
  jsonSchema = resolveRefs(ajv, jsonSchema) as Record<string, unknown>;

  // Combine seed with schema ID hash to ensure different schemas get different sequences
  const schemaSeed = seed + hashString(jsonSchemaId);

  // Apply strict() to object schemas to catch extra/missing properties
  const strictSchema =
    "strict" in zodSchema && typeof zodSchema.strict === "function"
      ? zodSchema.strict()
      : zodSchema;

  const mismatches: FuzzTestMismatch[] = [];
  const generationFailures: FuzzTestResult["generationFailures"] = [];
  const knownDivergences: TrackedDivergence[] = [];
  const resolvedDivergences: TrackedDivergence[] = [];
  let successCount = 0;
  let validated = 0;

  /**
   * Runs one sample past both validators.
   *
   * @param source - Label identifying where the sample came from
   * @param sample - The value to compare
   * @param requireProtocolValid - Whether the sample is required to satisfy the
   *   protocol schema. True for generated samples, which are drawn *from* that
   *   schema: if one no longer satisfies it, both validators reject it, they
   *   agree, and the comparison counts as a success while proving nothing. That
   *   is the same vacuous-pass shape this harness exists to close, so it is a
   *   harness defect rather than a test result, and it throws.
   * @returns The disagreement between the two validators, or `null` when they
   *   agreed.
   */
  const compare = (
    source: string,
    sample: unknown,
    requireProtocolValid = false
  ): FuzzTestMismatch | null => {
    validated++;

    // The protocol describes serialized data, so compare it against the wire
    // form. Generated samples are already plain JSON, which makes this a no-op
    // for them; it matters for boundary cases carrying runtime values.
    const jsonSchemaResult = validateWithAjv(ajv, jsonSchemaId, toWire(sample));
    const jsonSchemaValid = jsonSchemaResult.isValid;

    if (requireProtocolValid && !jsonSchemaValid) {
      throw new Error(
        `The generator produced a sample for "${jsonSchemaId}" (${source}) that the ` +
          `schema it was generated from rejects: ` +
          `${(jsonSchemaResult.errors ?? []).join(", ") || "no error detail"}. ` +
          `Both validators would reject it, so the comparison would agree and count ` +
          `as a success without checking anything.`
      );
    }

    const zodResult = strictSchema.safeParse(sample);
    const zodValid = zodResult.success;

    if (jsonSchemaValid === zodValid) {
      return null;
    }

    return {
      source,
      sample,
      jsonSchemaValid,
      zodValid,
      jsonSchemaErrors: jsonSchemaResult.errors || undefined,
      zodError: zodResult.success ? undefined : zodResult.error.message,
    };
  };

  for (let i = 0; i < SAMPLE_SIZE; i++) {
    // Generate sample data from JSON schema, varying the seed per iteration
    let sampleData: unknown;
    try {
      sampleData = await generateSample(jsonSchema, schemaSeed + i);
    } catch (error) {
      // Record the failure rather than skipping it. A skipped iteration used to
      // vanish from the totals, so a run that generated nothing still reported
      // zero mismatches and therefore success.
      generationFailures.push({ index: i, error: (error as Error).message });
      continue;
    }

    const disagreement = compare(`generated[${i}]`, sampleData, true);
    if (disagreement) {
      mismatches.push(disagreement);
    } else {
      successCount++;
    }
  }

  for (const boundaryCase of cases) {
    const disagreement = compare(boundaryCase.label, boundaryCase.value);

    if (boundaryCase.expect !== "divergent") {
      if (disagreement) {
        mismatches.push(disagreement);
      } else {
        successCount++;
      }
      continue;
    }

    const tracked = { label: boundaryCase.label, issue: boundaryCase.issue as string };
    if (disagreement) {
      knownDivergences.push(tracked);
      successCount++;
    } else {
      // The two schemas now agree, so the entry describes a divergence that no
      // longer exists. Fail, so the list cannot outlive what it tracks.
      resolvedDivergences.push(tracked);
    }
  }

  const generationSucceeded = SAMPLE_SIZE - generationFailures.length;

  return {
    passed:
      generationFailures.length === 0 &&
      validated === SAMPLE_SIZE + cases.length &&
      mismatches.length === 0 &&
      resolvedDivergences.length === 0,
    successCount,
    generationAttempted: SAMPLE_SIZE,
    generationSucceeded,
    boundaryCases: cases.length,
    validated,
    generationFailures,
    mismatches,
    knownDivergences,
    resolvedDivergences,
  };
}
