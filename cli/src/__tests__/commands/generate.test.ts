import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Command } from "commander";
import { generateCommand } from "../../commands/generate";
import { DefaultCodeGenerationService } from "../../services/code-generation.service";

jest.mock("../../services/code-generation.service");

describe("generateCommand", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    (DefaultCodeGenerationService as jest.Mock).mockClear();
  });

  describe("generate server", () => {
    it("should register generate server command", () => {
      generateCommand(program);
      const generateCmd = program.commands.find(cmd => cmd.name() === "generate");
      const serverCmd = generateCmd?.commands.find(cmd => cmd.name() === "server");
      expect(serverCmd).toBeDefined();
      expect(serverCmd?.description()).toBe(
        "Generate API server code from a TypeSpec specification"
      );
    });

    it("should handle server generation with options", async () => {
      const mockGenerateServer = jest.fn();
      (DefaultCodeGenerationService as jest.Mock).mockImplementation(() => ({
        generateServer: mockGenerateServer,
      }));

      generateCommand(program);
      const generateCmd = program.commands.find(cmd => cmd.name() === "generate");
      await generateCmd?.parseAsync([
        "node",
        "test",
        "server",
        "spec.yaml",
        "--lang",
        "typescript",
        "--only",
        "controllers,models",
      ]);

      expect(mockGenerateServer).toHaveBeenCalledWith("spec.yaml", {
        lang: "typescript",
        only: ["controllers", "models"],
      });
    });
  });

  describe("generate client", () => {
    it("should register generate client command", () => {
      generateCommand(program);
      const generateCmd = program.commands.find(cmd => cmd.name() === "generate");
      const clientCmd = generateCmd?.commands.find(cmd => cmd.name() === "client");
      expect(clientCmd).toBeDefined();
      expect(clientCmd?.description()).toBe("Generate client code from a TypeSpec specification");
    });

    it("should handle client generation with options", async () => {
      const mockGenerateClient = jest.fn();
      (DefaultCodeGenerationService as jest.Mock).mockImplementation(() => ({
        generateClient: mockGenerateClient,
      }));

      generateCommand(program);
      const generateCmd = program.commands.find(cmd => cmd.name() === "generate");
      await generateCmd?.parseAsync([
        "node",
        "test",
        "client",
        "spec.yaml",
        "--lang",
        "python",
        "--output",
        "./sdk",
        "--docs",
      ]);

      expect(mockGenerateClient).toHaveBeenCalledWith("spec.yaml", {
        lang: "python",
        output: "./sdk",
        docs: true,
      });
    });
  });
});
