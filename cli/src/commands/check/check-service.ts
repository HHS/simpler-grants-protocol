import SwaggerParser from "@apidevtools/swagger-parser";
import { checkExtraRoutes } from "../../services/validation/check-extra-routes";
import { checkMatchingRoutes } from "../../services/validation/check-matching-routes";
import { checkMissingRequiredRoutes } from "../../services/validation/check-missing-routes";
import { ComplianceError, Document } from "../../services/validation/types";
import { compileTypeSpec } from "../../utils/typespec";
import { SpecValidationOptions, ValidationOptions } from "./types";




export class DefaultCheckService  {

  
  /** Check that an API implementation matches its spec. */
  async checkApi(apiUrl: string, specPath: string, options: ValidationOptions): Promise<void> {
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
  async checkSpec(specPath: string, options: SpecValidationOptions): Promise<void> {
    // Parse and dereference the spec
    const doc = (await SwaggerParser.dereference(specPath)) as Document;

    // If no base spec provided, compile from TypeSpec
    const baseSpecPath = options.base || compileTypeSpec();
    const baseDoc = (await SwaggerParser.dereference(baseSpecPath)) as Document;

    const errors: ComplianceError[] = [];
    errors.push(...checkMissingRequiredRoutes(baseDoc, doc));
    errors.push(...checkExtraRoutes(baseDoc, doc));
    errors.push(...checkMatchingRoutes(baseDoc, doc));

    if (errors.length > 0) {
      const message = errors
        .map(e => `${e.message}${e.location ? ` at ${e.location}` : ""}`)
        .join("\n");
      throw new Error(`Spec validation failed:\n${message}`);
    } else {
      console.log("Spec is valid and compliant with base spec");
    }
  }
}
