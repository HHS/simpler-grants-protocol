import { beforeEach, describe, it, expect, vi } from "vitest";
import { Mock } from "vitest";
import { DefaultCompileService } from "../../../commands/compile/compile-service";
import { spawn } from "child_process";
import { EventEmitter } from "events";
import { ChildProcess } from "child_process";
import { resolveTspBinPath } from "../../../utils/typespec";

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("../../../utils/typespec", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../utils/typespec")>();
  return {
    ...actual,
    resolveTspBinPath: vi.fn(actual.resolveTspBinPath),
  };
});

describe("DefaultCompileService", () => {
  const service = new DefaultCompileService();
  let mockSpawn: Mock;
  let mockChildProcess: Partial<ChildProcess> & EventEmitter;
  const mockConsole = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpawn = spawn as Mock;
    mockChildProcess = new EventEmitter() as Partial<ChildProcess> & EventEmitter;
    mockSpawn.mockReturnValue(mockChildProcess);
  });

  afterAll(() => {
    mockConsole.mockRestore();
  });

  it("should spawn tsp compile with correct arguments", async () => {
    const compilePromise = service.compile("spec.tsp");
    mockChildProcess.emit("exit", 0);
    await compilePromise;

    expect(mockSpawn).toHaveBeenCalledWith(
      process.execPath,
      [resolveTspBinPath(), "compile", "spec.tsp"],
      {
        stdio: "inherit",
      }
    );
  });

  it("should reject when process exits with non-zero code", async () => {
    const compilePromise = service.compile("spec.tsp");
    mockChildProcess.emit("exit", 1);

    await expect(compilePromise).rejects.toThrow("Process exited with code 1");
  });

  it("should reject when process encounters an error", async () => {
    const compilePromise = service.compile("spec.tsp");
    const error = new Error("Command not found");
    mockChildProcess.emit("error", error);

    await expect(compilePromise).rejects.toThrow("Command not found");
    expect(mockConsole).toHaveBeenCalledWith("Error executing tsp compile:", error);
  });

  it("should reject with the resolver's error without spawning when the compiler can't be resolved", async () => {
    // Arrange
    const resolveError = new Error(
      "Could not find the TypeSpec compiler (@typespec/compiler). " +
        "Reinstall @common-grants/cli and try again."
    );
    (resolveTspBinPath as Mock).mockImplementationOnce(() => {
      throw resolveError;
    });

    // Act
    const compilePromise = service.compile("spec.tsp");

    // Assert
    await expect(compilePromise).rejects.toBe(resolveError);
    expect(mockSpawn).not.toHaveBeenCalled();
  });
});
