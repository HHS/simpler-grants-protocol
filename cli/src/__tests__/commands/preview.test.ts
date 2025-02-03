import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Command } from "commander";
import { previewCommand } from "../../commands/preview";
import { DefaultPreviewService } from "../../services/preview.service";

jest.mock("../../services/preview.service");

describe("previewCommand", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    (DefaultPreviewService as jest.Mock).mockClear();
  });

  it("should register preview command", () => {
    previewCommand(program);
    const cmd = program.commands.find(cmd => cmd.name() === "preview");
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toBe("Preview an OpenAPI specification");
  });

  it("should handle preview with default UI", async () => {
    const mockPreviewSpec = jest.fn();
    (DefaultPreviewService as jest.Mock).mockImplementation(() => ({
      previewSpec: mockPreviewSpec,
    }));

    previewCommand(program);
    const cmd = program.commands.find(cmd => cmd.name() === "preview");
    await cmd?.parseAsync(["node", "test", "spec.yaml"]);

    expect(mockPreviewSpec).toHaveBeenCalledWith("spec.yaml", {
      ui: "swagger",
    });
  });

  it("should handle preview with custom UI", async () => {
    const mockPreviewSpec = jest.fn();
    (DefaultPreviewService as jest.Mock).mockImplementation(() => ({
      previewSpec: mockPreviewSpec,
    }));

    previewCommand(program);
    const cmd = program.commands.find(cmd => cmd.name() === "preview");
    await cmd?.parseAsync(["node", "test", "spec.yaml", "--ui", "redocly"]);

    expect(mockPreviewSpec).toHaveBeenCalledWith("spec.yaml", {
      ui: "redocly",
    });
  });
});
