import { checkSchemaCompatibility } from "../../../../commands/check/utils/check-schema-compatibility";
import type { SchemaContext } from "../../../../commands/check/utils/types";
import { OpenAPIV3 } from "openapi-types";

describe("Schema Compatibility Checks", () => {
  const location = "TestLocation";
  const ctx = {
    endpoint: "GET /users",
    statusCode: "200",
    mimeType: "application/json",
    errorType: "ROUTE_CONFLICT",
    errorSubType: "RESPONSE_BODY_CONFLICT",
  } as SchemaContext;

  // ############################################################
  // Type checking - ignore any type in base schema
  // ############################################################

  it("should allow impl to have a type if base does not specify type", () => {
    // Arrange - "foo" has no "type", so it's effectively "any"
    const baseSchema: OpenAPIV3.SchemaObject = {
      description: "Base schema with no type",
      type: "object",
      properties: {
        foo: {},
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: "string" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(0);
  });

  // ############################################################
  // Type checking - flag mismatched types
  // ############################################################

  it("should flag mismatched types", () => {
    // Arrange - "foo" has no "type", so it's effectively "any"
    const baseSchema: OpenAPIV3.SchemaObject = {
      description: "Base schema with no type",
      type: "object",
      properties: {
        foo: { type: "integer" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: "string" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        conflictType: "TYPE_CONFLICT",
        location: `${location}.foo`,
        baseType: "integer",
        implType: "string",
      })
    );
  });

  // ############################################################
  // Type checking - OpenAPI 3.1 array types (compatible with OpenAPI 3.0)
  // ############################################################

  it("should allow type: [object] to be compatible with type: object", () => {
    // Arrange - Base uses string type, impl uses array type (OpenAPI 3.1)
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: "object" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["object"] as unknown as "object" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(0);
  });

  it("should allow type: object to be compatible with type: [object]", () => {
    // Arrange - Base uses array type (OpenAPI 3.1), impl uses string type
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["string"] as unknown as "string" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: "string" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(0);
  });

  it("should allow multiple types in same order", () => {
    // Arrange - Impl uses nullable type (OpenAPI 3.1 syntax)
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["string", "integer"] as unknown as "string" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["string", "integer"] as unknown as "string" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(0);
  });

  it("should allow multiple types in different order", () => {
    // Arrange - Impl uses nullable type (OpenAPI 3.1 syntax)
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["string", "integer"] as unknown as "string" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["integer", "string"] as unknown as "string" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(0);
  });

  it("should flag mismatched array types", () => {
    // Arrange - Array types don't match
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["integer"] as unknown as "integer" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["string"] as unknown as "string" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        conflictType: "TYPE_CONFLICT",
        location: `${location}.foo`,
        baseType: "integer",
        implType: "string",
      })
    );
  });

  it("should flag mismatched types when impl has multiple types and base has different string type", () => {
    // Arrange - Base string type doesn't match impl array type
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: "string" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["integer"] as unknown as "string" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        conflictType: "TYPE_CONFLICT",
        location: `${location}.foo`,
        baseType: "string",
        implType: "integer",
      })
    );
  });

  it("should show all types in error message when there are multiple mismatched types", () => {
    // Arrange - Both have multiple types but they don't match
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["string", "number"] as unknown as "string" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: ["integer", "boolean"] as unknown as "string" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        conflictType: "TYPE_CONFLICT",
        location: `${location}.foo`,
        baseType: "string | number",
        implType: "integer | boolean",
      })
    );
  });

  // ############################################################
  // Required properties
  // ############################################################

  it("should flag missing required property", () => {
    // Arrange
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        // missing 'id'
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);
    const error = errors.get(0);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(error).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        location: `${location}.id`,
        conflictType: "MISSING_FIELD",
      })
    );
  });

  // ############################################################
  // Optional properties
  // ############################################################

  it("should ignore missing properties if they are optional in base schema", () => {
    // Arrange
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        id: { type: "string" },
        // missing 'name'
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(0);
  });

  // ############################################################
  // Enum validation
  // ############################################################

  it("should flag when base has enum but impl is missing a value", () => {
    // Arrange
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: ["A", "B"],
    };
    const implSchema: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: ["A", "B", "C"],
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);
    const error = errors.get(0);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(error).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        location: location,
        conflictType: "ENUM_CONFLICT",
      })
    );
  });

  // ############################################################
  // Additional properties
  // ############################################################

  it("should allow extra properties if base defines additionalProperties as a schema", () => {
    // Arrange
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
      },
      additionalProperties: {
        type: "number", // any additional fields must be numbers
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
        extra: { type: "number" }, // valid per additionalProperties
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(0);
  });

  it("should flag extra properties if base has additionalProperties=false", () => {
    // Arrange
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
      },
      additionalProperties: false,
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
        extra: { type: "string" }, // not allowed
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);
    const error = errors.get(0);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(error).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        location: `${location}.extra`,
        conflictType: "EXTRA_FIELD",
      })
    );
  });

  it("should check the compatibility of additionalProperties schemas", () => {
    // Arrange
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      additionalProperties: { type: "string" },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      additionalProperties: { type: "number" },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        location: `${location}[prop]`,
        conflictType: "TYPE_CONFLICT",
      })
    );
  });

  // ############################################################
  // Nested checks of complex schemas
  // ############################################################

  it("should validated nested objects", () => {
    // Arrange
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
        nested: {
          type: "object",
          properties: {
            foo: { type: "string" },
          },
        },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
        nested: {
          type: "object",
          properties: {
            foo: { type: "integer" },
          },
        },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        location: `${location}.nested.foo`,
        conflictType: "TYPE_CONFLICT",
      })
    );
  });

  it("should validate nested arrays", () => {
    // Arrange
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
        nested: {
          type: "array",
          items: {
            type: "object",
            properties: {
              foo: { type: "string" },
            },
          },
        },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
        nested: {
          type: "array",
          items: {
            type: "object",
            properties: {
              foo: { type: "integer" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        location: `${location}.nested[0].foo`,
        conflictType: "TYPE_CONFLICT",
      })
    );
  });

  // ############################################################
  // Type checking - simple type matches (README: Type case 3)
  // ############################################################

  it("should pass when simple types match exactly", () => {
    // Arrange - Both base and impl have the same string type
    // README: Type case 3 - Simple type matches -> Ignore
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert - No errors because types match
    expect(errors.getErrorCount()).toBe(0);
  });

  // ############################################################
  // Enum validation - enums match (README: Enum case 1)
  // ############################################################

  it("should pass when enum values match exactly", () => {
    // Arrange - Both base and impl have the same enum values
    // README: Enum case 1 - Enums match -> Ignore
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: ["active", "inactive"],
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: ["active", "inactive"],
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert - No errors because enums match
    expect(errors.getErrorCount()).toBe(0);
  });

  // ############################################################
  // Enum validation - base has extra values (README: Enum case 2)
  // ############################################################

  it("should pass when base has more enum values than impl", () => {
    // Arrange - Base has extra enum value "pending" not in impl
    // README: Enum case 2 - Base type has extra -> Ignore
    // Impl can support a subset because a valid impl input is still valid for base
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: ["active", "inactive", "pending"],
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: ["active", "inactive"],
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert - No errors because impl is a subset of base
    expect(errors.getErrorCount()).toBe(0);
  });

  // ############################################################
  // Missing optional property emits warning (README: Schema case 2.2)
  // ############################################################

  it("should not error when missing property is optional in base schema", () => {
    // Arrange - "description" is optional (not in required array)
    // README: Schema case 2.2 - Missing optional prop -> Warn
    // NOTE: Current implementation silently ignores missing optional props
    // rather than emitting a warning. This test documents the current behavior.
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
      },
      // 'description' is NOT in required, so it's optional
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        // missing optional 'description' property
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert - No errors because 'description' is optional
    expect(errors.getErrorCount()).toBe(0);
  });

  // ############################################################
  // Additional properties - default (undefined) allows extras
  // (README: Schema case 1.1 variant - additionalProperties not set)
  // ############################################################

  // TODO: README Schema case 1.1 says undefined additionalProperties should
  // allow extras. Current impl treats undefined as disallowed and flags an
  // error. See TODO in check-schema-compatibility.ts:198. Update test when fixed.
  it("should flag extra properties when additionalProperties is not set (known deviation from README spec)", () => {
    // Arrange - additionalProperties is undefined
    // README says this should allow extras, but current impl flags them
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        extra_prop: { type: "string" },
      },
    };

    // Act
    const errors = checkSchemaCompatibility(location, baseSchema, implSchema, ctx);

    // Assert
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        conflictType: "EXTRA_FIELD",
        location: `${location}.extra_prop`,
      })
    );
  });
});
