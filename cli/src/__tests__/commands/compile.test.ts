import { describe, it, expect, beforeAll, beforeEach, jest } from "@jest/globals";
import { Command } from "commander";
import { compileCommand } from "../../commands/compile";

const mockCompile = jest.fn();

jest.mock("../../services/compile.service", () => ({
  DefaultCompileService: jest.fn(() => ({
    compile: mockCompile,
  })),
}));

describe("compileCommand", () => {
  let program: Command;
  let compileCmd: Command;

  // Mock process.exit
  const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit mock");
  });

  beforeAll(() => {
    program = new Command();
    compileCommand(program);
    compileCmd = program.commands.find(cmd => cmd.name() === "compile")!;
  });

  beforeEach(() => {
    mockCompile.mockClear();
    mockExit.mockClear();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it("should register compile command", () => {
    expect(compileCmd).toBeDefined();
    expect(compileCmd.description()).toBe("Compile a TypeSpec file to OpenAPI");
  });

  it("should accept tsp files", async () => {
    await compileCmd.parseAsync(["node", "test", "spec.tsp"]);
    expect(mockCompile).toHaveBeenCalledWith("spec.tsp");
  });

  it("should reject non-tsp files", async () => {
    await expect(compileCmd.parseAsync(["node", "test", "spec.txt"])).rejects.toThrow(
      "process.exit mock"
    );
  });
});
