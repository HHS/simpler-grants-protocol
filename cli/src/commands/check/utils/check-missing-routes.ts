import { OpenAPIV3 } from "openapi-types";
import { ComplianceError } from "../../../services/validation/types";

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

  // Collect all of the required paths and operations from the base spec
  const requiredOperations: Array<{ path: string; method: string }> = [];
  for (const [path, pathItem] of Object.entries(basePaths)) {
    if (!pathItem) continue;

    // Cast path item to proper type for better type inference
    const pathObj = pathItem as OpenAPIV3.PathItemObject;
    const methods = Object.keys(pathObj) as OpenAPIV3.HttpMethods[];

    // For each operation in the base path, check if it has the "required" tag
    for (const method of methods) {
      const operation = pathObj[method];
      if (!operation?.tags) continue;

      if (operation.tags.includes("required")) {
        requiredOperations.push({ path, method });
      }
    }
  }

  // Check if the implementation doc contains each required route and operation
  for (const { path, method } of requiredOperations) {
    // Flag missing paths
    const implPathItem = implPaths[path];
    if (!implPathItem) {
      errors.push({
        message: `Missing required path '${path}'`,
        location: path,
      });
      continue;
    }

    // Flag missing operations on matching paths
    const implPathObj = implPathItem as OpenAPIV3.PathItemObject;
    const implOperation = implPathObj[method as OpenAPIV3.HttpMethods];
    if (!implOperation) {
      errors.push({
        message: `Missing required operation [${method.toUpperCase()}] on path '${path}'`,
        location: `${path}.${method}`,
      });
    }
  }

  return errors;
}
