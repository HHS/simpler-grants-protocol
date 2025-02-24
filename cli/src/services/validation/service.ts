import { ValidationService, ValidationOptions, SpecValidationOptions } from "../interfaces";
import { checkExtraRoutes } from "./check-extra-routes";
import { checkMatchingRoutes } from "./check-matching-routes";
import { checkMissingRequiredRoutes } from "./check-missing-routes";
import { ComplianceError, Document } from "./types";
import SwaggerParser from "@apidevtools/swagger-parser";

export class DefaultValidationService implements ValidationService {
  /** Check that an API implementation matches its spec. */
  async checkApi(apiUrl: string, specPath: string, options: ValidationOptions): Promise<void> {
    console.log("Mock: Checking API", { apiUrl, specPath, options });
  }

  /**
   * Check that a spec is valid and compliant with CommonGrants base spec.
   *
   * This involves:
   *   1) Fetching and parsing both specs
   *   2) Checking for missing required routes
   *   3) Checking for extra routes
   *   4) Checking that matching routes are compatible
   */
  async checkSpec(specPath: string, options: SpecValidationOptions): Promise<void> {
    // Parse and dereference the spec
    const doc = (await SwaggerParser.dereference(specPath)) as Document;

    if (!options.base) {
      console.log("Base spec not provided, skipping compatibility check");
      return;
    }

    // If base spec provided, parse and dereference it
    const baseDoc = (await SwaggerParser.dereference(options.base)) as Document;

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
