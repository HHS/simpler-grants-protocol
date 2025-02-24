import { OpenAPIV3 } from "openapi-types";

/**
 * A structured representation of any compliance issue found.
 */
export interface ComplianceError {
  message: string;
  location?: string; // e.g. path to route or schema property
  details?: string;
}

export type SchemaObject = OpenAPIV3.SchemaObject;
export type Document = OpenAPIV3.Document;

/**
 * Extends OpenAPI OperationObject to include our custom extensions
 */
export interface OperationObject extends OpenAPIV3.OperationObject {
  "x-required"?: boolean;
}

export type ResponseObject = OpenAPIV3.ResponseObject;
