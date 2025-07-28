import { describe, it, expect, beforeEach, afterAll, jest } from "@jest/globals";
import { Command } from "commander";
import { checkCommand } from "../../../commands/check/check";

// Create mock functions outside
const mockCheckApi = jest.fn();
const mockCheckSpec = jest.fn();

// Mock the service with consistent implementation
jest.mock("../../../commands/check/check-service.ts", () => ({
  DefaultCheckService: jest.fn(() => ({
    checkApi: mockCheckApi,
    checkSpec: mockCheckSpec,
  })),
}));

describe("checkCommand", () => {
  let program: Command;
  let checkCmd: Command;

  // Mock process.exit and console.error
  const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit mock");
  });
  const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    // Create fresh Command instances for each test
    program = new Command();
    checkCommand(program);
    checkCmd = program.commands.find(cmd => cmd.name() === "check")!;

    // Clear mocks
    mockCheckApi.mockClear();
    mockCheckSpec.mockClear();
    mockExit.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  // #########################################################
  // # Check API
  // #########################################################

  describe("check api", () => {
    it("should register check api command", () => {
      const apiCmd = checkCmd.commands.find(cmd => cmd.name() === "api");
      expect(apiCmd).toBeDefined();
      expect(apiCmd?.description()).toBe(
        "Validate an API implementation against its specification"
      );
    });

    it("should handle API validation with options", async () => {
      await checkCmd.parseAsync([
        "node",
        "test",
        "api",
        "http://api.example.com",
        "spec.yaml",
        "--client",
        "httpx",
        "--report",
        "json",
      ]);

      expect(mockCheckApi).toHaveBeenCalledWith("http://api.example.com", "spec.yaml", {
        client: "httpx",
        report: "json",
      });
    });

    it("should validate API implementation", async () => {
      await checkCmd.parseAsync(["node", "test", "api", "http://example.com", "spec.yaml"]);

      expect(mockCheckApi).toHaveBeenCalledWith(
        "http://example.com",
        "spec.yaml",
        expect.any(Object)
      );
    });
  });

  // #########################################################
  // # Check Spec
  // #########################################################

  describe("check spec", () => {
    it("should register check spec command", () => {
      const specCmd = checkCmd.commands.find(cmd => cmd.name() === "spec");
      expect(specCmd).toBeDefined();
      expect(specCmd?.description()).toBe(
        "Validate a specification against the CommonGrants base spec"
      );
    });

    it("should handle spec validation with base spec path", async () => {
      await checkCmd.parseAsync(["node", "test", "spec", "spec.yaml", "--base", "base.yaml"]);

      expect(mockCheckSpec).toHaveBeenCalledWith("spec.yaml", {
        base: "base.yaml",
      });
    });

    it("should handle spec validation without base spec path", async () => {
      await checkCmd.parseAsync(["node", "test", "spec", "foo.yaml"]);

      expect(mockCheckSpec).toHaveBeenCalledWith("foo.yaml", {});
    });

    it("should handle spec validation with baseVersion", async () => {
      await checkCmd.parseAsync(["node", "test", "spec", "spec.yaml", "--base-version", "0.1.0"]);

      expect(mockCheckSpec).toHaveBeenCalledWith("spec.yaml", {
        baseVersion: "0.1.0",
      });
    });

    it("should handle spec validation with both base and baseVersion", async () => {
      // Mock console.warn to capture the warning message
      const mockWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

      await checkCmd.parseAsync([
        "node",
        "test",
        "spec",
        "spec.yaml",
        "--base",
        "base.yaml",
        "--base-version",
        "0.2.0",
      ]);

      expect(mockWarn).toHaveBeenCalledWith(
        "Warning: Both --base and --base-version are specified. Using --base and ignoring --base-version."
      );
      expect(mockCheckSpec).toHaveBeenCalledWith("spec.yaml", {
        base: "base.yaml",
      });

      mockWarn.mockRestore();
    });
  });
});
