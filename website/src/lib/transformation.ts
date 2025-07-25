import type { JsonValue, FormData, TransformOutput } from "./types";
import { schemas } from "./schemas";

/**
 * This module provides a utility function for transforming data using a mapping.
 * The transformWithMapping function takes a data object and a mapping object.
 * The mapping object describes how to transform the data object into a new object.
 */

interface HandlerFunction {
  (data: Record<string, JsonValue>, value: JsonValue): JsonValue;
}

interface SwitchSpec {
  field: JsonValue;
  case: Record<string, JsonValue>;
  default?: JsonValue;
}

/**
 * Gets a value from an object using dot notation.
 * @param data - The object to extract the value from
 * @param path - A dot-separated string representing the path to the value
 * @param defaultValue - The default value to return if the path doesn't exist
 * @returns The value at the specified path, or the default value if the path doesn't exist
 * @example
 * ```typescript
 * const data = {
 *   "person": {
 *     "name": "John Doe"
 *   }
 * };
 *
 * const path = "person.name";
 * const defaultValue = "Unknown";
 *
 * const value = getFromPath(data, path, defaultValue);
 * // value === "John Doe"
 * ```
 */
function getFromPath(
  data: Record<string, JsonValue>,
  path: string,
  defaultValue: JsonValue = null,
): JsonValue {
  const parts = path.split(".");
  let current: JsonValue = data;

  for (const part of parts) {
    if (current !== null && typeof current === "object") {
      current = (current as Record<string, JsonValue>)[part];
    } else {
      return defaultValue;
    }
  }

  return current;
}

/**
 * Handles a field transformation by extracting a value from the data using the specified field path.
 */
const pluckFieldValue: HandlerFunction = (data, fieldPath) => {
  if (typeof fieldPath !== "string") {
    return null;
  }
  return getFromPath(data, fieldPath);
};

/**
 * Handles a match transformation by looking up a value in a case dictionary.
 */
const switchOnValue: HandlerFunction = (data, switchSpec) => {
  if (!isValidSwitchSpec(switchSpec)) {
    return null;
  }

  const fieldValue = getFromPath(data, String(switchSpec.field));
  return switchSpec.case[String(fieldValue)] ?? switchSpec.default ?? null;
};

/**
 * Type guard to check if a value is a valid SwitchSpec
 */
function isValidSwitchSpec(value: unknown): value is SwitchSpec {
  return (
    typeof value === "object" &&
    value !== null &&
    "field" in value &&
    "case" in value &&
    typeof (value as SwitchSpec).case === "object" &&
    (value as SwitchSpec).case !== null
  );
}

// Registry for handlers
const DEFAULT_HANDLERS: Record<string, HandlerFunction> = {
  field: pluckFieldValue,
  switch: switchOnValue,
};

/**
 * Transforms a data object according to a mapping specification.
 *
 * The mapping supports both literal values and transformations keyed by
 * the following reserved words:
 * - `field`: Extracts a value from the data using a dot-notation path
 * - `switch`: Performs a case-based lookup based on a field value
 *
 * @param data - The source data object to transform
 * @param mapping - An object describing how to transform the data
 * @param depth - Current recursion depth (used internally)
 * @param maxDepth - Maximum allowed recursion depth
 * @param handlers - An object of handler functions to use for the transformations
 *
 * @example
 * ```typescript
 * const sourceData = {
 *   opportunity_status: "closed",
 *   opportunity_amount: 1000,
 * };
 *
 * const mapping = {
 *   status: { field: "opportunity_status" },
 *   amount: {
 *     value: { field: "opportunity_amount" },
 *     currency: "USD",
 *   },
 * };
 *
 * const result = transformWithMapping(sourceData, mapping);
 *
 * // result equals:
 * // {
 * //   status: "closed",
 * //   amount: {
 * //     value: 1000,
 * //     currency: "USD",
 * //   },
 * // }
 * ```
 */
export function transformWithMapping(
  data: Record<string, JsonValue>,
  mapping: Record<string, JsonValue>,
  depth: number = 0,
  maxDepth: number = 500,
  handlers: Record<string, HandlerFunction> = DEFAULT_HANDLERS,
): Record<string, JsonValue> {
  // Check for maximum depth
  // This is a sanity check to prevent stack overflow from deeply nested mappings
  // which may be a concern when running this function on third-party mappings
  if (depth > maxDepth) {
    throw new Error("Maximum transformation depth exceeded.");
  }

  function transformNode(node: JsonValue, depth: number): JsonValue {
    // Check for maximum depth
    // This is a sanity check to prevent stack overflow from deeply nested mappings
    // which may be a concern when running this function on third-party mappings
    if (depth > maxDepth) {
      throw new Error("Maximum transformation depth exceeded.");
    }

    // If the node is not an object, return as is
    // This allows users to set a key to a constant value (string or number)
    if (typeof node !== "object" || node === null || Array.isArray(node)) {
      return node;
    }

    const entries = Object.entries(node);
    if (entries.length === 0) {
      return node;
    }

    // Walk through each key in the current node
    const [[key, value]] = entries;

    // If the key is a reserved word, call the matching handler function
    // on the value and return the result.
    // Example: `{ "field": "opportunity_status" }`
    // Returns: `extract_field_value(data, "opportunity_status")`
    if (key in handlers) {
      return handlers[key](data, value);
    }

    // Otherwise, preserve the object structure and
    // recursively apply the transformation to each value.
    // Example:
    // ```
    // {
    //   "status": { "field": "opportunity_status" },
    //   "amount": { "field": "opportunity_amount" },
    // }
    // ```
    // Returns:
    // ```
    // {
    //   "status": transformNode({ "field": "opportunity_status" }, depth + 1)
    //   "amount": transformNode({ "field": "opportunity_amount" }, depth + 1)
    // }
    // ```
    return Object.fromEntries(
      entries.map(([k, v]) => [k, transformNode(v, depth + 1)]),
    );
  }

  // Recursively walk the mapping until all nested transformations are applied
  return transformNode(mapping, depth) as Record<string, JsonValue>;
}

/**
 * Maps JSON data from one form schema to another using the common data format as an intermediary.
 *
 * @param data - The source form data
 * @param sourceId - The ID of the source form schema
 * @param targetId - The ID of the target form schema
 * @returns A TransformOutput object containing the transformation results
 */
export function mapJson(
  data: FormData,
  sourceId: string,
  targetId: string,
): TransformOutput {
  const sourceSchema = schemas[sourceId];
  const targetSchema = schemas[targetId];

  if (!sourceSchema || !targetSchema) {
    throw new Error("Source or target schema not found");
  }

  const commonData = transformWithMapping(
    data,
    sourceSchema.mappingToCommon as FormData,
  );

  const targetData = transformWithMapping(
    commonData,
    targetSchema.mappingFromCommon as FormData,
  );

  return {
    timestamp: Date.now(),
    source: sourceId,
    target: targetId,
    commonData,
    targetData,
  };
}
