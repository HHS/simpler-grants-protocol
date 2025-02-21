import { checkMissingRequiredRoutes } from "../../../services/validation/check-missing-routes";
import { OpenAPIV3 } from "openapi-types";

describe("checkMissingRequiredRoutes", () => {
  // ############################################################
  // Missing required routes
  // ############################################################

  it("should report missing required route", () => {
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
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Missing required path/i);
  });

  // ############################################################
  // Present required routes
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
    expect(errors).toHaveLength(0);
  });

  // ############################################################
  // Optional routes
  // ############################################################

  it("should not report when path is optional", () => {
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

    // Assert - No errors because /foo is optional
    expect(errors).toHaveLength(0);
  });
});
