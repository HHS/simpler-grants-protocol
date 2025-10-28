import {
  transformSpecCompositionToCg,
  fixSchemaComposition,
  detectCompositionIssues,
} from "../../../../commands/check/utils/transform-spec-composition";
import { OpenAPIV3 } from "openapi-types";

describe("transform-spec-composition", () => {
  describe("fixSchemaComposition", () => {
    it("should remove type field when type is [object] and allOf exists", () => {
      const schema = {
        type: ["object"],
        allOf: [{ $ref: "#/components/schemas/SomeSchema" }],
        properties: {},
      };

      const result = fixSchemaComposition(schema, {});

      expect(result).toEqual({
        $ref: "#/components/schemas/SomeSchema",
        properties: {},
      });
      expect("type" in (result as Record<string, unknown>)).toBe(false);
      expect("allOf" in (result as Record<string, unknown>)).toBe(false);
    });

    it('should remove type field when type is "object" and allOf exists', () => {
      const schema = {
        type: "object",
        allOf: [{ $ref: "#/components/schemas/SomeSchema" }],
        properties: {},
      };

      const result = fixSchemaComposition(schema, {});

      expect(result).toEqual({
        $ref: "#/components/schemas/SomeSchema",
        properties: {},
      });
      expect("type" in (result as Record<string, unknown>)).toBe(false);
      expect("allOf" in (result as Record<string, unknown>)).toBe(false);
    });

    it("should not modify schema when type is not object", () => {
      const schema = {
        type: "string",
        allOf: [{ $ref: "#/components/schemas/SomeSchema" }],
      };

      const result = fixSchemaComposition(schema, {});

      expect(result).toEqual(schema);
    });

    it("should not modify schema when allOf is not present", () => {
      const schema = {
        type: "object",
        properties: {},
      };

      const result = fixSchemaComposition(schema, {});

      expect(result).toEqual(schema);
    });

    it("should recursively process nested objects", () => {
      const schema = {
        type: "object",
        properties: {
          nested: {
            type: ["object"],
            allOf: [{ $ref: "#/components/schemas/NestedSchema" }],
          },
        },
      };

      const result = fixSchemaComposition(schema, {});

      expect(result).toEqual({
        type: "object",
        properties: {
          nested: {
            $ref: "#/components/schemas/NestedSchema",
          },
        },
      });
    });

    it("should process arrays of objects", () => {
      const schema = {
        type: "array",
        items: [
          {
            type: ["object"],
            allOf: [{ $ref: "#/components/schemas/ItemSchema" }],
          },
        ],
      };

      const result = fixSchemaComposition(schema, {});

      expect(result).toEqual({
        type: "array",
        items: [
          {
            $ref: "#/components/schemas/ItemSchema",
          },
        ],
      });
    });
  });

  describe("transformSpecCompositionToCg", () => {
    it("should transform response schemas with $ref and return issue status", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/TestResponse",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            TestResponse: {
              type: "object",
              allOf: [{ $ref: "#/components/schemas/BaseResponse" }],
              properties: {
                data: { type: "string" },
              },
            },
            BaseResponse: {
              type: "object",
              properties: {
                status: { type: "string" },
              },
            },
          },
        },
      };

      const result = transformSpecCompositionToCg(spec);

      // Check that issues were detected
      expect(result.hadIssues).toBe(true);

      // Check that the response schema was inlined and transformed
      const response = result.transformed.paths?.["/test"]?.get?.responses?.["200"];
      const responseSchema =
        response && "content" in response
          ? response.content?.["application/json"]?.schema
          : undefined;
      expect(responseSchema).toEqual({
        $ref: "#/components/schemas/BaseResponse",
        properties: {
          data: { type: "string" },
        },
      });
      expect("type" in (responseSchema as Record<string, unknown>)).toBe(false);
      expect("allOf" in (responseSchema as Record<string, unknown>)).toBe(false);
    });

    it("should transform component schemas and return issue status", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestSchema: {
              type: "object",
              allOf: [{ $ref: "#/components/schemas/BaseSchema" }],
              properties: {
                field: { type: "string" },
              },
            },
          },
        },
      };

      const result = transformSpecCompositionToCg(spec);

      // Check that issues were detected
      expect(result.hadIssues).toBe(true);

      const transformedSchema = result.transformed.components?.schemas?.TestSchema;
      expect(transformedSchema).toEqual({
        $ref: "#/components/schemas/BaseSchema",
        properties: {
          field: { type: "string" },
        },
      });
      expect("type" in (transformedSchema as Record<string, unknown>)).toBe(false);
      expect("allOf" in (transformedSchema as Record<string, unknown>)).toBe(false);
    });

    it("should return hadIssues: false when no transformation is needed", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestSchema: {
              type: "string",
              properties: {
                field: { type: "string" },
              },
            },
          },
        },
      };

      const result = transformSpecCompositionToCg(spec);

      // Check that no issues were detected
      expect(result.hadIssues).toBe(false);
    });
  });

  describe("detectCompositionIssues", () => {
    it("should detect composition issues in response schemas", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        allOf: [{ $ref: "#/components/schemas/BaseResponse" }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            BaseResponse: {
              type: "object",
              properties: {
                status: { type: "string" },
              },
            },
          },
        },
      };

      expect(detectCompositionIssues(spec)).toBe(true);
    });

    it("should detect composition issues in component schemas", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestSchema: {
              type: "object",
              allOf: [{ $ref: "#/components/schemas/BaseSchema" }],
            },
          },
        },
      };

      expect(detectCompositionIssues(spec)).toBe(true);
    });

    it('should detect composition issues with type: "object"', () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestSchema: {
              type: "object",
              allOf: [{ $ref: "#/components/schemas/BaseSchema" }],
            },
          },
        },
      };

      expect(detectCompositionIssues(spec)).toBe(true);
    });

    it("should not detect issues when type is not object", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestSchema: {
              type: "string",
              allOf: [{ $ref: "#/components/schemas/BaseSchema" }],
            },
          },
        },
      };

      expect(detectCompositionIssues(spec)).toBe(false);
    });

    it("should not detect issues when allOf is not present", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestSchema: {
              type: "object",
              properties: {
                field: { type: "string" },
              },
            },
          },
        },
      };

      expect(detectCompositionIssues(spec)).toBe(false);
    });

    it("should detect issues in nested objects", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestSchema: {
              type: "object",
              properties: {
                nested: {
                  type: "object",
                  allOf: [{ $ref: "#/components/schemas/NestedSchema" }],
                },
              },
            },
          },
        },
      };

      expect(detectCompositionIssues(spec)).toBe(true);
    });

    it("should detect issues in arrays of objects", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            TestSchema: {
              type: "array",
              items: {
                type: "object",
                allOf: [{ $ref: "#/components/schemas/ItemSchema" }],
              },
            },
          },
        },
      };

      expect(detectCompositionIssues(spec)).toBe(true);
    });

    it("should return false for empty spec", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      expect(detectCompositionIssues(spec)).toBe(false);
    });

    it("should return false for spec with no schemas", () => {
      const spec: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: {
                "200": {
                  description: "Success",
                  content: {
                    "application/json": {
                      schema: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      expect(detectCompositionIssues(spec)).toBe(false);
    });
  });
});
