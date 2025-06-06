import { OpenAPIV3 } from "openapi-types";
import { deepFlattenAllOf } from "./flatten-schemas";
import { ErrorCollection } from "./error-utils";
import { SchemaConflictError, SchemaContext } from "./types";

const ERROR_TYPE = "ROUTE_CONFLICT";

// ############################################################
// Main function
// ############################################################

/**
 * Checks whether `implSchema` is a valid subset of `baseSchema`.
 *
 * We treat `baseSchema` as more "generic". That means:
 *  1) If baseSchema.type is undefined, that is "any" => allow impl any type
 *  2) If baseSchema has `additionalProperties` as a schema, any extra fields in impl
 *     must conform to that schema
 *  3) Required fields in baseSchema must be present in impl
 *  4) If baseSchema has a typed property (e.g. 'string', 'object'), then
 *     impl must match that type (unless base has no type).
 *  5) If baseSchema has an enum, impl must include all base enum values
 */
export function checkSchemaCompatibility(
  location: string,
  baseSchema: OpenAPIV3.SchemaObject,
  implSchema: OpenAPIV3.SchemaObject,
  ctx: SchemaContext
): ErrorCollection {
  let errors = new ErrorCollection();

  // 1) Skip if base has no type
  if (!baseSchema.type) {
    return errors;
  }

  // 2) Check type conflict
  errors = checkTypeConflict(location, baseSchema, implSchema, ctx, errors);

  // 3) If the schema is object-typed, compare properties
  if (baseSchema.type === "object") {
    checkObjectCompatibility(location, baseSchema, implSchema, ctx, errors);
  }

  // 4) If the schema is array-typed, compare items
  if (baseSchema.type === "array") {
    checkArrayCompatibility(
      location,
      baseSchema as OpenAPIV3.ArraySchemaObject,
      implSchema as OpenAPIV3.ArraySchemaObject,
      ctx,
      errors
    );
  }

  // 5) If the schema has an enum, verify that impl doesn't have extra values
  errors = checkEnumConflict(location, baseSchema, implSchema, ctx, errors);

  return errors;
}

// ############################################################
// Helper functions - Simple types
// ############################################################

/**
 * Checks whether `implSchema` has a different type than `baseSchema`.
 */
function checkTypeConflict(
  location: string,
  baseSchema: OpenAPIV3.SchemaObject,
  implSchema: OpenAPIV3.SchemaObject,
  ctx: SchemaContext,
  errors: ErrorCollection
): ErrorCollection {
  if (baseSchema.type && implSchema.type && baseSchema.type !== implSchema.type) {
    const error = typeConflictError(location, baseSchema.type, implSchema.type, ctx);
    errors.addError(error);
  }
  return errors;
}

/**
 * Checks whether `implSchema` has any enum values that are not in `baseSchema`.
 */
function checkEnumConflict(
  location: string,
  baseSchema: OpenAPIV3.SchemaObject,
  implSchema: OpenAPIV3.SchemaObject,
  ctx: SchemaContext,
  errors: ErrorCollection
): ErrorCollection {
  if (Array.isArray(baseSchema.enum) && Array.isArray(implSchema.enum)) {
    for (const implVal of implSchema.enum) {
      if (!baseSchema.enum.includes(implVal)) {
        const error = enumConflictError(location, implVal, ctx);
        errors.addError(error);
      }
    }
  }
  return errors;
}

// ############################################################
// Helper functions - Object types
// ############################################################

/**
 * Checks whether object properties are compatible.
 *
 * This is a new implementation of the checkObjectCompatibility function.
 * It is more efficient and easier to understand.
 */
function checkObjectCompatibility(
  location: string,
  baseSchema: OpenAPIV3.SchemaObject,
  implSchema: OpenAPIV3.SchemaObject,
  ctx: SchemaContext,
  errors: ErrorCollection
): ErrorCollection {
  // Step 1: Get matching, missing, and extra properties
  const baseProps = baseSchema.properties || {};
  const implProps = implSchema.properties || {};
  const propsByStatus = getPropsByStatus(baseProps, implProps);

  // Step 2: Check that matching props are compatible
  for (const propName of propsByStatus.matching) {
    const baseProp = baseProps[propName] as OpenAPIV3.SchemaObject;
    const implProp = implProps[propName] as OpenAPIV3.SchemaObject;
    const propLoc = `${location}.${propName}`;
    const propErrors = checkSchemaCompatibility(propLoc, baseProp, implProp, ctx);
    errors.addErrors(propErrors.getAllErrors());
  }

  // Step 3: Handle missing props
  for (const propName of propsByStatus.missing) {
    const propLoc = `${location}.${propName}`;
    const error = missingFieldError(propLoc, propName, { ...ctx, baseSchema });
    errors.addError(error);
  }

  // Step 4: Handle extra props
  //TODO: @widal001 (2025-06-06) - Make this more robust
  // WHEN additionalProperties or unevaluatedProperties is:
  // 1. undefined || true => allow any extra props
  // 2. false || not: {} => disallow any extra props
  // 3. schema => validate extra props against that schema
  const extraPropsAllowed = baseSchema.additionalProperties === true;
  const extraPropsSchema = baseSchema.additionalProperties as OpenAPIV3.SchemaObject;

  if (extraPropsAllowed) {
    // If additionalProperties are allowed, skip
    return errors;
  } else if (extraPropsSchema) {
    // If additionalProperties need to match a schema,
    // validate extra props against that schema
    const flattenedExtraPropsSchema = deepFlattenAllOf(extraPropsSchema);
    for (const propName of propsByStatus.extra) {
      const implProp = implProps[propName] as OpenAPIV3.SchemaObject;
      const propLoc = `${location}.${propName}`;
      const propErrors = checkSchemaCompatibility(
        propLoc,
        flattenedExtraPropsSchema,
        implProp,
        ctx
      );
      errors.addErrors(propErrors.getAllErrors());
    }
  } else {
    // Otherwise, extra props are not allowed, and should be flagged as errors
    for (const propName of propsByStatus.extra) {
      const propLoc = `${location}.${propName}`;
      const error = extraFieldError(propLoc, propName, ctx);
      errors.addError(error);
    }
  }

  return errors;
}

/**
 * A helper type to track the status of properties in an object.
 *
 * - matching: properties that are present in both base and impl
 * - missing: properties that are present in base but not in impl
 * - extra: properties that are present in impl but not in base
 */
interface PropsByStatus {
  matching: Array<string>;
  missing: Array<string>;
  extra: Array<string>;
}

/**
 * Separates properties into matching, missing, and extra.
 *
 * - matching: properties that are present in both base and impl
 * - missing: properties that are present in base but not in impl
 * - extra: properties that are present in impl but not in base
 */
function getPropsByStatus(
  baseProps: OpenAPIV3.SchemaObject,
  implProps: OpenAPIV3.SchemaObject
): PropsByStatus {
  const matching: string[] = [];
  const missing: string[] = [];
  const extra: string[] = [];

  // Check all base properties
  for (const propName of Object.keys(baseProps)) {
    if (propName in implProps) {
      matching.push(propName);
    } else {
      missing.push(propName);
    }
  }

  // Check for extra properties in implementation
  for (const propName of Object.keys(implProps)) {
    if (!(propName in baseProps)) {
      extra.push(propName);
    }
  }

  return { matching, missing, extra };
}

// ############################################################
// Helper functions - Array types
// ############################################################

/**
 * Checks whether array items are compatible.
 *
 * This function validates that:
 * 1. The implementation schema has items defined
 * 2. The items in the implementation schema are compatible with the base schema's items
 */
function checkArrayCompatibility(
  location: string,
  baseSchema: OpenAPIV3.ArraySchemaObject,
  implSchema: OpenAPIV3.ArraySchemaObject,
  ctx: SchemaContext,
  errors: ErrorCollection
): ErrorCollection {
  // If base schema has no items defined, any items are allowed
  if (!baseSchema.items) {
    return errors;
  }

  // If impl schema has no items defined, that's an error
  if (!implSchema.items) {
    const error: SchemaConflictError = {
      type: ERROR_TYPE,
      level: "ERROR",
      subType: ctx.errorSubType!,
      endpoint: ctx.endpoint,
      statusCode: ctx.statusCode,
      mimeType: ctx.mimeType,
      conflictType: "MISSING_FIELD",
      message: `Array schema must define items`,
      location,
    };
    errors.addError(error);
    return errors;
  }

  // Check that the items are compatible
  const baseItems = baseSchema.items as OpenAPIV3.SchemaObject;
  const implItems = implSchema.items as OpenAPIV3.SchemaObject;
  const itemErrors = checkSchemaCompatibility(`${location}[0]`, baseItems, implItems, ctx);
  errors.addErrors(itemErrors.getAllErrors());

  return errors;
}

// ############################################################
// Error creation functions
// ############################################################

/**
 * Creates an error when types are mismatched.
 */
function typeConflictError(
  location: string,
  baseType: string,
  implType: string,
  ctx: SchemaContext
): SchemaConflictError {
  return {
    type: ERROR_TYPE,
    level: "ERROR",
    subType: ctx.errorSubType!,
    endpoint: ctx.endpoint,
    statusCode: ctx.statusCode,
    mimeType: ctx.mimeType,
    conflictType: "TYPE_CONFLICT",
    message: `Type mismatch. Base is '${baseType}', impl is '${implType}'`,
    baseType,
    implType,
    location,
  };
}

/**
 * Creates an error when implementation has extra enum values.
 */
function enumConflictError(
  location: string,
  extraValue: string,
  ctx: SchemaContext
): SchemaConflictError {
  return {
    type: ERROR_TYPE,
    level: "ERROR",
    subType: ctx.errorSubType!,
    endpoint: ctx.endpoint,
    statusCode: ctx.statusCode,
    mimeType: ctx.mimeType,
    conflictType: "ENUM_CONFLICT",
    message: `Enum mismatch. Extra value '${extraValue}' in implementation not allowed by base spec`,
    location,
  };
}

/**
 * Creates an error when implementation is missing a required field.
 */
function missingFieldError(
  location: string,
  fieldName: string,
  ctx: SchemaContext
): SchemaConflictError {
  const isRequired = ctx.baseSchema?.required?.includes(fieldName);
  return {
    type: ERROR_TYPE,
    level: "ERROR",
    subType: ctx.errorSubType!,
    endpoint: ctx.endpoint,
    statusCode: ctx.statusCode,
    mimeType: ctx.mimeType,
    conflictType: "MISSING_FIELD",
    message: `Missing ${isRequired ? "required" : "optional"} property '${fieldName}'`,
    location,
  };
}

/**
 * Creates an error when implementation has extra properties.
 */
function extraFieldError(
  location: string,
  fieldName: string,
  ctx: SchemaContext
): SchemaConflictError {
  return {
    type: ERROR_TYPE,
    level: "ERROR",
    subType: ctx.errorSubType!,
    endpoint: ctx.endpoint,
    statusCode: ctx.statusCode,
    mimeType: ctx.mimeType,
    conflictType: "EXTRA_FIELD",
    message: `Implementation schema has extra property '${fieldName}' not defined in base schema (and 'additionalProperties' is not allowed)`,
    location,
  };
}
