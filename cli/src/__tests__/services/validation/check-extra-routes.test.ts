import { checkExtraRoutes } from "../../../services/validation/check-extra-routes";
import { OpenAPIV3 } from "openapi-types";

describe("checkExtraRoutes", () => {
  // ############################################################
  // Flag routes not prefixed with /custom/
  // ############################################################

  it("should flag a route not in base and not prefixed with /custom/", () => {
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
        "/extra": {
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

    // Assert - Flag the extra route
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Extra route found/i);
  });

  // ############################################################
  // Ignore routes prefixed with /custom/
  // ############################################################

  it("should not flag a route under /custom/", () => {
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
        "/custom/myCustomRoute": {
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
    expect(errors).toHaveLength(0);
  });
});
