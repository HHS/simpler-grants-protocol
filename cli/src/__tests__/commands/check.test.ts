import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Command } from "commander";
import { checkCommand } from "../../commands/check";
import { DefaultValidationService } from "../../services/validation.service";

jest.mock("../../services/validation.service");

describe("checkCommand", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    (DefaultValidationService as jest.Mock).mockClear();
  });

  describe("check api", () => {
    it("should register check api command", () => {
      checkCommand(program);
      const checkCmd = program.commands.find(cmd => cmd.name() === "check");
      const apiCmd = checkCmd?.commands.find(cmd => cmd.name() === "api");
      expect(apiCmd).toBeDefined();
      expect(apiCmd?.description()).toBe(
        "Validate an API implementation against its specification"
      );
    });

    it("should handle API validation with options", async () => {
      const mockCheckApi = jest.fn();
      (DefaultValidationService as jest.Mock).mockImplementation(() => ({
        checkApi: mockCheckApi,
      }));

      checkCommand(program);
      const checkCmd = program.commands.find(cmd => cmd.name() === "check");
      await checkCmd?.parseAsync([
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
      checkCommand(program);
      const checkCmd = program.commands.find(cmd => cmd.name() === "check");
      const specCmd = checkCmd?.commands.find(cmd => cmd.name() === "spec");
      expect(specCmd).toBeDefined();
      expect(specCmd?.description()).toBe(
        "Validate a specification against the CommonGrants base spec"
      );
    });

    it("should handle spec validation with version", async () => {
      const mockCheckSpec = jest.fn();
      (DefaultValidationService as jest.Mock).mockImplementation(() => ({
        checkSpec: mockCheckSpec,
      }));

      checkCommand(program);
      const checkCmd = program.commands.find(cmd => cmd.name() === "check");
      await checkCmd?.parseAsync(["node", "test", "spec", "spec.yaml", "--spec-version", "v2.0.1"]);

      expect(mockCheckSpec).toHaveBeenCalledWith("spec.yaml", {
        specVersion: "v2.0.1",
        base: undefined,
      });
    });
  });
});
