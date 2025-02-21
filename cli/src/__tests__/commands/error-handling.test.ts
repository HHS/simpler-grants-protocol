import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Command } from "commander";
import { initCommand } from "../../commands/init";
import { previewCommand } from "../../commands/preview";
import { addFieldCommand } from "../../commands/add-field";
import { checkCommand } from "../../commands/check";
import { generateCommand } from "../../commands/generate";

// Mock console.error and process.exit
const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});
const mockProcessExit = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);

describe("Command Error Handling", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();
  });

  describe("init command", () => {
    beforeEach(() => {
      initCommand(program);
    });

    it("should handle validation errors", async () => {
      const initCmd = program.commands.find(cmd => cmd.name() === "init")!;
      await initCmd.parseAsync(["node", "test", "--template", ""]);

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe("preview command", () => {
    beforeEach(() => {
      previewCommand(program);
    });

    it("should handle invalid UI option", async () => {
      const previewCmd = program.commands.find(cmd => cmd.name() === "preview")!;
      await previewCmd.parseAsync(["node", "test", "spec.tsp"]);

      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe("add field command", () => {
    beforeEach(() => {
      addFieldCommand(program);
    });

    it("should handle invalid field type", async () => {
      const addCmd = program.commands.find(cmd => cmd.name() === "add")!;
      await addCmd.parseAsync(["node", "test", "field", "testField", "invalid-type"]);

      expect(mockConsoleError).toHaveBeenCalledWith("Error adding field:", expect.any(Error));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe("check command", () => {
    beforeEach(() => {
      checkCommand(program);
    });

    it("should handle invalid API URL", async () => {
      const checkCmd = program.commands.find(cmd => cmd.name() === "check")!;
      await checkCmd.parseAsync(["node", "test", "api", "not-a-url", "spec.tsp"]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Validation error:",
        expect.stringContaining("Invalid url")
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe("generate command", () => {
    beforeEach(() => {
      generateCommand(program);
    });

    it("should handle invalid file extension", async () => {
      const generateCmd = program.commands.find(cmd => cmd.name() === "generate")!;
      await generateCmd.parseAsync(["node", "test", "client", "spec.invalid"]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Validation error:",
        expect.stringContaining("invalid_string")
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it("should handle invalid server components", async () => {
      const generateCmd = program.commands.find(cmd => cmd.name() === "generate")!;
      await generateCmd.parseAsync([
        "node",
        "test",
        "server",
        "spec.tsp",
        "--only",
        "invalid-component",
      ]);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Validation error:",
        expect.stringContaining("Only valid components are")
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });
});
