import { OpenAPIV3 } from "openapi-types";
import { ComplianceError } from "./types";
import { checkSchemaCompatibility } from "./check-schema-compatibility";
import { deepFlattenAllOf } from "./flatten-schemas";

// ############################################################
// Top-level checks
// ############################################################

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

// ############################################################
// Route-specific checks
// ############################################################

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
  // TODO: Implement

  return errors;
}

// ############################################################
// Status code checks
// ############################################################

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

  return errors;
}

// ############################################################
// Response schema checks (for each status code)
// ############################################################

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
