import { OpenAPIV3 } from "openapi-types";
import { ErrorCollection } from "./error-utils";

// ############################################################
// File-scoped types
// ############################################################

type Route = {
  path: string;
  method: string;
};

// ############################################################
// Public function
// ############################################################

/**
 * Check for base spec routes that are missing in the implementation.
 *
 * Report an error if a required route is missing.
 * Report a warning if an optional route is missing.
 */
export function checkMissingRequiredRoutes(
  baseDoc: OpenAPIV3.Document,
  implDoc: OpenAPIV3.Document
): ErrorCollection {
  let errors = new ErrorCollection();

  // Step 1: Isolate paths from the base and implementation specs
  const basePaths = baseDoc.paths || {};
  const implPaths = implDoc.paths || {};

  // Step 2: Collect all of the required and optional routes from the base spec
  const requiredRoutes: Array<Route> = [];
  const optionalRoutes: Array<Route> = [];

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
        requiredRoutes.push({ path, method });
      }

      if (operation.tags.includes("optional")) {
        optionalRoutes.push({ path, method });
      }
    }
  }

  // Step 3: Check if the implementation doc contains each route
  const isRequired = true;
  errors = checkForRoutes(requiredRoutes, implPaths, errors, isRequired);
  errors = checkForRoutes(optionalRoutes, implPaths, errors, !isRequired);

  return errors;
}

// ############################################################
// Helper functions
// ############################################################

function checkForRoutes(
  routes: Array<Route>,
  implPaths: OpenAPIV3.PathsObject,
  errors: ErrorCollection,
  isRequired: boolean
): ErrorCollection {
  for (const route of routes) {
    // Isolate path and methods from the route
    const implPathObj = implPaths[route.path] as OpenAPIV3.PathItemObject;
    const implMethod = implPathObj?.[route.method as OpenAPIV3.HttpMethods];

    // If either the path or method are missing in the implementation,
    // add an error (or warning) to the errors collection
    if (!implPathObj || !implMethod) {
      errors.addError({
        type: "MISSING_ROUTE",
        level: isRequired ? "ERROR" : "WARNING",
        endpoint: `${route.method.toUpperCase()} ${route.path}`,
        message: isRequired
          ? `Missing required route '${route.method.toUpperCase()} ${route.path}'`
          : `Missing optional route '${route.method.toUpperCase()} ${route.path}'`,
      });
    }
  }

  return errors;
}
