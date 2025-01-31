import { exec } from "child_process";
import { promisify } from "util";
import { describe, it, expect } from "@jest/globals";

const execAsync = promisify(exec);

describe("CLI Integration Tests", () => {
  const CLI_PATH = "ts-node src/index.ts";

  it("should show help information", async () => {
    const { stdout } = await execAsync(`${CLI_PATH} --help`);
    expect(stdout).toContain("Usage: cg [options] [command]");
    expect(stdout).toContain("CommonGrants CLI tools");
  });

  it("should list templates", async () => {
    const { stdout } = await execAsync(`${CLI_PATH} init --list`);
    expect(stdout).toContain("Available templates:");
    expect(stdout).toContain("grants-api");
    expect(stdout).toContain("custom-fields");
    expect(stdout).toContain("minimal-api");
  });

  it("should validate preview UI option", async () => {
    await expect(
      execAsync(`${CLI_PATH} preview spec.tsp --ui invalid`)
    ).rejects.toThrow('UI option must be either "swagger" or "redocly"');
  });

  it("should handle add field command", async () => {
    const { stdout } = await execAsync(
      `${CLI_PATH} add field testField string --description "Test field"`
    );
    expect(stdout).toContain("Mock: Adding field");
    expect(stdout).toContain("testField");
    expect(stdout).toContain("Test field");
  });
});
