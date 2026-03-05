/**
 * CommonGrants SDK Extensions
 *
 * This module provides utilities for extending CommonGrants schemas
 * with custom functionality.
 *
 * @module @common-grants/sdk/extensions
 * @packageDocumentation
 */

// Types — all extension-related interfaces and types live in types.ts
export type {
  CustomFieldSpec,
  WithCustomFieldsResult,
  SchemaExtensions,
  ExtensibleSchemaName,
  MergeExtensionsOptions,
  PluginConfig,
} from "./types";

// Functions — each file exports a single utility function
export { withCustomFields } from "./with-custom-fields";
export { getCustomFieldValue } from "./get-custom-field-value";
export { mergeExtensions } from "./merge-extensions";
export { defineConfig } from "./define-config";
