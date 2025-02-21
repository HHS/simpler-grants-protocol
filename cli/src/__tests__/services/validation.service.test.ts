import { beforeEach, describe, it, jest, expect } from "@jest/globals";
import { DefaultValidationService } from "../../services/validation.service";

describe("DefaultValidationService", () => {
  let service: DefaultValidationService;

  beforeEach(() => {
    service = new DefaultValidationService();
  });

  describe("checkApi", () => {
    it("should validate API implementation", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.checkApi("http://api.example.com", "spec.yaml", {
        allowExtraRoutes: true,
      });
      expect(consoleSpy).toHaveBeenCalledWith("Mock: Checking API", {
        apiUrl: "http://api.example.com",
        specPath: "spec.yaml",
        options: { allowExtraRoutes: true },
      });
    });
  });

  describe("checkSpec", () => {
    it("should validate spec compliance", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.checkSpec("spec.yaml", {
        baseSpecPath: "base-spec.yaml",
        allowExtraRoutes: true,
      });
      expect(consoleSpy).toHaveBeenCalledWith("Mock: Checking spec compliance", {
        specPath: "spec.yaml",
        options: { baseSpecPath: "base-spec.yaml", allowExtraRoutes: true },
      });
    });
  });
});

// ############################################################
// Utility functions
// ############################################################

/**
 * compliance-checker.spec.ts
 *
 * Example Jest tests for the compliance checker methods.
 */
import { OpenAPIV3 } from "openapi-types";
import {
  checkMissingRequiredRoutes,
  checkExtraRoutes,
  checkMatchingRoutes,
  checkSchemaCompatibility,
} from "../../services/validation.service";

describe("checkMissingRequiredRoutes", () => {
  it("should report missing required route", () => {
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

    const implDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Impl", version: "1.0.0" },
      paths: {
        // Missing /foo
      },
    };

    const errors = checkMissingRequiredRoutes(baseDoc, implDoc);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Missing required path/i);
  });

  it("should not report when required route is present", () => {
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

    const errors = checkMissingRequiredRoutes(baseDoc, implDoc);
    expect(errors).toHaveLength(0);
  });
});

describe("checkExtraRoutes", () => {
  it("should flag a route not in base and not prefixed with /custom/", () => {
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {},
    };

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

    const errors = checkExtraRoutes(baseDoc, implDoc);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Extra route found/i);
  });

  it("should not flag a route under /custom/", () => {
    const baseDoc: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: { title: "Base", version: "1.0.0" },
      paths: {},
    };

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

    const errors = checkExtraRoutes(baseDoc, implDoc);
    expect(errors).toHaveLength(0);
  });
});

describe("checkMatchingRoutes", () => {
  it("should detect mismatched status codes", () => {
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

    // We use checkMatchingRoutes which calls checkStatusCodes internally
    const errors = checkMatchingRoutes(baseDoc, implDoc);
    // Expect at least 1 error about missing 404
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Missing response status code \[404\]/);
  });
});

describe("Schema Compatibility Checks", () => {
  it("should allow impl to have a type if base does not specify type", () => {
    // Base has no 'type', so it's effectively "any"
    const baseSchema: OpenAPIV3.SchemaObject = {
      description: "Base schema with no type",
      type: "object",
      properties: {
        foo: {},
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        foo: { type: "string" },
      },
    };

    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);
    expect(errors).toHaveLength(0);
  });

  it("should flag missing required property", () => {
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        // missing 'id'
      },
    };

    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Missing required property 'id'/);
  });

  it("should flag when base has enum but impl is missing a value", () => {
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: ["A", "B", "C"],
    };
    const implSchema: OpenAPIV3.SchemaObject = {
      type: "string",
      enum: ["A", "C"],
    };

    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/Enum mismatch. Missing 'B'/);
  });

  it("should allow extra properties if base defines additionalProperties as a schema", () => {
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
      },
      additionalProperties: {
        type: "number", // any additional fields must be numbers
      },
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
        extra: { type: "number" }, // valid per additionalProperties
      },
    };

    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);
    expect(errors).toHaveLength(0);
  });

  it("should flag extra properties if base has additionalProperties=false", () => {
    const baseSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
      },
      additionalProperties: false,
    };

    const implSchema: OpenAPIV3.SchemaObject = {
      type: "object",
      properties: {
        known: { type: "string" },
        extra: { type: "string" }, // not allowed
      },
    };

    const errors = checkSchemaCompatibility("TestLocation", baseSchema, implSchema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/extra property 'extra'/);
  });
});

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
