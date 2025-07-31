import { OpenAPIV3 } from "openapi-types";
import { DefaultCheckService } from "../../../commands/check/check-service";
import * as fs from "fs";
import * as yaml from "js-yaml";

// Mock dependencies
jest.mock("fs", () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

jest.mock("js-yaml", () => ({
  load: jest.fn(),
}));

describe("DefaultCheckService", () => {
  let service: DefaultCheckService;
  const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    service = new DefaultCheckService();
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  // ############################################################
  // Test 1: API validation
  // ############################################################

  describe("checkApi", () => {
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
  });

  // ######################################################################
  // Check Spec
  // ######################################################################

  describe("checkSpec", () => {
    // ############################################################
    // Default base spec
    // ############################################################

    it("should use default base spec when no base spec provided", async () => {
      // Arrange
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Default Base", version: "1.0.0" },
        paths: {
          "/common-grants/opportunities": {
            get: {
              tags: ["required"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      const implDoc = { ...baseDoc, info: { title: "Impl", version: "1.0.0" } };

      // Mock file system operations
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path === "spec.yaml") {
          return "impl yaml content";
        } else {
          return "base yaml content";
        }
      });
      (yaml.load as jest.Mock).mockImplementation((content: string) => {
        if (content === "impl yaml content") {
          return implDoc;
        } else {
          return baseDoc;
        }
      });

      // Act
      await service.checkSpec("spec.yaml", {});

      // Assert that the default base spec path was used
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    // ############################################################
    // Missing base spec file
    // ############################################################

    it("should throw error when default base spec file not found", async () => {
      // Arrange

      // Mock file system operations
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act & Assert
      await expect(service.checkSpec("spec.yaml", {})).rejects.toThrow(
        /Could not find base spec file at/
      );
    });

    // ############################################################
    // Base spec explicitly provided
    // ############################################################

    it("should handle provided base spec path correctly", async () => {
      // Arrange
      const providedBasePath = "custom-base.yaml";
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Custom Base", version: "1.0.0" },
        paths: {},
      };

      const implDoc = { ...baseDoc, info: { title: "Impl", version: "1.0.0" } };

      // Mock file system operations
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path === "spec.yaml") {
          return "impl yaml content";
        } else if (path === providedBasePath) {
          return "base yaml content";
        }
        return "default content";
      });
      (yaml.load as jest.Mock).mockImplementation((content: string) => {
        if (content === "impl yaml content") {
          return implDoc;
        } else {
          return baseDoc;
        }
      });

      // Act
      await service.checkSpec("spec.yaml", { base: providedBasePath });

      // Assert
      expect(fs.readFileSync).toHaveBeenCalledWith(providedBasePath, "utf8");
      expect(mockConsoleLog).toHaveBeenCalledWith("Spec is valid and compliant with base spec");
    });

    // ############################################################
    // Non-compliant spec
    // ############################################################

    it("should collect all validation errors from validateSpecs()", async () => {
      // Arrange - Create base spec with multiple validation scenarios
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Base", version: "1.0.0" },
        paths: {
          "/common-grants/opportunities": {
            get: {
              tags: ["required"],
              responses: { "200": { description: "OK" } },
            },
            post: {
              tags: ["required"],
              responses: { "201": { description: "Created" } },
            },
          },
        },
      };

      // Arrange - Create impl spec with multiple validation issues:
      //   - Missing POST /common-grants/opportunities (required)
      //   - Extra route GET /common-grants/extra
      const implDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Impl", version: "1.0.0" },
        paths: {
          "/common-grants/opportunities": {
            get: { responses: { "200": { description: "OK" } } },
          },
          "/common-grants/extra": {
            get: { responses: { "200": { description: "OK" } } },
          },
        },
      };

      // Mock file system operations
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path === "spec.yaml") {
          return "impl yaml content";
        } else {
          return "base yaml content";
        }
      });
      (yaml.load as jest.Mock).mockImplementation((content: string) => {
        if (content === "impl yaml content") {
          return implDoc;
        } else {
          return baseDoc;
        }
      });

      // Act & Assert
      const error = await service.checkSpec("spec.yaml", { base: "base.yaml" }).catch(e => e);

      // Verify all error types are collected
      expect(error.message).toContain("Spec validation failed:");
      expect(error.message).toContain("2 errors"); // 1 missing routes + 1 extra route
      expect(error.message).toContain("Routes missing");
      expect(error.message).toContain("Extra routes");

      // Verify specific missing routes are reported
      expect(error.message).toContain("POST /common-grants/opportunities");

      // Verify extra routes are reported
      expect(error.message).toContain("GET /common-grants/extra");
    });

    // ############################################################
    // Compliant spec
    // ############################################################

    it("should pass validation when specs are compliant", async () => {
      // Arrange - Create matching base and impl specs
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Base", version: "1.0.0" },
        paths: {
          "/common-grants/opportunities": {
            get: {
              tags: ["required"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      const implDoc = { ...baseDoc, info: { title: "Impl", version: "1.0.0" } };

      // Arrange - Mock file system operations
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path === "spec.yaml") {
          return "impl yaml content";
        } else {
          return "base yaml content";
        }
      });
      (yaml.load as jest.Mock).mockImplementation((content: string) => {
        if (content === "impl yaml content") {
          return implDoc;
        } else {
          return baseDoc;
        }
      });

      // Act
      await service.checkSpec("spec.yaml", { base: "base.yaml" });

      // Assert
      expect(mockConsoleLog).toHaveBeenCalledWith("Spec is valid and compliant with base spec");
    });
  });
});
