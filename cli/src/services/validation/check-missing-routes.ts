import { OpenAPIV3 } from "openapi-types";
import { ComplianceError } from "./types";

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
