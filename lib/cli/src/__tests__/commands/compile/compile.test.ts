import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { Command } from "commander";
import { compileCommand } from "../../../commands/compile/compile";

const mockCompile = vi.fn();

vi.mock("../../../commands/compile/compile-service", () => ({
  DefaultCompileService: vi.fn(() => ({
    compile: mockCompile,
  })),
}));

describe("compileCommand", () => {
  let program: Command;
  let compileCmd: Command;

  // Mock process.exit and console.error
  const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit mock");
  });
  const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

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
