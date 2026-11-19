import { OpenAPIV3 } from "openapi-types";
import { ErrorCollection } from "./error-utils";

// ############################################################
// File-scoped constants
// ############################################################

const VERSION_HEADER = "CG-Version";

// A dotted protocol version such as `v0.6`, `0.6` or `v0.6.0`. A bare `v2` is
// left alone, because a host API MAY version its own paths (ADR 0032).
const VERSION_SEGMENT = String.raw`v?\d+\.\d+(?:\.\d+)?`;
const VERSION_BEFORE = new RegExp(String.raw`/${VERSION_SEGMENT}/common-grants/`, "i");
const VERSION_AFTER = new RegExp(String.raw`/common-grants/${VERSION_SEGMENT}/`, "i");

// ############################################################
// Public function
// ############################################################

/**
 * Check for implementation routes that put the protocol version in the path.
 *
 * Report one error when a route has a version segment directly before or after
 * `/common-grants/`, and removing it gives a base route the implementation
 * doesn't also serve unversioned. For example, `/v0.6/common-grants/opportunities`
 * or `/common-grants/v0.6/opportunities`.
 */
export function checkPathVersioning(
  baseDoc: OpenAPIV3.Document,
  implDoc: OpenAPIV3.Document
): ErrorCollection {
  const errors = new ErrorCollection();
  const basePaths = baseDoc.paths || {};
  const implPaths = implDoc.paths || {};

  // A versioned alias next to the unversioned route is left to the normal checks
  const versionedPath = Object.keys(implPaths).find(implPath => {
    const strippedPath = stripVersionSegment(implPath);
    return strippedPath !== implPath && strippedPath in basePaths && !(strippedPath in implPaths);
  });

  if (versionedPath) {
    // Base specs before 0.6.0 have no version header to point to
    const headerAdvice = declaresVersionHeader(baseDoc)
      ? ` and select the version with the '${VERSION_HEADER}' request header (ADR 0032)`
      : "";

    errors.addError({
      type: "PATH_VERSIONING",
      level: "ERROR",
      endpoint: versionedPath,
      message:
        `Routes put the protocol version in the path, such as '${versionedPath}'. ` +
        `Serve CommonGrants routes under '/common-grants/' with no version segment${headerAdvice}.`,
    });
  }

  return errors;
}

// ############################################################
// Helper functions
// ############################################################

/**
 * Whether any route in the spec takes the version request header
 */
function declaresVersionHeader(doc: OpenAPIV3.Document): boolean {
  return Object.values(doc.paths || {}).some(pathItem => {
    const operations = Object.values(OpenAPIV3.HttpMethods).map(method => pathItem?.[method]);
    const parameters = [pathItem, ...operations].flatMap(holder => holder?.parameters || []);

    return parameters.some(
      param =>
        "in" in param &&
        param.in === "header" &&
        param.name.toLowerCase() === VERSION_HEADER.toLowerCase()
    );
  });
}

/**
 * Remove a version segment next to `/common-grants/`, if there is one
 */
function stripVersionSegment(path: string): string {
  return path.replace(VERSION_BEFORE, "/common-grants/").replace(VERSION_AFTER, "/common-grants/");
}
