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
    // Read the spec file as raw YAML/JSON first
    const specContent = fs.readFileSync(specPath, "utf8");
    const rawSpec = yaml.load(specContent) as OpenAPISchema;

    // Convert OpenAPI v3.1 to v3.0 if needed
    const convertedSpec = convertOpenApiToV3(rawSpec) as OpenAPIV3.Document;

    // Now parse and dereference the converted spec
    const doc = (await SwaggerParser.dereference(convertedSpec)) as Document;

    // If no base spec provided, compile from TypeSpec
    const baseSpecPath = options.base || getBaseSpecPath();
    const baseDoc = (await SwaggerParser.dereference(baseSpecPath)) as Document;

    const errors: ErrorCollection = new ErrorCollection();
    errors.addErrors(checkMissingRequiredRoutes(baseDoc, doc).getAllErrors());
    errors.addErrors(checkExtraRoutes(baseDoc, doc).getAllErrors());
    errors.addErrors(checkMatchingRoutes(baseDoc, doc).getAllErrors());

    if (errors.getAllErrors().length > 0) {
      const message = new ErrorFormatter(errors).format();
      throw new Error(`Spec validation failed:\n${message}`);
    } else {
      console.log("Spec is valid and compliant with base spec");
    }
  }
}

function getBaseSpecPath(): string {
  const baseSpecPath = path.resolve(__dirname, "../../../lib/openapi.yaml");
  if (fs.existsSync(baseSpecPath)) {
    return baseSpecPath;
  }
  console.log("Not found", baseSpecPath);
  throw new Error(`Could not find base spec file at ${baseSpecPath}`);
}
