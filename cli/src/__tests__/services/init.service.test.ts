import { beforeEach, describe, it, jest, expect } from "@jest/globals";
import { DefaultInitService } from "../../services/init.service";
import { spawn } from "child_process";
import { EventEmitter } from "events";
import { ChildProcess } from "child_process";
import { Readable } from "stream";

// Mock the child_process module
jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

describe("DefaultInitService", () => {
  let service: DefaultInitService;
  let mockSpawn: jest.Mock;
  let mockChildProcess: Partial<ChildProcess> & EventEmitter;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a new event emitter to simulate the child process
    mockChildProcess = new EventEmitter() as Partial<ChildProcess> & EventEmitter;
    mockChildProcess.stderr = new Readable({ read: () => {} });
    mockChildProcess.stdout = new Readable({ read: () => {} });

    // Set up the spawn mock to return our mock child process
    mockSpawn = spawn as jest.Mock;
    mockSpawn.mockReturnValue(mockChildProcess);

    service = new DefaultInitService();
  });

  describe("listTemplates", () => {
    it("should return available templates", async () => {
      const templates = await service.listTemplates();
      expect(templates).toEqual(["grants-api", "custom-fields", "minimal-api"]);
    });
  });

  describe("init", () => {
    const templateUrl =
      "https://raw.githubusercontent.com/HHS/simpler-grants-protocol/refs/heads/main/templates/template.json";

    it("should spawn tsp init with correct arguments when no template specified", async () => {
      // Create a promise that will resolve when init completes
      const initPromise = service.init({});

      // Simulate successful process exit
      mockChildProcess.emit("exit", 0);

      // Wait for init to complete
      await initPromise;

      // Verify spawn was called with correct arguments
      expect(mockSpawn).toHaveBeenCalledWith("npx", ["tsp", "init", templateUrl], {
        stdio: "inherit",
      });
    });

    it("should spawn tsp init with template argument when specified", async () => {
      const initPromise = service.init({ template: "grants-api" });

      mockChildProcess.emit("exit", 0);

      await initPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "npx",
        ["tsp", "init", templateUrl, "--template", "grants-api"],
        { stdio: "inherit" }
      );
    });

    it("should reject when process exits with non-zero code", async () => {
      // Create promise but don't await it yet
      const initPromise = service.init({});

      // Simulate process failure
      mockChildProcess.emit("exit", 1);

      // Verify the promise rejects
      await expect(initPromise).rejects.toThrow("Process exited with code 1");
    });

    it("should reject when process encounters an error", async () => {
      const initPromise = service.init({});

      const error = new Error("Command not found");
      mockChildProcess.emit("error", error);

      await expect(initPromise).rejects.toThrow("Command not found");
    });
  });
});
