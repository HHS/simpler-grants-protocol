import SwaggerParser from "@apidevtools/swagger-parser";
import { checkExtraRoutes } from "./utils/check-extra-routes";
import { checkMatchingRoutes } from "./utils/check-matching-routes";
import { checkMissingRequiredRoutes } from "./utils/check-missing-routes";
import { Document } from "./utils/types";
import { CheckApiCommandOptions, CheckSpecCommandOptions } from "./check-args";
import { ErrorCollection, ErrorFormatter } from "./utils/error-utils";
import { convertOpenApiToV3, OpenAPISchema } from "./utils/convert-openapi-v3";
import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { OpenAPIV3 } from "openapi-types";

export class DefaultCheckService {
  /** Check that an API implementation matches its spec. */
  async checkApi(apiUrl: string, specPath: string, options: CheckApiCommandOptions): Promise<void> {
    console.log("Mock: Checking API", { apiUrl, specPath, options });
  }

  /**
   * Check that a spec is valid and compliant with CommonGrants base spec.
   *
   * This involves:
   *   1) Fetching and parsing both specs
   *   2) Checking for required routes that are missing
   *   3) Checking for unexpected routes prefixed with /common-grants/
   *   4) Checking that matching routes are compatible
   */
  async checkSpec(specPath: string, options: CheckSpecCommandOptions): Promise<void> {
    // Get the base spec and implementation spec
    const baseSpecPath = options.base || getBaseSpecPath();
    const baseDoc = await loadAndParseSpec(baseSpecPath);
    const implDoc = await loadAndParseSpec(specPath);

    // Validate the specs
    const errors = validateSpecs(baseDoc, implDoc);

    // If there are errors, throw an error
    if (errors.getAllErrors().length > 0) {
      const message = new ErrorFormatter(errors).format();
      throw new Error(`Spec validation failed:\n${message}`);
    } else {
      console.log("Spec is valid and compliant with base spec");
    }
  }
}

/**
 * Validate the specs against the base spec.
 *
 * This involves:
 *   1) Checking for required routes that are missing
 *   2) Checking for unexpected routes prefixed with /common-grants/
 *   3) Checking that matching routes are compatible
 */
function validateSpecs(baseDoc: Document, implDoc: Document): ErrorCollection {
  const errors: ErrorCollection = new ErrorCollection();
  errors.addErrors(checkMissingRequiredRoutes(baseDoc, implDoc).getAllErrors());
  errors.addErrors(checkExtraRoutes(baseDoc, implDoc).getAllErrors());
  errors.addErrors(checkMatchingRoutes(baseDoc, implDoc).getAllErrors());
  return errors;
}

/**
 * Load and parse a spec file.
 *
 * This involves:
 *   1) Reading the spec file from the file system
 *   2) Parsing the spec content using the appropriate parser
 *   3) Converting the spec to OpenAPI v3.0 if needed
 *   4) Dereferencing the spec, ignoring circular references
 */
async function loadAndParseSpec(specPath: string): Promise<Document> {
  const specContent = fs.readFileSync(specPath, "utf8");

  // Detect format based on file extension
  const fileExtension = path.extname(specPath).toLowerCase();
  let rawSpec: OpenAPISchema;

  // Parse the spec content using the appropriate parser
  switch (fileExtension) {
    case ".json":
      rawSpec = JSON.parse(specContent) as OpenAPISchema;
      break;
    case ".yaml":
    case ".yml":
      rawSpec = yaml.load(specContent) as OpenAPISchema;
      break;
    default:
      throw new Error(`Unsupported file extension: ${fileExtension}`);
  }

  // Convert the spec to OpenAPI v3.0 if needed
  const convertedSpec = convertOpenApiToV3(rawSpec) as OpenAPIV3.Document;

  // Dereference the spec, ignoring circular references to prevent stack overflows
  return (await SwaggerParser.dereference(convertedSpec, {
    dereference: { circular: "ignore" },
  })) as Document;
}

/**
 * Get the path to the default base spec file packaged with the CLI.
 */
function getBaseSpecPath(): string {
  const baseSpecPath = path.resolve(__dirname, "../../../lib/openapi.yaml");
  if (fs.existsSync(baseSpecPath)) {
    return baseSpecPath;
  }
  console.log("Not found", baseSpecPath);
  throw new Error(`Could not find base spec file at ${baseSpecPath}`);
}
