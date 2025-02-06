import { describe, it, expect, beforeEach, beforeAll, jest } from "@jest/globals";
import { Command } from "commander";
import { previewCommand } from "../../commands/preview";

// Create mock function outside
const mockPreviewSpec = jest.fn();

// Mock the service with consistent implementation
jest.mock("../../services/preview.service", () => ({
  DefaultPreviewService: jest.fn(() => ({
    previewSpec: mockPreviewSpec,
  })),
}));

describe("previewCommand", () => {
  let program: Command;
  let previewCmd: Command;

  beforeAll(() => {
    program = new Command();
    previewCommand(program);
    previewCmd = program.commands.find(cmd => cmd.name() === "preview")!;
  });

  beforeEach(() => {
    mockPreviewSpec.mockClear();
  });

  it("should register preview command", () => {
    expect(previewCmd).toBeDefined();
    expect(previewCmd.description()).toBe("Preview an OpenAPI specification");
  });

  it("should handle preview with default UI", async () => {
    await previewCmd.parseAsync(["node", "test", "spec.yaml"]);

    expect(mockPreviewSpec).toHaveBeenCalledWith("spec.yaml", {
      ui: "swagger",
    });
  });

  it("should handle preview with custom UI", async () => {
    await previewCmd.parseAsync(["node", "test", "spec.yaml", "--ui", "redocly"]);

    expect(mockPreviewSpec).toHaveBeenCalledWith("spec.yaml", {
      ui: "redocly",
    });
  });
});
