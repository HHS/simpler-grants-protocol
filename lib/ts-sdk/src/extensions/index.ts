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
export type { Plugin, DefinePluginOptions, PluginSchemasInput } from "./define-plugin";
export type { CustomFieldSpec, HasCustomFields, ExtensibleObject } from "./types";
export { definePlugin } from "./define-plugin";

// Custom filters — route-keyed filter registration + classification
export type {
  CustomFilterSpec,
  CustomFilterType,
  PluginRoutes,
  ResourceName,
  RouteDeclarations,
  RouteMethod,
  RouteMethods,
} from "./types";
export { RESOURCE_NAMES, FilterError } from "./types";
export type { CustomFilterInput } from "./custom-filters";
export { categorizeFilters, validateRoutes, F, FILTER_TYPE_SCHEMAS } from "./custom-filters";

// Schema utilities — lower-level tools for working with custom fields
export type { WithCustomFieldsResult } from "./with-custom-fields";
export type { ExtensibleSchemaName } from "./types";
export { withCustomFields } from "./with-custom-fields";
export { getCustomFieldValue } from "./get-custom-field-value";

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
} from "./types";
export { TransformError } from "./types";
// Helper types for annotating hand-written toCommon / fromCommon functions.
export type { ToCommon, FromCommon, TransformTypes } from "./transform-helpers";
export type { BuiltTransforms } from "./transforms";
export { buildTransforms } from "./transforms";
export type { TransformFromMappingOptions } from "../utils/transformation";
// Individual handler functions (fieldValue, constValue, switchOnValue, etc.)
// stay internal; reach them through DEFAULT_HANDLERS when needed.
export { DEFAULT_HANDLERS, getFromPath, transformFromMapping } from "../utils/transformation";
