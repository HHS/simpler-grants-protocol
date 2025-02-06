import { describe, it, expect, beforeEach, beforeAll, jest } from "@jest/globals";
import { Command } from "commander";
import { checkCommand } from "../../commands/check";

// Create mock functions outside
const mockCheckApi = jest.fn();
const mockCheckSpec = jest.fn();

// Mock the service with consistent implementation
jest.mock("../../services/validation.service", () => ({
  DefaultValidationService: jest.fn(() => ({
    checkApi: mockCheckApi,
    checkSpec: mockCheckSpec,
  })),
}));

describe("checkCommand", () => {
  let program: Command;
  let checkCmd: Command;

  beforeAll(() => {
    program = new Command();
    checkCommand(program);
    checkCmd = program.commands.find(cmd => cmd.name() === "check")!;
  });

  beforeEach(() => {
    mockCheckApi.mockClear();
    mockCheckSpec.mockClear();
  });

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
  });

  describe("check spec", () => {
    it("should register check spec command", () => {
      const specCmd = checkCmd.commands.find(cmd => cmd.name() === "spec");
      expect(specCmd).toBeDefined();
      expect(specCmd?.description()).toBe(
        "Validate a specification against the CommonGrants base spec"
      );
    });

    it("should handle spec validation with version", async () => {
      await checkCmd.parseAsync(["node", "test", "spec", "spec.yaml", "--spec-version", "v2.0.1"]);

      expect(mockCheckSpec).toHaveBeenCalledWith("spec.yaml", {
        specVersion: "v2.0.1",
        base: undefined,
      });
    });
  });
});
