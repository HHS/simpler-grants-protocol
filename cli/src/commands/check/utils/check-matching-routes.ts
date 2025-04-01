import { OpenAPIV3 } from "openapi-types";
import { ComplianceError } from "../../../services/validation/types";
import { checkSchemaCompatibility } from "../../../services/validation/check-schema-compatibility";
import { deepFlattenAllOf } from "../../../services/validation/flatten-schemas";

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

    // Declare the types for base and impl paths for readability
    const basePathObj = basePathItem as OpenAPIV3.PathItemObject;
    const implPathObj = implPathItem as OpenAPIV3.PathItemObject;

    // For each method in the base path, check if it also exists in the impl path
    for (const method of Object.keys(basePathObj) as OpenAPIV3.HttpMethods[]) {
      // Get base and impl operations (e.g. get, post, put, delete, etc.)
      const baseOp = basePathObj[method];
      const implOp = implPathObj[method];

      // If missing, already flagged in either checkMissingRequiredRoutes or checkExtraRoutes
      if (!baseOp) continue;
      if (!implOp) continue;

      // If experimental, skip deeper checks
      if (baseOp.tags?.includes("experimental")) continue;

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

  // 1) Check for missing status codes
  errors = errors.concat(checkStatusCodes(location, baseOp, implOp));

  // 2) For each matching status code, check that response schemas match
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

  // 3) Check that query parameters and request body match
  errors = errors.concat(checkQueryParameters(location, baseOp, implOp));
  errors = errors.concat(checkRequestBody(location, baseOp, implOp));
  return errors;
}

// ############################################################
// Status code checks
// ############################################################

/**
 * Check status codes
 *
 * Extra status codes are okay, but missing status codes are not.
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
// Query parameter checks
// ############################################################

/**
 * Compare query parameters between base and implementation operations
 */
function checkQueryParameters(
  location: string,
  baseOp: OpenAPIV3.OperationObject,
  implOp: OpenAPIV3.OperationObject
): ComplianceError[] {
  const errors: ComplianceError[] = [];

  // Get query parameters from both specs
  const baseParams = (baseOp.parameters || []).filter(
    (p): p is OpenAPIV3.ParameterObject => "in" in p && p.in === "query"
  );
  const implParams = (implOp.parameters || []).filter(
    (p): p is OpenAPIV3.ParameterObject => "in" in p && p.in === "query"
  );

  // Check for required parameters missing from implementation
  for (const baseParam of baseParams) {
    const implParam = implParams.find(p => p.name === baseParam.name);

    if (!implParam) {
      errors.push({
        message: `Missing required query parameter [${baseParam.name}]`,
        location: `${location}.parameters.${baseParam.name}`,
      });
      continue;
    }

    // If parameter exists, check if required status matches
    if (baseParam.required && !implParam.required) {
      errors.push({
        message: `Query parameter [${baseParam.name}] must be required`,
        location: `${location}.parameters.${baseParam.name}`,
      });
    }

    // Check parameter schema compatibility if schemas exist
    if (baseParam.schema && implParam.schema) {
      errors.push(
        ...checkSchemaCompatibility(
          `${location}.parameters.${baseParam.name}`,
          baseParam.schema as OpenAPIV3.SchemaObject,
          implParam.schema as OpenAPIV3.SchemaObject
        )
      );
    }
  }

  return errors;
}

// ############################################################
// Content schema checks (shared between request and response)
// ############################################################

/**
 * Compare content schemas between base and implementation content objects
 */
function checkContentSchemas(
  location: string,
  baseContent: { [key: string]: OpenAPIV3.MediaTypeObject } | undefined,
  implContent: { [key: string]: OpenAPIV3.MediaTypeObject } | undefined
): ComplianceError[] {
  const errors: ComplianceError[] = [];

  if (!baseContent) return errors;

  if (!implContent) {
    errors.push({
      message: `Implementation missing content for expected mime type(s)`,
      location,
    });
    return errors;
  }

  for (const [mimeType, baseMedia] of Object.entries(baseContent)) {
    const implMedia = implContent[mimeType];
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
    errors.push(...checkContentSchemas(location, baseResponse.content, implResponse.content));
  }

  return errors;
}

// ############################################################
// Request body checks
// ############################################################

/**
 * Compare the request body between base and implementation operations
 */
function checkRequestBody(
  location: string,
  baseOp: OpenAPIV3.OperationObject,
  implOp: OpenAPIV3.OperationObject
): ComplianceError[] {
  const errors: ComplianceError[] = [];

  if (baseOp.requestBody) {
    const baseReq = baseOp.requestBody as OpenAPIV3.RequestBodyObject;
    const implReq = implOp.requestBody as OpenAPIV3.RequestBodyObject | undefined;

    if (!implReq) {
      errors.push({
        message: "Missing required request body",
        location: `${location}.requestBody`,
      });
    } else if (baseReq.content) {
      errors.push(
        ...checkContentSchemas(`${location}.requestBody.content`, baseReq.content, implReq.content)
      );
    }
  }
  return errors;
}
