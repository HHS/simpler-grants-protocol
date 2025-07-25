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
});
