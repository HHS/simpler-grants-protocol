import { ErrorCollection } from "./error-utils";
import { OpenAPIV3 } from "openapi-types";

// ############################################################
// File-scoped types
// ############################################################

type PathItem = OpenAPIV3.PathItemObject;
type HttpMethod = OpenAPIV3.HttpMethods;

interface RouteError {
  type: "EXTRA_ROUTE";
  level: "ERROR";
  endpoint: string;
  message: string;
}

// ############################################################
// Public function
// ############################################################

/**
 * Check for routes that exist in the implementation but do not exist in the base.
 *
 * There are three distinct scenarios to check for:
 * 1. Path isn't prefixed with /common-grants/ --> Ignore, this is an implementation-specific route
 * 2. Path is prefixed with /common-grants/ and NOT found in base --> Flag all methods as extra
 * 3. Path is prefixed with /common-grants/ and found in base --> Flag methods not found in base as extra
 *
 * @example An example of all three scenarios:
 *
 * Base spec:
 * ```yaml
 * /common-grants/opportunities:
 *   get:
 *     summary: Get a list of opportunities
 * ```
 *
 * Implementation spec:
 * ```yaml
 * /users/{id}: # <-- Implementation-specific route, ignore
 *   get:
 *     summary: Get a user
 * /common-grants/opportunities: # <-- Found in base, but has extra methods
 *   get:
 *     summary: Get a list of opportunities
 *   post:  # <-- Extra method
 *     summary: Create an opportunity
 * /common-grants/opportunities/{id}: # <-- Not found in base, all methods are extra
 *   get:
 *     summary: Get an opportunity
 *   put:
 *     summary: Update an opportunity
 *   delete:
 *     summary: Delete an opportunity
 * ```
 */
export function checkExtraRoutes(
  baseDoc: OpenAPIV3.Document,
  implDoc: OpenAPIV3.Document
): ErrorCollection {
  const errors = new ErrorCollection();
  const basePaths = baseDoc.paths || {};
  const implPaths = implDoc.paths || {};

  for (const [implPath, implPathItem] of Object.entries(implPaths)) {
    // SCENARIO 1: Skip paths that don't start with /common-grants/
    if (!implPath.startsWith("/common-grants/")) continue;

    const implPathObj = implPathItem as PathItem;
    const implMethods = getPathMethods(implPathObj);

    // SCENARIO 2: If path doesn't exist in base, flag all methods as extra
    if (!basePaths[implPath]) {
      for (const method of implMethods) {
        const operation = implPathObj[method];
        if (!operation) continue;

        errors.addError(createExtraRouteError(method, implPath));
      }
      continue;
    }

    // SCENARIO 3: If path exists in both specs, flag extra methods
    const basePathObj = basePaths[implPath] as PathItem;
    const baseMethods = getPathMethods(basePathObj);

    for (const method of implMethods) {
      // Skip if method exists in base
      if (baseMethods.includes(method)) continue;

      const operation = implPathObj[method];
      if (!operation) continue;

      errors.addError(createExtraRouteError(method, implPath));
    }
  }
  return errors;
}

// ############################################################
// Helper functions
// ############################################################

/**
 * Creates an error for an extra route
 */
function createExtraRouteError(method: HttpMethod, path: string): RouteError {
  const endpoint = `${method.toUpperCase()} ${path}`;
  const message = `Extra route found: ${method.toUpperCase()} ${path} that is prefixed with '/common-grants/' but not in base`;

  return {
    type: "EXTRA_ROUTE",
    level: "ERROR",
    endpoint,
    message,
  };
}

/**
 * Gets all HTTP methods from a path item object
 */
function getPathMethods(pathItem: PathItem): HttpMethod[] {
  return Object.keys(pathItem) as HttpMethod[];
}
