import { ComplianceError } from "./types";
import { OpenAPIV3 } from "openapi-types";

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
