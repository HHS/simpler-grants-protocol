import { checkMissingRequiredRoutes } from "../../../../commands/check/utils/check-missing-routes";
import { OpenAPIV3 } from "openapi-types";

describe("checkMissingRequiredRoutes", () => {
  // ############################################################
  // Flag required routes that are missing
  // ############################################################

  it("should report all missing paths that are required", () => {
    // Arrange - Create base spec with required route
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            tags: ["required"],
            responses: {
              "200": { description: "OK" },
            },
          },
          post: {
            tags: ["required"],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec with no routes
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        // Missing /foo
      },
    };

    // Act
    const errors = checkMissingRequiredRoutes(baseDoc, implDoc);

    // Assert - Should find 1 error about missing /foo
    expect(errors.getErrorCount()).toBe(2);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "MISSING_ROUTE",
        level: "ERROR",
        endpoint: "GET /foo",
        message: "Missing required route 'GET /foo'",
      })
    );
    expect(errors.get(1)).toEqual(
      expect.objectContaining({
        type: "MISSING_ROUTE",
        level: "ERROR",
        endpoint: "POST /foo",
        message: "Missing required route 'POST /foo'",
      })
    );
  });

  // ############################################################
  // Flag required methods that are missing
  // ############################################################

  it("should report missing method that is required", () => {
    // Arrange - Create base spec with required route
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            tags: ["required"],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec with no routes
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        // Missing /foo
      },
    };

    // Act
    const errors = checkMissingRequiredRoutes(baseDoc, implDoc);

    // Assert - Should find 1 error about missing /foo
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "MISSING_ROUTE",
        level: "ERROR",
        endpoint: "GET /foo",
        message: "Missing required route 'GET /foo'",
      })
    );
  });

  // ############################################################
  // All required routes are present
  // ############################################################

  it("should not report when required route is present", () => {
    // Arrange - Create base spec with required route
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            tags: ["required"],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec with required route
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            tags: ["someTag"],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkMissingRequiredRoutes(baseDoc, implDoc);

    // Assert - No errors because all required routes are present
    expect(errors.getErrorCount()).toBe(0);
  });

  // ############################################################
  // Flag optional routes that are missing as warning
  // ############################################################

  it("should report warning when path is optional", () => {
    // Arrange - Create base spec with optional route
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/foo": {
          get: {
            tags: ["optional"],
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec without optional route
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        // Missing /foo
      },
    };

    // Act
    const errors = checkMissingRequiredRoutes(baseDoc, implDoc);

    // Assert - One warning because /foo is optional
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "MISSING_ROUTE",
        level: "WARNING",
        endpoint: "GET /foo",
        message: "Missing optional route 'GET /foo'",
      })
    );
  });
});
