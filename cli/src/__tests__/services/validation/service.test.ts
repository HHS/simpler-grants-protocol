import { OpenAPIV3 } from "openapi-types";
import { checkExtraRoutes } from "../../../services/validation/check-extra-routes";
import { checkMatchingRoutes } from "../../../services/validation/check-matching-routes";
import { checkMissingRequiredRoutes } from "../../../services/validation/check-missing-routes";

describe("compareOpenApiSpecs (top-level flow)", () => {
  // ############################################################
  // Integration tests
  // ############################################################

  it("should find multiple errors in a single run", async () => {
    // Arrange - Create base spec with required route and schema
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {
        "/opportunities": {
          get: {
            tags: ["required"],
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

    // Arrange - Create impl spec with the following issues:
    //   - Missing /opportunities => should flag as missing route
    //   - /custom/extra => should flag as extra route
    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        // Missing /opportunities => should flag as missing route
        "/extra": {
          // Extra route
          get: {
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // Act - Run all validation checks
    const missingRoutesErrors = checkMissingRequiredRoutes(baseDoc, implDoc);
    const extraRoutesErrors = checkExtraRoutes(baseDoc, implDoc);
    const matchingRoutesErrors = checkMatchingRoutes(baseDoc, implDoc);
    const allErrors = [...missingRoutesErrors, ...extraRoutesErrors, ...matchingRoutesErrors];

    // Assert - Check for expected errors
    expect(allErrors.length).toBe(2);
    expect(allErrors.some(e => e.message.includes("Missing required path"))).toBe(true);
    expect(allErrors.some(e => e.message.includes("Extra route found"))).toBe(true);
  });
});
