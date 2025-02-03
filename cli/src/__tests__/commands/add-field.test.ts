import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Command } from "commander";
import { addFieldCommand } from "../../commands/add-field";
import { DefaultFieldService } from "../../services/field.service";

jest.mock("../../services/field.service");

describe("addFieldCommand", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    (DefaultFieldService as jest.Mock).mockClear();
  });

  it("should register add field command", () => {
    addFieldCommand(program);
    const addCmd = program.commands.find(cmd => cmd.name() === "add");
    expect(addCmd).toBeDefined();
    const fieldCmd = addCmd?.commands.find(cmd => cmd.name() === "field");
    expect(fieldCmd).toBeDefined();
    expect(fieldCmd?.description()).toBe("Add a custom field to the schema");
  });

  it("should handle field addition with basic options", async () => {
    const mockAddField = jest.fn();
    (DefaultFieldService as jest.Mock).mockImplementation(() => ({
      addField: mockAddField,
    }));

    addFieldCommand(program);
    const addCmd = program.commands.find(cmd => cmd.name() === "add");
    await addCmd?.parseAsync(["node", "test", "field", "testField", "string"]);

    expect(mockAddField).toHaveBeenCalledWith("testField", "string", {});
  });

  it("should handle field addition with all options", async () => {
    const mockAddField = jest.fn();
    (DefaultFieldService as jest.Mock).mockImplementation(() => ({
      addField: mockAddField,
    }));

    addFieldCommand(program);
    const addCmd = program.commands.find(cmd => cmd.name() === "add");
    await addCmd?.parseAsync([
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
