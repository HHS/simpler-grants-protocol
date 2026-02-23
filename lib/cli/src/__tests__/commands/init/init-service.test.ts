import { beforeEach, describe, it, vi, expect } from "vitest";
import { Mock, MockedFunction } from "vitest";
import { DefaultInitService } from "../../../commands/init/init-service";
import { spawn } from "child_process";
import { EventEmitter } from "events";
import { ChildProcess } from "child_process";
import { Readable } from "stream";
import { tspBinPath } from "../../../utils/typespec";

// Mock child_process.spawn
vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

describe("DefaultInitService", () => {
  let service: DefaultInitService;
  let mockSpawn: Mock;
  let mockChildProcess: Partial<ChildProcess> & EventEmitter;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            "grants-api": {},
            "custom-fields": {},
            "minimal-api": {},
          }),
      } as Response)
    ) as MockedFunction<typeof fetch>;

    mockSpawn = spawn as Mock;

    // Create an EventEmitter to simulate the child process
    mockChildProcess = new EventEmitter() as Partial<ChildProcess> & EventEmitter;
    mockChildProcess.stderr = new Readable({ read: () => {} });
    mockChildProcess.stdout = new Readable({ read: () => {} });

    // Set up the spawn mock to return our mock child process
    mockSpawn.mockReturnValue(mockChildProcess);

    // Instantiate service *after* fetch is mocked
    service = new DefaultInitService();
  });

  describe("listTemplates", () => {
    it("should return available templates", async () => {
      // Optionally wait a tick so the constructor's loadTemplates() finishes:
      await new Promise(resolve => setImmediate(resolve));
      // Now the templates should be what we mocked in fetch.json()
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
      // Simulate successful process exit
      // Wait for init to complete
      mockChildProcess.emit("exit", 0);
      await initPromise;

      expect(mockSpawn).toHaveBeenCalledWith("node", [tspBinPath, "init", templateUrl], {
        stdio: "inherit",
      });
    });

    it("should spawn tsp init with template argument when specified", async () => {
      const initPromise = service.init({ template: "grants-api" });
      mockChildProcess.emit("exit", 0);
      await initPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        "node",
        [tspBinPath, "init", templateUrl, "--template", "grants-api"],
        { stdio: "inherit" }
      );
    });

    it("should reject when process exits with non-zero code", async () => {
      const initPromise = service.init({});
      mockChildProcess.emit("exit", 1);
      await expect(initPromise).rejects.toThrow("Process exited with code 1");
    });

    it("should reject when process encounters an error", async () => {
      // Mock console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const initPromise = service.init({});
      const error = new Error("Command not found");
      mockChildProcess.emit("error", error);

      await expect(initPromise).rejects.toThrow("Command not found");

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });
});
