import { OpenAPIV3 } from "openapi-types";
import { ComplianceError } from "./types";
import { deepFlattenAllOf } from "./flatten-schemas";

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
  implSchema: OpenAPIV3.SchemaObject
): ComplianceError[] {
  const errors: ComplianceError[] = [];

  // 1) Compare `type`: skip if base has no type
  if (baseSchema.type && implSchema.type) {
    if (baseSchema.type !== implSchema.type) {
      errors.push({
        message: `Type mismatch. Base is '${baseSchema.type}', impl is '${implSchema.type}'`,
        location,
      });
    }
  }

  // 2) If the schema is object-typed (or base type is missing), compare properties
  if (baseSchema.type === "object" || (!baseSchema.type && implSchema.type === "object")) {
    errors.push(...checkObjectCompatibility(location, baseSchema, implSchema));
  }

  // 3) If the schema has an enum, verify that impl includes all base enum values
  if (Array.isArray(baseSchema.enum) && Array.isArray(implSchema.enum)) {
    for (const baseVal of baseSchema.enum) {
      if (!implSchema.enum.includes(baseVal)) {
        errors.push({
          message: `Enum mismatch. Missing '${baseVal}' in implementation`,
          location,
        });
      }
    }
  }

  return errors;
}

/**
 * Compare object-type schemas:
 *   - check required props
 *   - check each base prop
 *   - allow additional props if base has `additionalProperties`
 */
function checkObjectCompatibility(
  location: string,
  baseSchema: OpenAPIV3.SchemaObject,
  implSchema: OpenAPIV3.SchemaObject
): ComplianceError[] {
  const errors: ComplianceError[] = [];
  const baseProps = baseSchema.properties || {};
  const implProps = implSchema.properties || {};

  // 1) Check required fields in base
  if (Array.isArray(baseSchema.required)) {
    for (const requiredProp of baseSchema.required) {
      if (!(requiredProp in implProps)) {
        errors.push({
          message: `Missing required property '${requiredProp}'`,
          location: `${location}.properties.${requiredProp}`,
        });
      }
    }
  }

  // 2) Compare each property that base defines
  for (const [propName, basePropSchema] of Object.entries(baseProps)) {
    const baseProp = basePropSchema as OpenAPIV3.SchemaObject;
    const implProp = implProps[propName] as OpenAPIV3.SchemaObject | undefined;

    if (!implProp) {
      // Possibly flagged above if it's required
      continue;
    }

    // Flatten again in case there's deeper allOf
    const flattenedBaseProp = deepFlattenAllOf(baseProp);
    const flattenedImplProp = deepFlattenAllOf(implProp);

    // Recurse
    errors.push(
      ...checkSchemaCompatibility(
        `${location}.properties.${propName}`,
        flattenedBaseProp,
        flattenedImplProp
      )
    );
  }

  // 3) Check if impl has extra properties that base does not define
  for (const implPropName of Object.keys(implProps)) {
    if (!(implPropName in baseProps)) {
      // => This is an extra field in impl
      // If baseSchema.additionalProperties is false/undefined => error
      if (
        typeof baseSchema.additionalProperties === "undefined" ||
        baseSchema.additionalProperties === false
      ) {
        errors.push({
          message: `Implementation schema has extra property '${implPropName}' not defined in base schema (and 'additionalProperties' is not allowed)`,
          location: `${location}.properties.${implPropName}`,
        });
      } else if (typeof baseSchema.additionalProperties === "object") {
        // If additionalProperties is a schema, check subset
        const extraProp = implProps[implPropName] as OpenAPIV3.SchemaObject;
        const flattenedBaseAdditional = deepFlattenAllOf(
          baseSchema.additionalProperties as OpenAPIV3.SchemaObject
        );
        const flattenedImplProp = deepFlattenAllOf(extraProp);

        errors.push(
          ...checkSchemaCompatibility(
            `${location}.properties.${implPropName}`,
            flattenedBaseAdditional,
            flattenedImplProp
          )
        );
      }
    }
  }

  return errors;
}
