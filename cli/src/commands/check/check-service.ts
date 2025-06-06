import SwaggerParser from "@apidevtools/swagger-parser";
import { checkExtraRoutes } from "./utils/check-extra-routes";
import { checkMatchingRoutes } from "./utils/check-matching-routes";
import { checkMissingRequiredRoutes } from "./utils/check-missing-routes";
import { Document } from "./utils/types";
import { compileTypeSpec } from "../../utils/typespec";
import { CheckApiCommandOptions, CheckSpecCommandOptions } from "./check-args";
import { ErrorCollection, ErrorFormatter } from "./utils/error-utils";

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
