import { describe, it, expect, beforeAll, beforeEach, afterAll, jest } from "@jest/globals";
import { Command } from "commander";
import { compileCommand } from "../../../commands/compile/compile";

const mockCompile = jest.fn();

jest.mock("../../../commands/compile/compile-service", () => ({
  DefaultCompileService: jest.fn(() => ({
    compile: mockCompile,
  })),
}));

describe("compileCommand", () => {
  let program: Command;
  let compileCmd: Command;

  // Mock process.exit and console.error
  const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit mock");
  });
  const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  beforeAll(() => {
    program = new Command();
    compileCommand(program);
    compileCmd = program.commands.find(cmd => cmd.name() === "compile")!;
  });

  beforeEach(() => {
    mockCompile.mockClear();
    mockExit.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
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
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("File must be a .tsp file")
    );
  });
});
