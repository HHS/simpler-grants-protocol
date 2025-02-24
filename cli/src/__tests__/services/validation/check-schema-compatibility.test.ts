import { checkSchemaCompatibility } from "../../../services/validation/check-schema-compatibility";
import { OpenAPIV3 } from "openapi-types";

describe("Schema Compatibility Checks", () => {
  // ############################################################
  // Type checking
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
    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);

    // Assert
    expect(errors).toHaveLength(0);
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
    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Missing required property 'id'/);
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
    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Enum mismatch. Extra value 'C'/);
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
    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);

    // Assert
    expect(errors).toHaveLength(0);
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
    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/extra property 'extra'/);
  });
});
