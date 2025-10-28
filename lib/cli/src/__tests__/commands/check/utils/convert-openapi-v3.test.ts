import {
  convertOpenApiToV3,
  OpenAPISchema,
} from "../../../../commands/check/utils/convert-openapi-v3";
import { OpenAPIV3 } from "openapi-types";

// ############################################################
// Test Helpers
// ############################################################

/**
 * Extract a response schema from a converted OpenAPI document
 */
function getResponseSchema(
  schema: OpenAPISchema,
  path: string,
  statusCode: string = "200"
): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
  const response = schema.paths[path]?.get?.responses?.[statusCode] as OpenAPIV3.ResponseObject;
  return response?.content?.["application/json"]?.schema as
    | OpenAPIV3.SchemaObject
    | OpenAPIV3.ReferenceObject;
}

/**
 * Get a property from a schema object with proper type casting
 */
function getSchemaProperty(
  schema: OpenAPIV3.SchemaObject,
  propertyName: string
): OpenAPIV3.SchemaObject {
  expect(schema.properties?.[propertyName]).toBeDefined();
  return schema.properties?.[propertyName] as OpenAPIV3.SchemaObject;
}

/**
 * Assert that a schema property has the expected type
 */
function expectPropertyType(
  schema: OpenAPIV3.SchemaObject,
  propertyName: string,
  expectedType: string
): void {
  const property = getSchemaProperty(schema, propertyName);
  expect(property.type).toBe(expectedType);
}

/**
 * Get a reference object from a schema
 */
function getReferenceSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): OpenAPIV3.ReferenceObject {
  return schema as OpenAPIV3.ReferenceObject;
}

describe("OpenAPI v3.1 to v3.0 Conversion", () => {
  // ############################################################
  // Array type normalization
  // ############################################################

  it("should convert single-element type array to string", () => {
    // Arrange - Create schema with type as single-element array (OpenAPI 3.1 syntax)
    const schema: OpenAPISchema = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {
        "/test": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        field: {
                          type: ["string"] as unknown as "string",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Act
    const converted = convertOpenApiToV3(schema);

    // Assert - Type array should be converted to string
    expect(converted.openapi).toBe("3.0.0");
    const responseSchema = getResponseSchema(converted, "/test") as OpenAPIV3.SchemaObject;
    expectPropertyType(responseSchema, "field", "string");
  });

  // eslint-disable-next-line jest/expect-expect
  it("should convert type: [object] to type: object", () => {
    // Arrange - Create schema with type: [object] which causes issues with allOf
    const schema: OpenAPISchema = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {
        "/test": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        paginationInfo: {
                          type: ["object"] as unknown as "object",
                          allOf: [
                            {
                              $ref: "#/components/schemas/PaginationInfo",
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          PaginationInfo: {
            type: "object",
            properties: {
              page: { type: "integer" },
              pageSize: { type: "integer" },
            },
          },
        },
      },
    };

    // Act
    const converted = convertOpenApiToV3(schema);

    // Assert - Type array should be converted to string
    const responseSchema = getResponseSchema(converted, "/test") as OpenAPIV3.SchemaObject;
    expectPropertyType(responseSchema, "paginationInfo", "object");
  });

  // eslint-disable-next-line jest/expect-expect
  it("should handle multiple types with null by taking first non-null type", () => {
    // Arrange - Create schema with nullable type array (OpenAPI 3.1 syntax)
    const schema: OpenAPISchema = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {
        "/test": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        optionalField: {
                          type: ["string", "null"] as unknown as "string",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Act
    const converted = convertOpenApiToV3(schema);

    // Assert - Should take first non-null type
    const responseSchema = getResponseSchema(converted, "/test") as OpenAPIV3.SchemaObject;
    expectPropertyType(responseSchema, "optionalField", "string");
  });

  it("should normalize types in nested objects", () => {
    // Arrange - Create schema with nested array types
    const schema: OpenAPISchema = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {
        "/test": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        nested: {
                          type: ["object"] as unknown as "object",
                          properties: {
                            deepField: {
                              type: ["integer"] as unknown as "integer",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Act
    const converted = convertOpenApiToV3(schema);

    // Assert - All nested types should be normalized
    const responseSchema = getResponseSchema(converted, "/test") as OpenAPIV3.SchemaObject;
    const nestedSchema = getSchemaProperty(responseSchema, "nested");
    expect(nestedSchema.type).toBe("object");
    expectPropertyType(nestedSchema, "deepField", "integer");
  });

  it("should normalize types in array items", () => {
    // Arrange - Create schema with array types in items
    const schema: OpenAPISchema = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {
        "/test": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        items: {
                          type: "array",
                          items: {
                            type: ["object"] as unknown as "object",
                            properties: {
                              id: {
                                type: ["string"] as unknown as "string",
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Act
    const converted = convertOpenApiToV3(schema);

    // Assert - Types in array items should be normalized
    const responseSchema = getResponseSchema(converted, "/test") as OpenAPIV3.SchemaObject;
    const itemsArraySchema = getSchemaProperty(
      responseSchema,
      "items"
    ) as OpenAPIV3.ArraySchemaObject;
    const itemsSchema = itemsArraySchema.items as OpenAPIV3.SchemaObject;
    expect(itemsSchema.type).toBe("object");
    expectPropertyType(itemsSchema, "id", "string");
  });

  // ############################################################
  // Schema reference conversion
  // ############################################################

  it("should convert component schema references to definitions", () => {
    // Arrange - Create schema with components/schemas references
    const schema: OpenAPISchema = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {
        "/test": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/TestModel",
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          TestModel: {
            type: "object",
            properties: {
              id: { type: "string" },
            },
          },
        },
      },
    };

    // Act
    const converted = convertOpenApiToV3(schema);

    // Assert - References should be converted to #/definitions/
    const responseSchema = getReferenceSchema(getResponseSchema(converted, "/test"));
    expect(responseSchema.$ref).toBe("#/definitions/TestModel");
    expect(converted.definitions).toBeDefined();
    expect(converted.definitions?.TestModel).toBeDefined();
    expect(converted.components).toBeUndefined();
  });

  it("should move schemas from components to definitions", () => {
    // Arrange - Create schema with components/schemas
    const schema: OpenAPISchema = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {},
      components: {
        schemas: {
          Model1: {
            type: "object",
            properties: {
              field1: { type: "string" },
            },
          },
          Model2: {
            type: "object",
            properties: {
              field2: { type: "number" },
            },
          },
        },
      },
    };

    // Act
    const converted = convertOpenApiToV3(schema);

    // Assert - Schemas should be in definitions, not components
    expect(converted.definitions).toBeDefined();
    expect(converted.definitions?.Model1).toEqual({
      type: "object",
      properties: {
        field1: { type: "string" },
      },
    });
    expect(converted.definitions?.Model2).toEqual({
      type: "object",
      properties: {
        field2: { type: "number" },
      },
    });
    expect(converted.components).toBeUndefined();
  });

  it("should convert $defs references to definitions", () => {
    // Arrange - Create schema with $defs references
    const schema: OpenAPISchema = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {
        "/test": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/$defs/TestModel",
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Act
    const converted = convertOpenApiToV3(schema);

    // Assert - $defs references should be converted to #/definitions/
    const responseSchema = getReferenceSchema(getResponseSchema(converted, "/test"));
    expect(responseSchema.$ref).toBe("#/definitions/TestModel");
  });

  // ############################################################
  // Version update
  // ############################################################

  it("should update openapi version to 3.0.0", () => {
    // Arrange - Create schema with version 3.1.0
    const schema: OpenAPISchema = {
      openapi: "3.1.0",
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      paths: {},
    };

    // Act
    const converted = convertOpenApiToV3(schema);

    // Assert - Version should be updated to 3.0.0
    expect(converted.openapi).toBe("3.0.0");
  });
});
