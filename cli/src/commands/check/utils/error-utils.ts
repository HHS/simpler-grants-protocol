import { ComplianceError, ErrorType } from "./types";

// #########################################################
// ErrorCollection
// #########################################################

export class ErrorCollection {
  private errors: ComplianceError[] = [];
  private endpoints: Set<string> = new Set();

  /** Add a single error to the ErrorCollection */
  addError(error: ComplianceError): void {
    this.errors.push(error);
    // Add endpoint to set if it exists
    if ("endpoint" in error && typeof error.endpoint === "string") {
      this.endpoints.add(error.endpoint);
    }
  }

  /** Add multiple errors to the ErrorCollection */
  addErrors(errors: ComplianceError[]): void {
    errors.forEach(error => {
      this.addError(error);
    });
  }

  /** Get a new ErrorCollection filtered by error type */
  filterByType(type: ErrorType): ErrorCollection {
    const filtered = new ErrorCollection();
    filtered.addErrors(this.errors.filter(error => error.type === type));
    return filtered;
  }

  /** Get a new ErrorCollection filtered by endpoint */
  filterByEndpoint(endpoint: string): ErrorCollection {
    const filtered = new ErrorCollection();
    filtered.addErrors(
      this.errors.filter(error => "endpoint" in error && error.endpoint === endpoint)
    );
    return filtered;
  }

  /** Get a new ErrorCollection filtered by level */
  filterByLevel(level: "ERROR" | "WARNING"): ErrorCollection {
    const filtered = new ErrorCollection();
    filtered.addErrors(this.errors.filter(error => error.level === level));
    return filtered;
  }

  /** Get the total number of errors in the ErrorCollection */
  getErrorCount(): number {
    return this.errors.length;
  }

  /** Get the total number of endpoints in the ErrorCollection */
  getEndpointCount(): number {
    return this.endpoints.size;
  }

  /** Get a list of all errors in the ErrorCollection */
  getAllErrors(): ComplianceError[] {
    return [...this.errors];
  }

  /** Get an error at a specific index
   * @param index The index of the error to retrieve
   * @returns The error at the specified index, or undefined if the index is out of bounds
   * @example
   * ```ts
   * const errors = new ErrorCollection();
   * errors.addError({ type: "ERROR", level: "ERROR", endpoint: "/api/v1/users" });
   * errors.addError({ type: "WARNING", level: "WARNING", endpoint: "/api/v1/users" });
   *
   * const firstError = errors.get(0); // Get the first error
   * const secondError = errors.get(1); // Get the second error
   * const outOfBounds = errors.get(2); // undefined
   * ```
   */
  get(index: number): ComplianceError | undefined {
    return this.errors[index];
  }

  /** Make ErrorCollection iterable
   * @returns An iterator over the errors in the ErrorCollection
   * @example
   * ```ts
   * const errors = new ErrorCollection();
   * errors.addError({ type: "ERROR", level: "ERROR", endpoint: "/api/v1/users" });
   * errors.addError({ type: "WARNING", level: "WARNING", endpoint: "/api/v1/users" });
   *
   * // Using for...of
   * for (const error of errors) {
   *   console.log(error);
   * }
   *
   * // Using spread operator
   * const errorArray = [...errors];
   *
   * // Using Array.from
   * const errorArray2 = Array.from(errors);
   *
   * // Using destructuring
   * const [firstError, ...restErrors] = errors;
   * ```
   */
  [Symbol.iterator](): Iterator<ComplianceError> {
    return this.errors[Symbol.iterator]();
  }
}

// #########################################################
// ErrorFormatter
// #########################################################

export class ErrorFormatter {
  private errors: ErrorCollection;

  constructor(errors: ErrorCollection) {
    this.errors = errors;
  }

  /** Format all errors in the collection */
  format(): string {
    const errorCount = this.errors.getErrorCount();
    if (errorCount === 0) {
      return "No errors found";
    }

    const sections: string[] = [];
    sections.push(`${errorCount} errors`);
    sections.push("=================================");

    // Format missing routes
    const missingRoutes = this.errors.filterByType("MISSING_ROUTE");
    if (missingRoutes.getErrorCount() > 0) {
      sections.push("Routes missing");
      for (const error of missingRoutes) {
        sections.push(`  ${error.endpoint}`);
      }
    }

    // Format extra routes
    const extraRoutes = this.errors.filterByType("EXTRA_ROUTE");
    if (extraRoutes.getErrorCount() > 0) {
      sections.push("Extra routes");
      for (const error of extraRoutes) {
        sections.push(`  ${error.endpoint}`);
      }
    }

    // Format route conflicts
    const routeConflicts = this.errors.filterByType("ROUTE_CONFLICT");
    if (routeConflicts.getErrorCount() > 0) {
      sections.push("Route conflicts");
      // Group conflicts by endpoint
      const conflictsByEndpoint = new Map<string, ComplianceError[]>();
      for (const error of routeConflicts) {
        if (error.endpoint) {
          const conflicts = conflictsByEndpoint.get(error.endpoint) || [];
          conflicts.push(error);
          conflictsByEndpoint.set(error.endpoint, conflicts);
        }
      }

      // Format each endpoint's conflicts
      for (const [endpoint, conflicts] of conflictsByEndpoint) {
        sections.push(`  ${endpoint}`);
        sections.push(`    ${conflicts.length} issues found:`);

        for (const error of conflicts) {
          if ("subType" in error && error.subType) {
            sections.push(`    ${this.formatSubTypeTitle(error.subType)}`);
          }
          if (error.statusCode) {
            sections.push(`      Status code: ${error.statusCode}`);
          }
          if (error.mimeType) {
            sections.push(`      MIME Type: ${error.mimeType}`);
          }
          if (error.location) {
            sections.push(`      Location: ${error.location}`);
          }
          if ("conflictType" in error) {
            sections.push(`      Issue: ${this.formatConflictType(error.conflictType)}`);
          }
          if (error.message) {
            sections.push(`      Message: ${error.message}`);
          }
        }
      }
    }

    return sections.join("\n");
  }

  private formatSubTypeTitle(subType: string): string {
    switch (subType) {
      case "RESPONSE_BODY_CONFLICT":
        return "Response schema conflict";
      case "REQUEST_BODY_CONFLICT":
        return "Request schema conflict";
      case "MISSING_STATUS_CODE":
        return "Status code missing";
      case "MISSING_QUERY_PARAM":
        return "Query parameter missing";
      case "EXTRA_QUERY_PARAM":
        return "Extra query parameter";
      case "QUERY_PARAM_CONFLICT":
        return "Query parameter conflict";
      default:
        return subType;
    }
  }

  private formatConflictType(conflictType: string): string {
    switch (conflictType) {
      case "TYPE_CONFLICT":
        return "Mismatched types";
      case "ENUM_CONFLICT":
        return "Enum value conflict";
      case "MISSING_FIELD":
        return "Field missing";
      case "EXTRA_FIELD":
        return "Extra field";
      default:
        return conflictType;
    }
  }
}
