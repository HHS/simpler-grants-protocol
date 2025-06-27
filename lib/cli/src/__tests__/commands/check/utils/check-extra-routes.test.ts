import { checkExtraRoutes } from "../../../../commands/check/utils/check-extra-routes";
import { OpenAPIV3 } from "openapi-types";

describe("checkExtraRoutes", () => {
  // ############################################################
  // Flag routes not prefixed with /custom/
  // ############################################################

  it("should flag a route prefixed with /common-grants/ that is not in base", () => {
    // Arrange - Create base spec with no routes
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {},
    };

    // Arrange - Create impl spec with extra route
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/common-grants/extra": {
          get: {
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkExtraRoutes(baseDoc, implDoc);
    const error = errors.get(0);

    // Assert - Flag the extra route
    expect(errors.getErrorCount()).toBe(1);
    expect(error).toEqual(
      expect.objectContaining({
        type: "EXTRA_ROUTE",
        level: "ERROR",
        endpoint: "GET /common-grants/extra",
      })
    );
  });

  // ############################################################
  // Flag multiple extra routes with same path
  // ############################################################

  it("should flag multiple extra routes with same path", () => {
    // Arrange - Create base spec with no routes
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {},
    };

    // Arrange - Create impl spec with extra routes
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/common-grants/extra": {
          get: {
            responses: {
              "200": { description: "OK" },
            },
          },
          post: {
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkExtraRoutes(baseDoc, implDoc);

    // Assert - Flag the extra routes
    expect(errors.getErrorCount()).toBe(2);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "EXTRA_ROUTE",
        level: "ERROR",
        endpoint: "GET /common-grants/extra",
      })
    );
    expect(errors.get(1)).toEqual(
      expect.objectContaining({
        type: "EXTRA_ROUTE",
        level: "ERROR",
        endpoint: "POST /common-grants/extra",
      })
    );
  });

  // ############################################################
  // Flag extra routes with same path but different methods
  // ############################################################

  it("should flag extra routes with same path but different methods", () => {
    // Arrange - Create base spec with no routes
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/common-grants/extra": {
          get: {
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Arrange - Create impl spec with extra routes
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/common-grants/extra": {
          get: {
            // This is a base route
            responses: {
              "200": { description: "OK" },
            },
          },
          post: {
            // This is an extra route
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkExtraRoutes(baseDoc, implDoc);

    // Assert - Flag the extra route
    expect(errors.getErrorCount()).toBe(1);
    expect(errors.get(0)).toEqual(
      expect.objectContaining({
        type: "EXTRA_ROUTE",
        level: "ERROR",
        endpoint: "POST /common-grants/extra",
      })
    );
  });

  // ############################################################
  // Ignore routes prefixed with /custom/
  // ############################################################

  it("should not flag a route not prefixed with /common-grants/", () => {
    // Arrange - Create base spec with no routes
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {},
    };

    // Arrange - Create impl spec with custom route
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        "/myCustomRoute": {
          get: {
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Act
    const errors = checkExtraRoutes(baseDoc, implDoc);

    // Assert - No errors
    expect(errors.getErrorCount()).toBe(0);
  });
});
