import { describe, it, expect, beforeEach, vi } from "vitest";
import { Mock } from "vitest";
import { Command } from "commander";
import { initCommand } from "../../../commands/init/init";
import { DefaultInitService } from "../../../commands/init/init-service";

vi.mock("../../../commands/init/init-service");

describe("initCommand", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    (DefaultInitService as Mock).mockClear();
  });

  it("should register init command", () => {
    initCommand(program);
    const cmd = program.commands.find(cmd => cmd.name() === "init");
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toBe("Initialize a new CommonGrants project");
    expect(cmd?.opts().template).toBeUndefined();
    expect(cmd?.opts().list).toBeUndefined();
  });

  it("should handle list option", async () => {
    const mockListTemplates = vi
      .fn<() => Promise<string[]>>()
      .mockResolvedValue(["template1", "template2"]);
    (DefaultInitService as Mock).mockImplementation(() => ({
      listTemplates: mockListTemplates,
    }));

    initCommand(program);
    const cmd = program.commands.find(cmd => cmd.name() === "init");
    await cmd?.parseAsync(["node", "test", "--list"]);

    expect(mockListTemplates).toHaveBeenCalled();
  });
});
