import { OpenAPIV3 } from "openapi-types";
import { DefaultCheckService } from "../../../commands/check/check-service";
import SwaggerParser from "@apidevtools/swagger-parser";
import * as fs from "fs";
import * as yaml from "js-yaml";

// Mock dependencies
jest.mock("@apidevtools/swagger-parser", () => ({
  dereference: jest.fn(),
}));

jest.mock("../../../utils/typespec", () => ({
  compileTypeSpec: jest.fn(),
}));

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

jest.mock("js-yaml", () => ({
  load: jest.fn(),
}));

describe("ValidationService", () => {
  let service: DefaultCheckService;
  const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    service = new DefaultCheckService();
    jest.clearAllMocks();

    // Mock fs.existsSync to return true for base spec path
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe("checkApi", () => {
    // ############################################################
    // API validation
    // ############################################################

    it("should validate API implementation with options", async () => {
      // Arrange
      const apiUrl = "http://api.example.com";
      const specPath = "spec.yaml";
      const options = {
        client: "httpx",
        report: "json" as const,
        auth: "token123",
      };

      // Act
      await service.checkApi(apiUrl, specPath, options);

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith("Mock: Checking API", {
        apiUrl,
        specPath,
        options,
      });
    });

    it("should validate API implementation without options", async () => {
      // Arrange
      const apiUrl = "http://api.example.com";
      const specPath = "spec.yaml";

      // Act
      await service.checkApi(apiUrl, specPath, {});

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith("Mock: Checking API", {
        apiUrl,
        specPath,
        options: {},
      });
    });

    // Note: More tests will be needed once the actual implementation is added:
    // - Test API reachability
    // - Test spec parsing
    // - Test route validation
    // - Test response validation
    // - Test error handling
  });

  describe("checkSpec", () => {
    // ############################################################
    // Base spec validation - using default spec
    // ############################################################

    it("should use default spec when no base spec provided", async () => {
      // Arrange
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Base", version: "1.0.0" },
        paths: {
          "/opportunities": {
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
        info: { title: "Implementation", version: "1.0.0" },
        paths: {},
      };

      // Mock file system operations
      (fs.readFileSync as jest.Mock).mockReturnValue("mock yaml content");
      (yaml.load as jest.Mock).mockReturnValue(implDoc);

      (SwaggerParser.dereference as jest.Mock)
        .mockResolvedValueOnce(implDoc) // First call for impl spec
        .mockResolvedValueOnce(baseDoc); // Second call for TypeSpec-generated base spec

      // Act & Assert
      await expect(service.checkSpec("spec.yaml", {})).rejects.toThrow(/Routes missing/);
    });

    it("should use provided base spec even when TypeSpec is available", async () => {
      // Arrange
      const providedBasePath = "base.yaml";
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Base", version: "1.0.0" },
        paths: {},
      };

      const implDoc = { ...baseDoc, info: { title: "Impl", version: "1.0.0" } };

      // Mock file system operations
      (fs.readFileSync as jest.Mock).mockReturnValue("mock yaml content");
      (yaml.load as jest.Mock).mockReturnValue(implDoc);

      (SwaggerParser.dereference as jest.Mock)
        .mockResolvedValueOnce(implDoc)
        .mockResolvedValueOnce(baseDoc);

      // Act
      await service.checkSpec("spec.yaml", { base: providedBasePath });

      // Assert - Don't compile TypeSpec if base spec provided
      expect(SwaggerParser.dereference).toHaveBeenCalledWith(providedBasePath);
      expect(mockConsoleLog).toHaveBeenCalledWith("Spec is valid and compliant with base spec");
    });

    // ############################################################
    // Validation failures
    // ############################################################

    it("should throw error when validation fails", async () => {
      // Arrange - Create base spec with required route
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Base", version: "1.0.0" },
        paths: {
          "/required": {
            get: {
              tags: ["required"],
              responses: {
                "200": { description: "OK" },
              },
            },
          },
        },
      };

      // Arrange - Create impl spec missing the required route
      const implDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Implementation", version: "1.0.0" },
        paths: {},
      };

      // Mock file system operations
      (fs.readFileSync as jest.Mock).mockReturnValue("mock yaml content");
      (yaml.load as jest.Mock).mockReturnValue(implDoc);

      (SwaggerParser.dereference as jest.Mock)
        .mockResolvedValueOnce(implDoc) // First call for impl spec
        .mockResolvedValueOnce(baseDoc); // Second call for base spec

      // Act & Assert
      await expect(service.checkSpec("spec.yaml", { base: "base.yaml" })).rejects.toThrow(
        /Routes missing/
      );
    });

    // ############################################################
    // Multiple validation errors
    // ############################################################

    it("should collect all validation errors", async () => {
      // Arrange - Create base spec with required route and schema
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Base", version: "1.0.0" },
        paths: {
          "/common-grants/opportunities": {
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
            post: {
              tags: ["optional"],
              responses: {
                "200": { description: "OK" },
                "400": { description: "Bad Request" },
              },
            },
          },
        },
      };

      // Arrange - Create impl spec with multiple issues:
      //   - Missing /opportunities => should flag as missing route
      //   - /custom/extra => should flag as extra route
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
          "/common-grants/opportunities": {
            post: {
              responses: {
                "200": { description: "OK" },
              },
            },
          },
        },
      };

      // Mock file system operations
      (fs.readFileSync as jest.Mock).mockReturnValue("mock yaml content");
      (yaml.load as jest.Mock).mockReturnValue(implDoc);

      (SwaggerParser.dereference as jest.Mock)
        .mockResolvedValueOnce(implDoc)
        .mockResolvedValueOnce(baseDoc);

      // Act & Assert
      const error = await service.checkSpec("spec.yaml", { base: "base.yaml" }).catch(e => e);

      expect(error.message).toContain("Routes missing");
      expect(error.message).toContain("Extra routes");
      expect(error.message).toContain("Route conflicts");
      expect(error.message).toContain("Status code missing");
    });

    // ############################################################
    // Successful validation
    // ############################################################

    it("should pass when spec is valid and compliant", async () => {
      // Arrange - Create matching base and impl specs
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Base", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: {
                "200": { description: "OK" },
              },
            },
          },
        },
      };

      const implDoc = { ...baseDoc, info: { title: "Impl", version: "1.0.0" } };

      // Mock file system operations
      (fs.readFileSync as jest.Mock).mockReturnValue("mock yaml content");
      (yaml.load as jest.Mock).mockReturnValue(implDoc);

      (SwaggerParser.dereference as jest.Mock)
        .mockResolvedValueOnce(implDoc)
        .mockResolvedValueOnce(baseDoc);

      // Act
      await service.checkSpec("spec.yaml", { base: "base.yaml" });

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith("Spec is valid and compliant with base spec");
    });
  });
});
