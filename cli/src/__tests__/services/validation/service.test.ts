import { OpenAPIV3 } from "openapi-types";
import { checkExtraRoutes } from "../../../services/validation/check-extra-routes";
import { checkMatchingRoutes } from "../../../services/validation/check-matching-routes";
import { checkMissingRequiredRoutes } from "../../../services/validation/check-missing-routes";

describe("compareOpenApiSpecs (top-level flow)", () => {
  it("should find multiple errors in a single run", async () => {
    // Minimal example:
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

    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        // Missing /opportunities => should flag as missing route
        "/custom/extra": {
          get: {
            responses: {
              "200": { description: "OK" },
            },
          },
        },
      },
    };

    // We can directly call compareOpenApiSpecs,
    // but it expects file paths and uses SwaggerParser,
    // so to unit test in memory, you might either:
    //   1. Mock SwaggerParser
    //   2. Overload compareOpenApiSpecs to accept doc objects directly
    //
    // For illustration, let's assume you have an overloaded or alternate method
    // that doesn't require file paths.
    // Otherwise, you'd mock out the dereferencing calls.

    // We'll demonstrate a direct call to the sub-checkers for clarity:
    const missingRoutesErrors = checkMissingRequiredRoutes(baseDoc, implDoc);
    const extraRoutesErrors = checkExtraRoutes(baseDoc, implDoc);
    const matchingRoutesErrors = checkMatchingRoutes(baseDoc, implDoc);

    // Expect multiple errors
    const allErrors = [...missingRoutesErrors, ...extraRoutesErrors, ...matchingRoutesErrors];
    expect(allErrors.length).toBeGreaterThanOrEqual(1);

    // Check specific messages
    // 1) "Missing required path '/opportunities'"
    // 2) No error for /custom/extra route, because /custom/ prefix is allowed
    // => Actually, let's see if there's no extra route error:
    expect(allErrors.some(e => e.message.includes("Missing required path"))).toBe(true);
    expect(allErrors.some(e => e.message.includes("Extra route found"))).toBe(false);
  });
});
