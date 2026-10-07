import { vi } from "vitest";
import { Mock } from "vitest";
import { OpenAPIV3 } from "openapi-types";
import { DefaultCheckService } from "../../../commands/check/check-service";
import * as fs from "fs";
import * as yaml from "js-yaml";

// Mock dependencies
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock("js-yaml", () => ({
  load: vi.fn(),
}));

// Mock the availableVersions import
vi.mock("../../../commands/check/check-args", () => ({
  availableVersions: ["1.0.0", "2.0.0"],
}));

describe("DefaultCheckService", () => {
  let service: DefaultCheckService;
  const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    service = new DefaultCheckService();
    vi.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
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

      // Mock file system operations to simulate the new pattern
      (fs.existsSync as Mock).mockImplementation((filePath: string) => {
        // Mock the OpenAPI directory structure
        if (filePath.includes("lib/openapi")) {
          return true; // Directory exists
        }
        if (filePath.includes("openapi.1.0.0.yaml")) {
          return true; // Base spec file exists
        }
        if (filePath === "spec.yaml") {
          return true; // Implementation spec exists
        }
        return false;
      });

      (fs.readdirSync as Mock).mockReturnValue(["openapi.1.0.0.yaml", "openapi.2.0.0.yaml"]);

      (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
        if (filePath === "spec.yaml") {
          return "impl yaml content";
        } else if (filePath.includes("openapi.1.0.0.yaml")) {
          return "base yaml content";
        } else {
          return "default content";
        }
      });

      (yaml.load as Mock).mockImplementation((content: string) => {
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
    // Missing OpenAPI directory
    // ############################################################

    it("should throw error when OpenAPI directory not found", async () => {
      // Arrange
      // Mock file system operations - directory doesn't exist
      (fs.existsSync as Mock).mockReturnValue(false);

      // Act & Assert
      await expect(service.checkSpec("spec.yaml", {})).rejects.toThrow(
        /OpenAPI directory not found at/
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
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
        if (filePath === "spec.yaml") {
          return "impl yaml content";
        } else if (filePath === providedBasePath) {
          return "base yaml content";
        }
        return "default content";
      });
      (yaml.load as Mock).mockImplementation((content: string) => {
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
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
        if (filePath === "spec.yaml") {
          return "impl yaml content";
        } else if (filePath.includes("openapi.1.0.0.yaml")) {
          return "base yaml content";
        } else {
          return "default content";
        }
      });
      (yaml.load as Mock).mockImplementation((content: string) => {
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
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
        if (filePath === "spec.yaml") {
          return "impl yaml content";
        } else if (filePath.includes("openapi.1.0.0.yaml")) {
          return "base yaml content";
        } else {
          return "default content";
        }
      });
      (yaml.load as Mock).mockImplementation((content: string) => {
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

    // ############################################################
    // Warnings-only findings (ADR 0019: optional routes MAY be omitted)
    // ############################################################

    it("should resolve (not reject) when every finding is WARNING-level", async () => {
      // Arrange - Base has a required route (implemented) and an optional
      // route (omitted). Omitting an optional route should only warn.
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
          "/common-grants/reviews": {
            get: {
              tags: ["optional"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      const implDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Impl", version: "1.0.0" },
        paths: {
          "/common-grants/opportunities": {
            get: { responses: { "200": { description: "OK" } } },
          },
        },
      };

      // Arrange - Mock file system operations
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
        if (filePath === "spec.yaml") {
          return "impl yaml content";
        } else if (filePath.includes("openapi.1.0.0.yaml")) {
          return "base yaml content";
        } else {
          return "default content";
        }
      });
      (yaml.load as Mock).mockImplementation((content: string) => {
        if (content === "impl yaml content") {
          return implDoc;
        } else {
          return baseDoc;
        }
      });

      // Act & Assert - checkSpec should resolve, not throw, when every
      // finding is a WARNING (i.e. only an optional route is missing)
      await expect(service.checkSpec("spec.yaml", { base: "base.yaml" })).resolves.toBeUndefined();

      // Assert - the missing optional route's information was printed
      const loggedOutput = [...mockConsoleLog.mock.calls, ...mockConsoleWarn.mock.calls]
        .map(call => call.join(" "))
        .join("\n");
      expect(loggedOutput).toContain("GET /common-grants/reviews");

      // Assert - a success line states the warning count. This asserts on
      // console.log alone: the warning block goes to console.warn and its own
      // summary line would satisfy a union-of-both assertion, leaving the
      // success line untested.
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("1 warning"));
    });

    // ############################################################
    // Missing required route (must still block, exactly as today)
    // ############################################################

    it("should still reject when a required route is missing", async () => {
      // Arrange - Base has a required route that the impl does not serve
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

      const implDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Impl", version: "1.0.0" },
        paths: {},
      };

      // Arrange - Mock file system operations
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
        if (filePath === "spec.yaml") {
          return "impl yaml content";
        } else if (filePath.includes("openapi.1.0.0.yaml")) {
          return "base yaml content";
        } else {
          return "default content";
        }
      });
      (yaml.load as Mock).mockImplementation((content: string) => {
        if (content === "impl yaml content") {
          return implDoc;
        } else {
          return baseDoc;
        }
      });

      // Act & Assert
      const error = await service.checkSpec("spec.yaml", { base: "base.yaml" }).catch(e => e);

      expect(error.message).toContain("Spec validation failed:");
      expect(error.message).toContain("GET /common-grants/opportunities");
    });

    // ############################################################
    // Mixed findings (one required, one optional missing)
    // ############################################################

    it("should reject on mixed findings and distinguish the warning from the error", async () => {
      // Arrange - Base has a missing required route AND a missing optional
      // route. The run must still fail, but the formatted message should
      // make the optional (WARNING) finding distinguishable from the
      // required (ERROR) finding.
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Base", version: "1.0.0" },
        paths: {
          "/common-grants/opportunities": {
            post: {
              tags: ["required"],
              responses: { "201": { description: "Created" } },
            },
          },
          "/common-grants/reviews": {
            get: {
              tags: ["optional"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      const implDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Impl", version: "1.0.0" },
        paths: {},
      };

      // Arrange - Mock file system operations
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
        if (filePath === "spec.yaml") {
          return "impl yaml content";
        } else if (filePath.includes("openapi.1.0.0.yaml")) {
          return "base yaml content";
        } else {
          return "default content";
        }
      });
      (yaml.load as Mock).mockImplementation((content: string) => {
        if (content === "impl yaml content") {
          return implDoc;
        } else {
          return baseDoc;
        }
      });

      // Act & Assert
      const error = await service.checkSpec("spec.yaml", { base: "base.yaml" }).catch(e => e);

      expect(error.message).toContain("Spec validation failed:");
      expect(error.message).toContain("POST /common-grants/opportunities");
      expect(error.message).toContain("GET /common-grants/reviews");
      // The optional finding must be marked as a WARNING somewhere in the output
      // Scoped to the optional route's own line: the summary line already
      // contains the word "warning", so an unscoped match would pass without
      // the per-finding marker this criterion is about.
      const reviewsLine = error.message
        .split("\n")
        .find((line: string) => line.includes("/common-grants/reviews"));
      expect(reviewsLine).toContain("(warning)");
    });

    // ############################################################
    // Unleveled findings (regression guard)
    // ############################################################

    it("should still reject on findings with no explicit level, like ROUTE_CONFLICT", async () => {
      // Findings from check-matching-routes.ts (e.g. ROUTE_CONFLICT /
      // MISSING_STATUS_CODE) carry no `level` property at all. A naive
      // fix that resolves whenever `filterByLevel("ERROR")` is empty
      // would wrongly let this pass, since these findings are neither
      // ERROR nor WARNING. This guards against that regression.
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Base", version: "1.0.0" },
        paths: {
          "/common-grants/opportunities": {
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
          "/common-grants/opportunities": {
            get: {
              responses: {
                "200": { description: "OK" },
              },
            },
          },
        },
      };

      // Arrange - Mock file system operations
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
        if (filePath === "spec.yaml") {
          return "impl yaml content";
        } else if (filePath.includes("openapi.1.0.0.yaml")) {
          return "base yaml content";
        } else {
          return "default content";
        }
      });
      (yaml.load as Mock).mockImplementation((content: string) => {
        if (content === "impl yaml content") {
          return implDoc;
        } else {
          return baseDoc;
        }
      });

      // Act & Assert
      const error = await service.checkSpec("spec.yaml", { base: "base.yaml" }).catch(e => e);

      expect(error.message).toContain("Spec validation failed:");
      expect(error.message).toContain("Status code missing");
    });

    it("should still reject when a warning is mixed with an unleveled finding", async () => {
      // The blocking rule is "every finding that is not a WARNING blocks",
      // not "no WARNINGs present". This pins the distinction: a run that
      // mixes a missing optional route (WARNING) with a missing status code
      // (no level) must still reject, so the warning cannot mask the error.
      const baseDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Base", version: "1.0.0" },
        paths: {
          "/common-grants/opportunities": {
            get: {
              responses: {
                "200": { description: "OK" },
                "404": { description: "Not Found" },
              },
            },
          },
          "/common-grants/reviews": {
            get: {
              tags: ["optional"],
              responses: { "200": { description: "OK" } },
            },
          },
        },
      };

      const implDoc: OpenAPIV3.Document = {
        openapi: "3.0.0",
        info: { title: "Impl", version: "1.0.0" },
        paths: {
          "/common-grants/opportunities": {
            get: {
              responses: {
                "200": { description: "OK" },
              },
            },
          },
        },
      };

      // Arrange - Mock file system operations
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
        if (filePath === "spec.yaml") {
          return "impl yaml content";
        } else if (filePath.includes("openapi.1.0.0.yaml")) {
          return "base yaml content";
        } else {
          return "default content";
        }
      });
      (yaml.load as Mock).mockImplementation((content: string) => {
        if (content === "impl yaml content") {
          return implDoc;
        } else {
          return baseDoc;
        }
      });

      // Act & Assert
      const error = await service.checkSpec("spec.yaml", { base: "base.yaml" }).catch(e => e);

      expect(error.message).toContain("Spec validation failed:");
      expect(error.message).toContain("Status code missing");
      // The warning is still reported, and still marked, alongside the blocker
      const reviewsLine = error.message
        .split("\n")
        .find((line: string) => line.includes("/common-grants/reviews"));
      expect(reviewsLine).toContain("(warning)");
    });
  });
});
