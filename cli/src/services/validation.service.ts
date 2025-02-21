import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import mergeAllOf from "json-schema-merge-allof";

import { ValidationService, ValidationOptions, SpecValidationOptions } from "./interfaces";

export class DefaultValidationService implements ValidationService {
  async checkApi(apiUrl: string, specPath: string, options: ValidationOptions): Promise<void> {
    console.log("Mock: Checking API", { apiUrl, specPath, options });
  }

  async checkSpec(specPath: string, options: SpecValidationOptions): Promise<void> {
    console.log("Mock: Checking spec compliance", { specPath, options });
  }
}

/**
 * A structured representation of any compliance issue found.
 */
interface ComplianceError {
  message: string;
  location?: string; // e.g. path to route or schema property
  details?: string;
}

/**
 * Compare two OpenAPI specs to check compliance against a "base" spec.
 *
 * @param baseSpecPath Path or URL to the base spec.
 * @param implSpecPath Path or URL to the implementation spec.
 * @returns A list of compliance errors (empty if fully compliant).
 */
export async function compareOpenApiSpecs(
  baseSpecPath: string,
  implSpecPath: string
): Promise<ComplianceError[]> {
  // 1) Fully parse and dereference both specs
  const baseDoc = (await SwaggerParser.dereference(baseSpecPath)) as OpenAPIV3.Document;
  const implDoc = (await SwaggerParser.dereference(implSpecPath)) as OpenAPIV3.Document;

  let errors: ComplianceError[] = [];

  // 2) Check for missing required routes
  errors = errors.concat(checkMissingRequiredRoutes(baseDoc, implDoc));

  // 3) Check for extra routes
  errors = errors.concat(checkExtraRoutes(baseDoc, implDoc));

  // 4) Compare all matching routes
  errors = errors.concat(checkMatchingRoutes(baseDoc, implDoc));

  return errors;
}

/**
 * Check for routes that have a "required" tag in the base spec
 * but are missing in the implementation.
 */
export function checkMissingRequiredRoutes(
  baseDoc: OpenAPIV3.Document,
  implDoc: OpenAPIV3.Document
): ComplianceError[] {
  const errors: ComplianceError[] = [];
  const basePaths = baseDoc.paths || {};
  const implPaths = implDoc.paths || {};

  // Collect path+method combos in base that have "required" in their tags
  const requiredOperations: Array<{ path: string; method: string }> = [];

  for (const [path, pathItem] of Object.entries(basePaths)) {
    if (!pathItem) continue;
    for (const method of Object.keys(pathItem)) {
      const operation = (pathItem as any)[method] as OpenAPIV3.OperationObject;
      if (!operation?.tags) continue;
      if (operation.tags.includes("required")) {
        requiredOperations.push({ path, method });
      }
    }
  }

  // Check if the implementation doc contains each required route
  for (const { path, method } of requiredOperations) {
    const implPathItem = implPaths[path];
    if (!implPathItem) {
      errors.push({
        message: `Missing required path '${path}'`,
        location: path,
      });
      continue;
    }

    const implOperation = (implPathItem as any)[method];
    if (!implOperation) {
      errors.push({
        message: `Missing required operation [${method.toUpperCase()}] on path '${path}'`,
        location: `${path}.${method}`,
      });
    }
  }

  return errors;
}

/**
 * Check for routes that exist in the implementation but do not exist in the base
 * and are not prefixed with "/custom/".
 */
export function checkExtraRoutes(
  baseDoc: OpenAPIV3.Document,
  implDoc: OpenAPIV3.Document
): ComplianceError[] {
  const errors: ComplianceError[] = [];
  const basePaths = baseDoc.paths || {};
  const implPaths = implDoc.paths || {};

  for (const [implPath, implPathItem] of Object.entries(implPaths)) {
    // If this path does not exist in the base
    if (!basePaths[implPath]) {
      // And it's not under /custom/...
      if (!implPath.startsWith("/custom/")) {
        errors.push({
          message: `Extra route found '${implPathItem?.summary}' at '${implPath}' that is not in base and not prefixed with '/custom/'`,
          location: implPath,
        });
      }
    }
  }
  return errors;
}

/**
 * For each path+method that exists in both specs, run deeper checks.
 */
export function checkMatchingRoutes(
  baseDoc: OpenAPIV3.Document,
  implDoc: OpenAPIV3.Document
): ComplianceError[] {
  const errors: ComplianceError[] = [];

  const basePaths = baseDoc.paths || {};
  const implPaths = implDoc.paths || {};

  // For each path in baseDoc, see if it exists in implDoc
  for (const [basePathKey, basePathItem] of Object.entries(basePaths)) {
    if (!basePathItem) continue;
    const implPathItem = implPaths[basePathKey];
    if (!implPathItem) {
      // If missing, already flagged in checkMissingRequiredRoutes
      continue;
    }

    // For each method in the base path
    for (const method of Object.keys(basePathItem)) {
      const baseOp = (basePathItem as any)[method] as OpenAPIV3.OperationObject | undefined;
      if (!baseOp) continue;

      const implOp = (implPathItem as any)[method] as OpenAPIV3.OperationObject | undefined;
      if (!implOp) {
        // Possibly flagged as missing
        continue;
      }

      // Both base and impl define this route => deeper checks:
      errors.push(...checkMatchingRoute(basePathKey, method, baseOp, implOp));
    }
  }

  return errors;
}

/**
 * Compare a single route (defined in both base and impl) for compliance.
 */
function checkMatchingRoute(
  path: string,
  method: string,
  baseOp: OpenAPIV3.OperationObject,
  implOp: OpenAPIV3.OperationObject
): ComplianceError[] {
  const location = `${path}.${method.toUpperCase()}`;
  let errors: ComplianceError[] = [];

  // 1) Check status codes
  errors = errors.concat(checkStatusCodes(location, baseOp, implOp));

  // 2) For each matching status code, compare response schemas
  if (baseOp.responses && implOp.responses) {
    for (const statusCode of Object.keys(baseOp.responses)) {
      const baseResp = baseOp.responses[statusCode] as OpenAPIV3.ResponseObject | undefined;
      const implResp = implOp.responses[statusCode] as OpenAPIV3.ResponseObject | undefined;

      if (!implResp) continue; // Possibly flagged in checkStatusCodes

      errors = errors.concat(
        checkResponseSchemas(`${location}.responses.${statusCode}`, baseResp, implResp)
      );
    }
  }

  // 3) (Optional) Check requestBody schemas, parameters, etc.

  return errors;
}

/**
 * Check status codes: missing or extra codes
 */
function checkStatusCodes(
  location: string,
  baseOp: OpenAPIV3.OperationObject,
  implOp: OpenAPIV3.OperationObject
): ComplianceError[] {
  const errors: ComplianceError[] = [];
  const baseRespCodes = Object.keys(baseOp.responses || {});
  const implRespCodes = Object.keys(implOp.responses || {});

  // Find missing status codes
  for (const code of baseRespCodes) {
    if (!implRespCodes.includes(code)) {
      errors.push({
        message: `Missing response status code [${code}]`,
        location: `${location}.responses.${code}`,
      });
    }
  }

  // (Optional) Disallow extra codes
  // for (const code of implRespCodes) {
  //   if (!baseRespCodes.includes(code)) {
  //     errors.push({
  //       message: `Implementation has extra response status code [${code}] not in base`,
  //       location: `${location}.responses.${code}`
  //     });
  //   }
  // }

  return errors;
}

/**
 * Compare the response content schemas for a single status code.
 */
function checkResponseSchemas(
  location: string,
  baseResponse: OpenAPIV3.ResponseObject | undefined,
  implResponse: OpenAPIV3.ResponseObject | undefined
): ComplianceError[] {
  const errors: ComplianceError[] = [];
  if (!baseResponse || !implResponse) return errors;

  if (baseResponse.content) {
    for (const [mimeType, baseMedia] of Object.entries(baseResponse.content)) {
      if (!implResponse.content) {
        errors.push({
          message: `Implementation missing content for expected mime type(s)`,
          location,
        });
        continue;
      }

      const implMedia = implResponse.content[mimeType];
      if (!implMedia?.schema) {
        errors.push({
          message: `Implementation missing schema for expected mime type [${mimeType}]`,
          location: `${location}.${mimeType}`,
        });
        continue;
      }

      // Flatten recursively
      const baseSchema = deepFlattenAllOf(baseMedia.schema as OpenAPIV3.SchemaObject);
      const implSchema = deepFlattenAllOf(implMedia.schema as OpenAPIV3.SchemaObject);

      // Deeper check: see if implSchema is a valid "subset" of baseSchema
      errors.push(...checkSchemaCompatibility(`${location}.${mimeType}`, baseSchema, implSchema));
    }
  }

  return errors;
}

/**
 * Deeply flatten `allOf` in a schema by:
 *   1) Merging top-level allOf into a single schema
 *   2) Recursively descending into properties, items, additionalProperties, etc.
 *   3) Repeating if new allOfs appear after merging
 */
function deepFlattenAllOf(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  // 1) Merge top-level allOf (if any)
  let mergedSchema = mergeOneLevelAllOf(schema);

  // 2) Recursively flatten sub-schemas
  mergedSchema = recursivelyFlattenSubSchemas(mergedSchema);

  // 3) It's possible the recursion introduced new top-level allOfs
  //    (in rare cases if merging merges references in a certain way).
  //    So we can repeat until stable if desired:
  //    But usually one pass is sufficient for top-level.
  mergedSchema = mergeOneLevelAllOf(mergedSchema);

  return mergedSchema;
}

/**
 * Merge top-level allOf (only) if present on a schema using `json-schema-merge-allof`.
 * Returns a new schema with top-level `allOf` removed.
 */
function mergeOneLevelAllOf(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  if (schema.allOf && schema.allOf.length > 0) {
    // The library merges top-level `allOf` into a new schema
    const merged = mergeAllOf(schema, { ignoreAdditionalProperties: false });
    return merged as OpenAPIV3.SchemaObject;
  }
  return schema;
}

/**
 * Recursively flatten sub-schemas in properties, items, additionalProperties, etc.
 */
function recursivelyFlattenSubSchemas(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  // We only handle object fields if the schema is actually an object in practice
  // (or we handle them unconditionally, depending on your usage).
  // If `schema.type` is "object" or is missing, we still might have `properties`.
  if (schema.properties && typeof schema.properties === "object") {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propSchema && typeof propSchema === "object") {
        schema.properties[propName] = deepFlattenAllOf(propSchema as OpenAPIV3.SchemaObject);
      }
    }
  }

  // If the schema is an array type and has an `items` property that is an object
  if (schema.type === "array" && schema.items && typeof schema.items === "object") {
    schema.items = deepFlattenAllOf(schema.items as OpenAPIV3.SchemaObject);
  }

  // If the schema has `additionalProperties` as an object
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    schema.additionalProperties = deepFlattenAllOf(
      schema.additionalProperties as OpenAPIV3.SchemaObject
    );
  }

  return schema;
}

/**
 * Checks whether `implSchema` is a valid subset of `baseSchema`.
 *
 * We treat `baseSchema` as more "generic". That means:
 *  1) If baseSchema.type is undefined, that is "any" => allow impl any type
 *  2) If baseSchema has `additionalProperties` as a schema, any extra fields in impl
 *     must conform to that schema
 *  3) Required fields in baseSchema must be present in impl
 *  4) If baseSchema has a typed property (e.g. 'string', 'object'), then
 *     impl must match that type (unless base has no type).
 *  5) If baseSchema has an enum, impl must include all base enum values
 */
export function checkSchemaCompatibility(
  location: string,
  baseSchema: OpenAPIV3.SchemaObject,
  implSchema: OpenAPIV3.SchemaObject
): ComplianceError[] {
  const errors: ComplianceError[] = [];

  // 1) Compare `type`: skip if base has no type
  if (baseSchema.type && implSchema.type) {
    if (baseSchema.type !== implSchema.type) {
      errors.push({
        message: `Type mismatch. Base is '${baseSchema.type}', impl is '${implSchema.type}'`,
        location,
      });
    }
  }

  // 2) If the schema is object-typed (or base type is missing), compare properties
  if (baseSchema.type === "object" || (!baseSchema.type && implSchema.type === "object")) {
    errors.push(...checkObjectCompatibility(location, baseSchema, implSchema));
  }

  // 3) If the schema has an enum, verify that impl includes all base enum values
  if (Array.isArray(baseSchema.enum) && Array.isArray(implSchema.enum)) {
    for (const baseVal of baseSchema.enum) {
      if (!implSchema.enum.includes(baseVal)) {
        errors.push({
          message: `Enum mismatch. Missing '${baseVal}' in implementation`,
          location,
        });
      }
    }
  }

  return errors;
}

/**
 * Compare object-type schemas:
 *   - check required props
 *   - check each base prop
 *   - allow additional props if base has `additionalProperties`
 */
function checkObjectCompatibility(
  location: string,
  baseSchema: OpenAPIV3.SchemaObject,
  implSchema: OpenAPIV3.SchemaObject
): ComplianceError[] {
  const errors: ComplianceError[] = [];
  const baseProps = baseSchema.properties || {};
  const implProps = implSchema.properties || {};

  // 1) Check required fields in base
  if (Array.isArray(baseSchema.required)) {
    for (const requiredProp of baseSchema.required) {
      if (!(requiredProp in implProps)) {
        errors.push({
          message: `Missing required property '${requiredProp}'`,
          location: `${location}.properties.${requiredProp}`,
        });
      }
    }
  }

  // 2) Compare each property that base defines
  for (const [propName, basePropSchema] of Object.entries(baseProps)) {
    const baseProp = basePropSchema as OpenAPIV3.SchemaObject;
    const implProp = implProps[propName] as OpenAPIV3.SchemaObject | undefined;

    if (!implProp) {
      // Possibly flagged above if it's required
      continue;
    }

    // Flatten again in case there's deeper allOf
    const flattenedBaseProp = deepFlattenAllOf(baseProp);
    const flattenedImplProp = deepFlattenAllOf(implProp);

    // Recurse
    errors.push(
      ...checkSchemaCompatibility(
        `${location}.properties.${propName}`,
        flattenedBaseProp,
        flattenedImplProp
      )
    );
  }

  // 3) Check if impl has extra properties that base does not define
  for (const implPropName of Object.keys(implProps)) {
    if (!(implPropName in baseProps)) {
      // => This is an extra field in impl
      // If baseSchema.additionalProperties is false/undefined => error
      if (
        typeof baseSchema.additionalProperties === "undefined" ||
        baseSchema.additionalProperties === false
      ) {
        errors.push({
          message: `Implementation schema has extra property '${implPropName}' not defined in base schema (and 'additionalProperties' is not allowed)`,
          location: `${location}.properties.${implPropName}`,
        });
      } else if (typeof baseSchema.additionalProperties === "object") {
        // If additionalProperties is a schema, check subset
        const extraProp = implProps[implPropName] as OpenAPIV3.SchemaObject;
        const flattenedBaseAdditional = deepFlattenAllOf(
          baseSchema.additionalProperties as OpenAPIV3.SchemaObject
        );
        const flattenedImplProp = deepFlattenAllOf(extraProp);

        errors.push(
          ...checkSchemaCompatibility(
            `${location}.properties.${implPropName}`,
            flattenedBaseAdditional,
            flattenedImplProp
          )
        );
      }
    }
  }

  return errors;
}
