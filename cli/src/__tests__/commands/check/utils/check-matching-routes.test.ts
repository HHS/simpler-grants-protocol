import { checkMatchingRoutes } from "../../../../commands/check/utils/check-matching-routes";
import { OpenAPIV3 } from "openapi-types";

describe("checkMatchingRoutes", () => {
  // ############################################################
  // Status code validation
  // ############################################################

  it("should detect missing status codes", () => {
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
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        subType: "MISSING_STATUS_CODE",
        endpoint: "GET /foo",
        message: expect.stringMatching(/Missing response status code \[404\]/),
      })
    );
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
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        subType: "RESPONSE_BODY_CONFLICT",
        endpoint: "GET /users",
        message: expect.stringMatching(/Missing required property 'name'/),
      })
    );
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
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        subType: "RESPONSE_BODY_CONFLICT",
        endpoint: "GET /data",
        message: expect.stringMatching(/Implementation missing content/),
      })
    );
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
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        subType: "RESPONSE_BODY_CONFLICT",
        endpoint: "GET /users",
        message: expect.stringMatching(/Implementation missing schema/),
      })
    );
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
    expect(errors.getErrorCount()).toBe(0);
  });

  // ############################################################
  // Ignore experimental routes
  // ############################################################

  it("should ignore experimental routes", () => {
    // Arrange - Create base spec with experimental route
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.1.0",
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
    expect(errors.getErrorCount()).toBe(0);
  });

  // ############################################################
  // Query parameter validation - missing query parameters
  // ############################################################

  it("should detect missing query parameters", () => {
    // Arrange - Create base spec with required query parameter
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/search": {
          get: {
            parameters: [
              {
                name: "q",
                in: "query",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec missing the required parameter
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/search": {
          get: {
            parameters: [], // Missing required parameter
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should find error about missing parameter
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        message: expect.stringMatching(/Missing required query parameter \[q\]/),
      })
    );
  });

  // ############################################################
  // Query parameter validation - parameter marked as optional
  // ############################################################

  it("should detect when required parameter is marked as optional", () => {
    // Arrange - Create base spec with required query parameter
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/search": {
          get: {
            parameters: [
              {
                name: "q",
                in: "query",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec with optional parameter
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/search": {
          get: {
            parameters: [
              {
                name: "q",
                in: "query",
                required: false, // Should be required
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should find error about required status
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        subType: "QUERY_PARAM_CONFLICT",
        message: expect.stringMatching(/Query parameter \[q\] must be required/),
      })
    );
  });

  // ############################################################
  // Query parameter validation - incompatible parameter schemas
  // ############################################################

  it("should detect incompatible parameter schemas", () => {
    // Arrange - Create base spec with string parameter
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/search": {
          get: {
            parameters: [
              {
                name: "q",
                in: "query",
                required: true,
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec with number parameter
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/search": {
          get: {
            parameters: [
              {
                name: "q",
                in: "query",
                required: true,
                schema: { type: "number" }, // Should be string
              },
            ],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should find error about incompatible schema
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        subType: "QUERY_PARAM_CONFLICT",
        endpoint: "GET /search",
        message: expect.stringMatching(/Type mismatch/),
      })
    );
  });

  // ############################################################
  // Request body validation - missing request body
  // ############################################################

  it("should detect missing request body", () => {
    // Arrange - Create base spec with required request body
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/users": {
          post: {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
            responses: {
              "201": { description: "Created" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec missing the request body
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/users": {
          post: {
            // Missing request body
            responses: {
              "201": { description: "Created" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should find error about missing request body
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        subType: "REQUEST_BODY_CONFLICT",
        endpoint: "POST /users",
        message: expect.stringMatching(/Missing required request body/),
      })
    );
  });

  // ############################################################
  // Request body validation - missing content type
  // ############################################################

  it("should detect missing content type in request body", () => {
    // Arrange - Create base spec with JSON request body
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/users": {
          post: {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
            responses: {
              "201": { description: "Created" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec with empty content object
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/users": {
          post: {
            requestBody: {
              required: true,
              content: {}, // Missing content type
            },
            responses: {
              "201": { description: "Created" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should find error about missing content type
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        subType: "REQUEST_BODY_CONFLICT",
        endpoint: "POST /users",
        message: expect.stringMatching(/Implementation missing schema for expected mime type/),
      })
    );
  });

  // ############################################################
  // Request body validation - incompatible request body schemas
  // ############################################################

  it("should detect incompatible request body schemas", () => {
    // Arrange - Create base spec with object schema
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/users": {
          post: {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
            responses: {
              "201": { description: "Created" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec with incompatible schema
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/users": {
          post: {
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "number" }, // Should be string
                    },
                  },
                },
              },
            },
            responses: {
              "201": { description: "Created" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkMatchingRoutes(baseDoc, implDoc);

    // Assert - Should find error about incompatible schema
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "ROUTE_CONFLICT",
        subType: "REQUEST_BODY_CONFLICT",
        endpoint: "POST /users",
        message: expect.stringMatching(/Type mismatch/),
      })
    );
  });
});
