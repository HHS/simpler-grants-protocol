import { describe, it, expect, beforeEach, beforeAll, jest } from "@jest/globals";
import { Command } from "commander";
import { addFieldCommand } from "../../commands/add-field";

// Create mock function outside
const mockAddField = jest.fn();

// Mock the service with consistent implementation
jest.mock("../../services/field.service", () => ({
  DefaultFieldService: jest.fn(() => ({
    addField: mockAddField,
  })),
}));

describe("addFieldCommand", () => {
  let program: Command;
  let addCmd: Command;

  beforeAll(() => {
    program = new Command();
    addFieldCommand(program);
    addCmd = program.commands.find(cmd => cmd.name() === "add")!;
  });

  beforeEach(() => {
    mockAddField.mockClear();
  });

  it("should register add field command", () => {
    const fieldCmd = addCmd.commands.find(cmd => cmd.name() === "field");
    expect(fieldCmd).toBeDefined();
    expect(fieldCmd?.description()).toBe("Add a custom field to the schema");
  });

  it("should handle field addition with basic options", async () => {
    await addCmd.parseAsync(["node", "test", "field", "testField", "string"]);

    expect(mockAddField).toHaveBeenCalledWith("testField", "string", {});
  });

  it("should handle field addition with all options", async () => {
    await addCmd.parseAsync([
      "node",
      "test",
      "field",
      "testField",
      "string",
      "--example",
      "test",
      "--description",
      "A test field",
    ]);

    expect(mockAddField).toHaveBeenCalledWith("testField", "string", {
      example: "test",
      description: "A test field",
    });
  });
});
