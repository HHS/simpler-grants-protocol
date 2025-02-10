import { beforeEach, describe, it, expect, jest } from "@jest/globals";
import { DefaultCompileService } from "../../services/compile.service";
import { spawn } from "child_process";
import { EventEmitter } from "events";
import { ChildProcess } from "child_process";

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

describe("DefaultCompileService", () => {
  let service: DefaultCompileService;
  let mockSpawn: jest.Mock;
  let mockChildProcess: Partial<ChildProcess> & EventEmitter;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DefaultCompileService();
    mockSpawn = spawn as jest.Mock;
    mockChildProcess = new EventEmitter() as Partial<ChildProcess> & EventEmitter;
    mockSpawn.mockReturnValue(mockChildProcess);
  });

  it("should spawn tsp compile with correct arguments", async () => {
    const compilePromise = service.compile("spec.tsp");
    mockChildProcess.emit("exit", 0);
    await compilePromise;

    expect(mockSpawn).toHaveBeenCalledWith("npx", ["tsp", "compile", "spec.tsp"], {
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
  });
});
