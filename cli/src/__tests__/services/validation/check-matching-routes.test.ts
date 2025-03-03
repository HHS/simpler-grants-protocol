import { checkMatchingRoutes } from "../../../services/validation/check-matching-routes";
import { OpenAPIV3 } from "openapi-types";

describe("checkMatchingRoutes", () => {
  // ############################################################
  // Status code validation
  // ############################################################

  it("should detect mismatched status codes", () => {
    // Arrange - Create base spec with 200 and 404 responses
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            responses: {
              "200": { description: "OK" },
              "404": { description: "Not Found" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec missing 404 response
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            responses: {
              "200": { description: "OK" },
              // missing 404
            },
          },
        },
      },
    };

    // Act
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should find 1 error about missing 404
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Missing response status code \[404\]/);
  });

  // ############################################################
  // Response schema validation
  // ############################################################

  it("should validate response schemas for compatibility", () => {
    // Arrange - Create base spec with response schema
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      required: ["id", "name"],
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        email: { type: "string" },
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

    // Arrange - Create impl spec with incompatible schema (missing required field)
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        // missing required 'name' field
                        email: { type: "string" },
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
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should find error about missing required field
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Missing required property 'name'/);
  });

  // ############################################################
  // Content type validation
  // ############################################################

  it("should validate response content types", () => {
    // Arrange - Create base spec with JSON response
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/data": {
          get: {
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { type: "object" },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec missing content type
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/data": {
          get: {
            responses: {
              "200": {
                description: "OK",
                // missing content
              },
            },
          },
        },
      },
    };

    // Act
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should find error about missing content
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Implementation missing content/);
  });

  // ############################################################
  // Schema compatibility - missing schema
  // ############################################################

  it("should detect missing schema in matching content type", () => {
    // Arrange - Create base spec with response schema
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { type: "object" },
                  },
                },
              },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec missing schema
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    // missing schema
                  },
                },
              },
            },
          },
        },
      },
    };

    // Act
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should find error about missing schema
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Implementation missing schema/);
  });

  // ############################################################
  // Schema compatibility - compatible schema
  // ############################################################

  it("should pass when response schemas are compatible", () => {
    // Arrange - Create base spec with response schema
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      required: ["id"],
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
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

    // Arrange - Create impl spec with compatible schema (has all required fields)
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      required: ["id"],
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
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
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should have no errors
    expect(errors).toHaveLength(0);
  });

  // ############################################################
  // Ignore experimental routes
  // ############################################################

  it("should ignore experimental routes", () => {
    // Arrange - Create base spec with experimental route
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            tags: ["experimental"],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec with mismatched experimental route
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            tags: ["experimental"],
            responses: {
              "201": { description: "Created" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should have no errors because experimental routes are ignored
    expect(errors).toHaveLength(0);
  });
});
