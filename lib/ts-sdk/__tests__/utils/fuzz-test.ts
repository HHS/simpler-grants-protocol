import { ZodSchema } from "zod";
import { ajv, validate as validateWithAjv } from "./ajv-validator";
import { JSONSchemaFaker as jsf } from "json-schema-faker";

/** Number of test samples to generate for each schema validation. */
export const SAMPLE_SIZE = 25;

/** Default seed for repeatable test generation. */
export const DEFAULT_SEED = 12345;

/**
 * Creates a seeded random number generator using a Linear Congruential Generator (LCG).
 * This ensures repeatable test cases when the same seed is used.
 *
 * @param seed - The seed value to initialize the generator
 * @returns A function that returns a random number between 0 and 1
 */
function createSeededRandom(seed: number): () => number {
  // LCG parameters (same as used in glibc)
  const a = 1103515245;
  const c = 12345;
  const m = 2 ** 31;
  let state = seed;

  return () => {
    state = (a * state + c) % m;
    return state / m;
  };
}

/** Result of a fuzz test comparison. */
export interface FuzzTestResult {
  /** Whether all tests passed. */
  passed: boolean;
  /** Number of successful matches. */
  successCount: number;
  /** Total number of tests run. */
  totalTests: number;
  /** Array of mismatches found. */
  mismatches: Array<{
    sample: unknown;
    jsonSchemaValid: boolean;
    zodValid: boolean;
    jsonSchemaErrors?: string[];
    zodError?: string;
  }>;
}

/**
 * Resolves $ref references in a schema by looking them up in AJV's schema registry
 * or in the schema's $defs section. This is needed because json-schema-faker
 * doesn't automatically resolve $ref references.
 */
function resolveRefs(
  schema: unknown,
  visited = new Set<string>(),
  currentSchema?: Record<string, unknown>
): unknown {
  if (typeof schema !== "object" || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(item => resolveRefs(item, visited, currentSchema));
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
          const resolvedSchema = resolveRefs(defs[defName], visited, currentSchema);
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
        const resolvedSchema = resolveRefs(referencedSchema, visited, referencedSchema);
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
      resolved[key] = resolveRefs(value, visited, currentSchema);
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
 * Validates that a Zod schema matches a JSON schema by ensuring both schemas
 * validate the same fuzz-tested outputs generated from the JSON schema.
 *
 * @param zodSchema - The Zod schema to test
 * @param jsonSchemaId - The JSON schema ID (e.g., "uuid.yaml", "Address.yaml")
 * @param seed - Optional seed for repeatable test generation. Defaults to DEFAULT_SEED.
 * @returns The result of the fuzz test comparison
 */
export function checkZodMatchesJsonSchema(
  zodSchema: ZodSchema,
  jsonSchemaId: string,
  seed: number = DEFAULT_SEED
): FuzzTestResult {
  // Get the JSON schema from AJV
  const jsonSchemaValidator = ajv.getSchema(jsonSchemaId);
  if (!jsonSchemaValidator) {
    throw new Error(`JSON schema "${jsonSchemaId}" not found`);
  }

  // Get the actual schema object for json-schema-faker
  let jsonSchema = jsonSchemaValidator.schema as Record<string, unknown>;

  // Resolve all $ref references so json-schema-faker can work with it
  jsonSchema = resolveRefs(jsonSchema) as Record<string, unknown>;

  // Use seeded random generator for repeatable tests
  // Combine seed with schema ID hash to ensure different schemas get different sequences
  const schemaSeed = seed + hashString(jsonSchemaId);
  const seededRandom = createSeededRandom(schemaSeed);
  jsf.option("random", seededRandom);

  const mismatches: FuzzTestResult["mismatches"] = [];
  let successCount = 0;

  for (let i = 0; i < SAMPLE_SIZE; i++) {
    // Generate sample data from JSON schema
    let sampleData: unknown;
    try {
      // json-schema-faker generates data that should match the schema
      sampleData = jsf.generate(jsonSchema);
    } catch (error) {
      // If we can't generate data, skip this iteration
      console.warn(`Failed to generate sample data for ${jsonSchemaId}:`, error);
      continue;
    }

    // Validate against JSON schema (should always pass since we generated from it)
    const jsonSchemaResult = validateWithAjv(ajv, jsonSchemaId, sampleData);
    const jsonSchemaValid = jsonSchemaResult.isValid;

    // Validate against Zod schema with strict mode for objects
    // Apply strict() to object schemas to catch extra/missing properties
    const strictSchema =
      "strict" in zodSchema && typeof zodSchema.strict === "function"
        ? zodSchema.strict()
        : zodSchema;
    const zodResult = strictSchema.safeParse(sampleData);
    const zodValid = zodResult.success;

    // Check if both schemas agree
    if (jsonSchemaValid !== zodValid) {
      const mismatch = {
        sample: sampleData,
        jsonSchemaValid,
        zodValid,
        jsonSchemaErrors: jsonSchemaResult.errors || undefined,
        zodError: zodResult.success ? undefined : zodResult.error.message,
      };

      mismatches.push(mismatch);
    } else {
      successCount++;
    }
  }

  return {
    passed: mismatches.length === 0,
    successCount,
    totalTests: SAMPLE_SIZE,
    mismatches,
  };
}
