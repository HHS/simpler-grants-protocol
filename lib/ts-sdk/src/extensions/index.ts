/**
 * CommonGrants SDK Extensions
 *
 * This module provides utilities for extending CommonGrants schemas
 * with custom functionality.
 *
 * @module @common-grants/sdk/extensions
 * @packageDocumentation
 */

// Types
export type {
  CustomFieldSpec,
  WithCustomFieldsResult,
  SchemaExtensions,
  ExtensibleSchemaName,
} from "./types";
export type { MergeExtensionsOptions } from "./merge-extensions";

// Functions
export { withCustomFields } from "./with-custom-fields";
export { getCustomFieldValue } from "./get-custom-field-value";
export { mergeExtensions } from "./merge-extensions";
