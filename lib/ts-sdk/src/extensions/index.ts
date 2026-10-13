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
export type { Plugin, DefinePluginOptions, PluginSchemasInput } from "./define-plugin.js";
export type { CustomFieldSpec, HasCustomFields, ExtensibleObject } from "./types.js";
export { definePlugin } from "./define-plugin.js";

// Custom filters — route-keyed filter registration + classification
export type {
  CustomFilterSpec,
  CustomFilterType,
  PluginRoutes,
  ResourceName,
  RouteDeclarations,
  RouteMethod,
  RouteMethods,
} from "./types.js";
export { FilterError } from "./types.js";
export type { CustomFilterInput } from "./custom-filters.js";
export { classifyFilters, validateRoutes, F } from "./custom-filters.js";

// Schema utilities — lower-level tools for working with custom fields
export type { WithCustomFieldsResult } from "./with-custom-fields.js";
export type { ExtensibleSchemaName } from "./types.js";
export { withCustomFields } from "./with-custom-fields.js";
export { getCustomFieldValue } from "./get-custom-field-value.js";

// Transforms — bidirectional plugin transformation contract
export type {
  Handler,
  SchemaMappings,
  SchemaInput,
  SchemaOnly,
  SchemaWithTransforms,
  PluginCapability,
  PluginMeta,
  TransformResult,
} from "./types.js";
export { TransformError } from "./types.js";
// Helper types for annotating hand-written toCommon / fromCommon functions.
export type { ToCommon, FromCommon, TransformTypes } from "./transform-helpers.js";
export type { BuiltTransforms } from "./transforms.js";
export { buildTransforms } from "./transforms.js";
export type { TransformFromMappingOptions } from "../utils/transformation.js";
// Individual handler functions (fieldValue, constValue, switchOnValue, etc.)
// stay internal; reach them through DEFAULT_HANDLERS when needed.
export { DEFAULT_HANDLERS, getFromPath, transformFromMapping } from "../utils/transformation.js";
