/**
 * Options for API validation
 */
export type ValidationOptions = {
  /** HTTP client to use for validation */
  client?: string;
  /** Format for validation report output */
  report?: "json" | "html";
  /** Authentication token or credentials */
  auth?: string;
};

export type SpecValidationOptions = {
  /** Path to base spec for validation */
  base?: string;
};
