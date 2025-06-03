import { OpenAPIV3 } from "openapi-types";

export type SchemaObject = OpenAPIV3.SchemaObject;
export type Document = OpenAPIV3.Document;

/**
 * Extends OpenAPI OperationObject to include our custom extensions
 */
export interface OperationObject extends OpenAPIV3.OperationObject {
  "x-required"?: boolean;
}

export type ResponseObject = OpenAPIV3.ResponseObject;

export interface SchemaContext {
  endpoint?: string;
  statusCode?: string;
  mimeType?: string;
  errorType?: "ROUTE_CONFLICT";
  errorSubType?: ErrorSubType;
}

// #########################################################
// Error types
// #########################################################

export type ErrorType = "MISSING_ROUTE" | "EXTRA_ROUTE" | "ROUTE_CONFLICT";
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

export interface BaseError {
  type?: ErrorType;
  level?: "ERROR" | "WARNING";
  endpoint?: string;
  statusCode?: string;
  mimeType?: string;
  location?: string;
  message?: string;
  details?: string;
}

export type ErrorSubType =
  | "MISSING_STATUS_CODE"
  | "REQUEST_BODY_CONFLICT"
  | "RESPONSE_BODY_CONFLICT"
  | "MISSING_QUERY_PARAM"
  | "EXTRA_QUERY_PARAM"
  | "QUERY_PARAM_CONFLICT";

export type SchemaConflictType =
  | "TYPE_CONFLICT"
  | "MISSING_FIELD"
  | "EXTRA_FIELD"
  | "ENUM_CONFLICT";

export interface SchemaConflictError extends BaseError {
  type: "ROUTE_CONFLICT";
  subType?: ErrorSubType;
  baseType?: string;
  implType?: string;
  conflictType: SchemaConflictType;
}

export type ComplianceError = SchemaConflictError | BaseError;
