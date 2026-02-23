import { beforeEach, describe, it, expect, vi } from "vitest";
import { Mock } from "vitest";
import { DefaultCompileService } from "../../../commands/compile/compile-service";
import { spawn } from "child_process";
import { EventEmitter } from "events";
import { ChildProcess } from "child_process";
import { tspBinPath } from "../../../utils/typespec";

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

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

    expect(mockSpawn).toHaveBeenCalledWith("node", [tspBinPath, "compile", "spec.tsp"], {
      stdio: "inherit",
    });
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
});
