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
