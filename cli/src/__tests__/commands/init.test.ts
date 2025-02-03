import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Command } from "commander";
import { initCommand } from "../../commands/init";
import { DefaultInitService } from "../../services/init.service";

jest.mock("../../services/init.service");

describe("initCommand", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    (DefaultInitService as jest.Mock).mockClear();
  });

  it("should register init command", () => {
    initCommand(program);
    const cmd = program.commands.find((cmd) => cmd.name() === "init");
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toBe("Initialize a new CommonGrants project");
    expect(cmd?.opts().template).toBeUndefined();
    expect(cmd?.opts().dir).toBeUndefined();
    expect(cmd?.opts().list).toBeUndefined();
  });

  it("should handle list option", async () => {
    const mockListTemplates = jest
      .fn<() => Promise<string[]>>()
      .mockResolvedValue(["template1", "template2"]);
    (DefaultInitService as jest.Mock).mockImplementation(() => ({
      listTemplates: mockListTemplates,
    }));

    initCommand(program);
    const cmd = program.commands.find((cmd) => cmd.name() === "init");
    await cmd?.parseAsync(["node", "test", "--list"]);

    expect(mockListTemplates).toHaveBeenCalled();
  });
});
