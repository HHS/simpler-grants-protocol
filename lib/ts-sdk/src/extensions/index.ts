/**
 * CommonGrants SDK Extensions
 *
 * This module provides utilities for extending CommonGrants schemas
 * with custom functionality.
 *
 * @module @common-grants/sdk/extensions
 * @packageDocumentation
 */

// Plugin creation — define and compose plugins
export type { Plugin, DefinePluginOptions, TransformSchemasInput } from "./define-plugin";
export type { SchemaExtensions, CustomFieldSpec, HasCustomFields, ExtensibleObject } from "./types";
export { definePlugin } from "./define-plugin";
export { mergeExtensions } from "./merge-extensions";

// Schema utilities — lower-level tools for working with custom fields
export type { MergeExtensionsOptions, MergedSchemaExtensions } from "./merge-extensions";
export type { WithCustomFieldsResult } from "./with-custom-fields";
export type { ExtensibleSchemaName } from "./types";
export { withCustomFields } from "./with-custom-fields";
export { getCustomFieldValue } from "./get-custom-field-value";

// Transforms — bidirectional plugin transformation contract
export type {
  ClientConfig,
  Handler,
  ObjectMappings,
  ObjectSchemas,
  ObjectSchemasInput,
  PluginCapability,
  PluginExtensions,
  PluginExtensionsObjectConfig,
  PluginMeta,
  TransformResult,
} from "./types";
export { PluginError } from "./types";
export type { BuildTransformsOptions, BuiltTransforms } from "./transforms";
export { buildTransforms } from "./transforms";
export type { TransformFromMappingOptions } from "./transformation";
// Individual handler functions (fieldValue, constValue, switchOnValue, etc.)
// stay internal; reach them through DEFAULT_HANDLERS when needed.
export { DEFAULT_HANDLERS, getFromPath, transformFromMapping } from "./transformation";
