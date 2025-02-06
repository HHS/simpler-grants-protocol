import { describe, it, expect, beforeEach, beforeAll, jest } from "@jest/globals";
import { Command } from "commander";
import { generateCommand } from "../../commands/generate";

// Create mock functions outside
const mockGenerateServer = jest.fn();
const mockGenerateClient = jest.fn();

// Mock the service with consistent implementation
jest.mock("../../services/code-generation.service", () => ({
  DefaultCodeGenerationService: jest.fn(() => ({
    generateServer: mockGenerateServer,
    generateClient: mockGenerateClient,
  })),
}));

describe("generateCommand", () => {
  let program: Command;
  let generateCmd: Command;

  beforeAll(() => {
    program = new Command();
    generateCommand(program);
    generateCmd = program.commands.find(cmd => cmd.name() === "generate")!;
  });

  beforeEach(() => {
    mockGenerateServer.mockClear();
    mockGenerateClient.mockClear();
  });

  describe("generate server", () => {
    it("should register generate server command", () => {
      const serverCmd = generateCmd.commands.find(cmd => cmd.name() === "server");
      expect(serverCmd).toBeDefined();
      expect(serverCmd?.description()).toBe(
        "Generate API server code from a TypeSpec specification"
      );
    });

    it("should handle server generation with options", async () => {
      await generateCmd.parseAsync([
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
      const clientCmd = generateCmd.commands.find(cmd => cmd.name() === "client");
      expect(clientCmd).toBeDefined();
      expect(clientCmd?.description()).toBe("Generate client code from a TypeSpec specification");
    });

    it("should handle client generation with options", async () => {
      await generateCmd.parseAsync([
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
