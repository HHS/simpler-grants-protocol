import { exec } from "child_process";
import { promisify } from "util";
import { describe, it, expect } from "@jest/globals";

const execAsync = promisify(exec);

describe("CLI Integration Tests", () => {
  const CLI_PATH = "ts-node src/index.ts";

  describe("help and version", () => {
    it("should show help information", async () => {
      const { stdout } = await execAsync(`${CLI_PATH} --help`);
      expect(stdout).toContain("Usage: cg [options] [command]");
      expect(stdout).toContain("CommonGrants CLI tools");
    });
  });

  describe("init command", () => {
    it("should list templates", async () => {
      const { stdout } = await execAsync(`${CLI_PATH} init --list`);
      expect(stdout).toContain("Available templates:");
      expect(stdout).toContain("grants-api");
      expect(stdout).toContain("custom-fields");
      expect(stdout).toContain("minimal-api");
    });
  });

  describe("preview command", () => {
    it("should validate preview UI option", async () => {
      await expect(execAsync(`${CLI_PATH} preview spec.tsp --ui invalid`)).rejects.toThrow(
        'UI option must be either "swagger" or "redocly"'
      );
    });

    it("should accept valid UI option", async () => {
      const { stdout } = await execAsync(`${CLI_PATH} preview spec.tsp --ui swagger`);
      expect(stdout).toContain("Mock: Previewing spec");
    });
  });

  describe("add field command", () => {
    it("should handle add field command with description", async () => {
      const { stdout } = await execAsync(
        `${CLI_PATH} add field testField string --description "Test field"`
      );
      expect(stdout).toContain("Mock: Adding field");
      expect(stdout).toContain("testField");
      expect(stdout).toContain("Test field");
    });
  });

  describe("check command", () => {
    it("should validate API implementation", async () => {
      const { stdout } = await execAsync(
        `${CLI_PATH} check api http://api.example.com spec.yaml --report json`
      );
      expect(stdout).toContain("Mock: Checking API");
    });

    it("should validate spec compliance", async () => {
      const { stdout } = await execAsync(`${CLI_PATH} check spec spec.yaml --spec-version v2.0.1`);
      expect(stdout).toContain("Mock: Checking spec compliance");
    });
  });

  describe("generate command", () => {
    it("should generate server code", async () => {
      const { stdout } = await execAsync(`${CLI_PATH} generate server spec.yaml --lang typescript`);
      expect(stdout).toContain("Mock: Generating server");
    });

    it("should generate client code", async () => {
      const { stdout } = await execAsync(
        `${CLI_PATH} generate client spec.yaml --lang python --docs`
      );
      expect(stdout).toContain("Mock: Generating client");
    });

    it("should reject invalid server components", async () => {
      await expect(
        execAsync(`${CLI_PATH} generate server spec.yaml --only invalid`)
      ).rejects.toThrow(/Invalid components/);
    });
  });
});
