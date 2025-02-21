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
});
