import { deepFlattenAllOf } from "../../../../commands/check/utils/flatten-schemas";
import { OpenAPIV3 } from "openapi-types";

describe("Schema Flattening", () => {
  // ############################################################
  // Root level allOf flattening
  // ############################################################

  it("should flatten allOf schemas at the root level", () => {
    // Arrange - Create schema with allOf at root level
    const schema: OpenAPIV3.SchemaObject = {
      allOf: [
        {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
        {
          type: "object",
          properties: {
            age: { type: "number" },
          },
        },
      ],
    };

    // Act
    const flattened = deepFlattenAllOf(schema);

    // Assert - Properties from both schemas should be merged
    expect(flattened.type).toBe("object");
    expect(flattened.properties).toEqual({
      name: { type: "string" },
      age: { type: "number" },
    });
  });

  // ############################################################
  // Nested object allOf flattening
  // ############################################################

  it("should flatten allOf schemas in a nested object", () => {
    // Arrange - Create schema with allOf in nested property
    const schema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        user: {
          allOf: [
            {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
            {
              type: "object",
              properties: {
                age: { type: "number" },
              },
            },
          ],
        } as OpenAPIV3.SchemaObject,
      },
    };

    // Act
    const flattened = deepFlattenAllOf(schema);

    // Assert - Nested allOf should be flattened
    const userSchema = flattened.properties?.user as OpenAPIV3.SchemaObject;
    expect(userSchema).toBeDefined();
    expect(userSchema.type).toBe("object");
    expect(userSchema.properties).toEqual({
      name: { type: "string" },
      age: { type: "number" },
    });
  });

  // ############################################################
  // Array allOf flattening
  // ############################################################

  it("should flatten allOf schemas in an array", () => {
    // Arrange - Create schema with allOf in array items
    const schema: OpenAPIV3.ArraySchemaObject = {
      type: "array",
      items: {
        allOf: [
          {
            type: "object",
            properties: {
              name: { type: "string" },
            },
          },
          {
            type: "object",
            properties: {
              age: { type: "number" },
            },
          },
        ],
      } as OpenAPIV3.SchemaObject,
    };

    // Act
    const flattened = deepFlattenAllOf(schema) as OpenAPIV3.ArraySchemaObject;

    // Assert - Array items should have flattened schema
    expect(flattened.type).toBe("array");
    expect(flattened.items).toBeDefined();
    const itemSchema = flattened.items as OpenAPIV3.SchemaObject;
    expect(itemSchema.type).toBe("object");
    expect(itemSchema.properties).toEqual({
      name: { type: "string" },
      age: { type: "number" },
    });
  });

  // ############################################################
  // Deeply nested array allOf flattening
  // ############################################################

  it("should flatten allOf schemas in a nested array", () => {
    // Arrange - Create schema with allOf in deeply nested array
    const schema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        users: {
          type: "array",
          items: {
            allOf: [
              {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
              },
              {
                type: "object",
                properties: {
                  contacts: {
                    type: "array",
                    items: {
                      allOf: [
                        {
                          type: "object",
                          properties: {
                            email: { type: "string" },
                          },
                        },
                        {
                          type: "object",
                          properties: {
                            phone: { type: "string" },
                          },
                        },
                      ],
                    } as OpenAPIV3.SchemaObject,
                  } as OpenAPIV3.ArraySchemaObject,
                },
              },
            ],
          } as OpenAPIV3.SchemaObject,
        } as OpenAPIV3.ArraySchemaObject,
      },
    };

    // Act
    const flattened = deepFlattenAllOf(schema);

    // Assert - Both levels of nested arrays should have flattened schemas
    const usersArray = flattened.properties?.users as OpenAPIV3.ArraySchemaObject;
    const userSchema = usersArray.items as OpenAPIV3.SchemaObject;
    const contactsArray = userSchema.properties?.contacts as OpenAPIV3.ArraySchemaObject;
    const contactSchema = contactsArray.items as OpenAPIV3.SchemaObject;

    // Check user schema
    expect(userSchema.type).toBe("object");
    expect(userSchema.properties?.name).toEqual({ type: "string" });

    // Check contact schema
    expect(contactSchema.type).toBe("object");
    expect(contactSchema.properties).toEqual({
      email: { type: "string" },
      phone: { type: "string" },
    });
  });
});
