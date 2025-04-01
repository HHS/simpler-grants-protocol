import SwaggerParser from "@apidevtools/swagger-parser";
import { checkExtraRoutes } from "./utils/check-extra-routes";
import { checkMatchingRoutes } from "./utils/check-matching-routes";
import { checkMissingRequiredRoutes } from "./utils/check-missing-routes";
import { ComplianceError, Document } from "./utils/types";
import { compileTypeSpec } from "../../utils/typespec";
import { CheckApiCommandOptions, CheckSpecCommandOptions } from "./check-args";

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
