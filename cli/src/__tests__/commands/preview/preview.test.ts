import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import { Command } from "commander";
import { previewCommand } from "../../../commands/preview/preview";

// Create mock function outside
const mockPreviewSpec = jest.fn();

// Mock the service with consistent implementation
jest.mock("../../../commands/preview/preview-service", () => ({
  DefaultPreviewService: jest.fn(() => ({
    previewSpec: mockPreviewSpec,
  })),
}));

describe("previewCommand", () => {
  let program: Command;
  let previewCmd: Command;

  // Mock process.exit before any tests run
  const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit mock");
  });

  beforeAll(() => {
    program = new Command();
    previewCommand(program);
    previewCmd = program.commands.find(cmd => cmd.name() === "preview")!;
  });

  beforeEach(() => {
    mockPreviewSpec.mockClear();
    mockExit.mockClear();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it("should register preview command", () => {
    expect(previewCmd).toBeDefined();
    expect(previewCmd.description()).toBe("Preview an OpenAPI specification");
  });

  it("should accept yaml files", async () => {
    await previewCmd.parseAsync(["node", "test", "spec.yaml"]);
    expect(mockPreviewSpec).toHaveBeenCalledWith("spec.yaml");
  });

  it("should accept json files", async () => {
    await previewCmd.parseAsync(["node", "test", "spec.json"]);
    expect(mockPreviewSpec).toHaveBeenCalledWith("spec.json");
  });

  it("should reject non-yaml/json files", async () => {
    await expect(previewCmd.parseAsync(["node", "test", "spec.txt"])).rejects.toThrow(
      "process.exit mock"
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
