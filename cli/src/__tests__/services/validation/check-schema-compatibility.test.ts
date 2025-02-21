import { checkSchemaCompatibility } from "../../../services/validation/check-schema-compatibility";
import { OpenAPIV3 } from "openapi-types";

describe("Schema Compatibility Checks", () => {
  it("should allow impl to have a type if base does not specify type", () => {
    // Base has no 'type', so it's effectively "any"
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

    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);
    expect(errors).toHaveLength(0);
  });

  it("should flag missing required property", () => {
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

    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Missing required property 'id'/);
  });

  it("should flag when base has enum but impl is missing a value", () => {
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: ["A", "B", "C"],
    };
    const implSchema: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: ["A", "C"],
    };

    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Enum mismatch. Missing 'B'/);
  });

  it("should allow extra properties if base defines additionalProperties as a schema", () => {
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

    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);
    expect(errors).toHaveLength(0);
  });

  it("should flag extra properties if base has additionalProperties=false", () => {
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

    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/extra property 'extra'/);
  });
});
