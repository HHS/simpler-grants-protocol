import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadConfig } from "../../utils/config";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-config-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("loadConfig", () => {
  describe("explicit config path", () => {
    it("should load the file at --config and skip discovery", () => {
      // Arrange
      const tempDir = makeTempDir();
      // An invalid discoverable file: discovery would throw if it were attempted
      fs.writeFileSync(path.join(tempDir, "cg.config.yaml"), "bogus-key: 1\n");
      const otherPath = path.join(tempDir, "other.json");
      fs.writeFileSync(otherPath, JSON.stringify({ "check-spec": {} }));

      // Act
      const config = loadConfig({ configPath: otherPath, cwd: tempDir });

      // Assert
      expect(config).toEqual({ "check-spec": {} });
    });

    it("should throw an error naming the path when the file is missing", () => {
      // Arrange
      const tempDir = makeTempDir();
      const missingPath = path.join(tempDir, "missing.yaml");

      // Act & Assert
      expect(() => loadConfig({ configPath: missingPath, cwd: tempDir })).toThrow(missingPath);
      expect(() => loadConfig({ configPath: missingPath, cwd: tempDir })).toThrow(/not found/i);
    });

    it("should throw an error naming the path when the extension is unsupported", () => {
      // Arrange
      const tempDir = makeTempDir();
      const tomlPath = path.join(tempDir, "cg.config.toml");
      fs.writeFileSync(tomlPath, "x = 1\n");

      // Act & Assert
      expect(() => loadConfig({ configPath: tomlPath, cwd: tempDir })).toThrow(tomlPath);
      expect(() => loadConfig({ configPath: tomlPath, cwd: tempDir })).toThrow(
        /extension|unsupported/i
      );
    });
  });

  describe("discovery", () => {
    it.each([
      ["cg.config.yml", "check-spec: {}\n"],
      ["cg.config.yaml", "check-spec: {}\n"],
      ["cg.config.json", JSON.stringify({ "check-spec": {} })],
    ])("should load %s when it is the only config file in the cwd", (fileName, content) => {
      // Arrange
      const tempDir = makeTempDir();
      fs.writeFileSync(path.join(tempDir, fileName), content);

      // Act
      const config = loadConfig({ cwd: tempDir });

      // Assert
      expect(config).toEqual({ "check-spec": {} });
    });

    it("should return an empty default config when no config file exists in the cwd", () => {
      // Arrange
      const tempDir = makeTempDir();

      // Act
      const config = loadConfig({ cwd: tempDir });

      // Assert
      expect(config).toEqual({});
    });

    it("should throw an error listing every match when multiple config files exist", () => {
      // Arrange
      const tempDir = makeTempDir();
      const yamlPath = path.join(tempDir, "cg.config.yaml");
      const jsonPath = path.join(tempDir, "cg.config.json");
      fs.writeFileSync(yamlPath, "check-spec: {}\n");
      fs.writeFileSync(jsonPath, "{}");

      // Act
      let message = "";
      try {
        loadConfig({ cwd: tempDir });
      } catch (error) {
        message = (error as Error).message;
      }

      // Assert
      expect(message).toContain(yamlPath);
      expect(message).toContain(jsonPath);
    });
  });

  describe("edge cases", () => {
    it("should not fall back to discovery when --config is an empty string", () => {
      // Arrange
      const tempDir = makeTempDir();
      fs.writeFileSync(path.join(tempDir, "cg.config.yaml"), "check-spec: {}\n");

      // Act / Assert
      expect(() => loadConfig({ configPath: "", cwd: tempDir })).toThrow(/not found/i);
    });

    it("should accept an uppercase extension", () => {
      // Arrange
      const tempDir = makeTempDir();
      const upperPath = path.join(tempDir, "cg.config.YAML");
      fs.writeFileSync(upperPath, "check-spec: {}\n");

      // Act
      const config = loadConfig({ configPath: upperPath, cwd: tempDir });

      // Assert
      expect(config).toEqual({ "check-spec": {} });
    });

    it("should ignore a directory named like a config file during discovery", () => {
      // Arrange
      const tempDir = makeTempDir();
      fs.mkdirSync(path.join(tempDir, "cg.config.json"));
      fs.writeFileSync(path.join(tempDir, "cg.config.yaml"), "check-spec: {}\n");

      // Act
      const config = loadConfig({ cwd: tempDir });

      // Assert
      expect(config).toEqual({ "check-spec": {} });
    });
  });

  describe("parsing and validation", () => {
    function loadError(filePath: string, cwd: string): string {
      try {
        loadConfig({ configPath: filePath, cwd });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        return (error as Error).message;
      }
      throw new Error("Expected loadConfig to throw");
    }

    it("should throw an error naming the path when the YAML is malformed", () => {
      // Arrange
      const tempDir = makeTempDir();
      const badPath = path.join(tempDir, "bad.yaml");
      fs.writeFileSync(badPath, "check-spec: [unclosed\n");

      // Act
      const message = loadError(badPath, tempDir);

      // Assert
      expect(message).toContain(badPath);
    });

    it("should throw an error naming the path when the JSON is malformed", () => {
      // Arrange
      const tempDir = makeTempDir();
      const badPath = path.join(tempDir, "bad.json");
      fs.writeFileSync(badPath, '{ "check-spec": ');

      // Act
      const message = loadError(badPath, tempDir);

      // Assert
      expect(message).toContain(badPath);
    });

    it("should throw a readable error naming the path and key for an unknown top-level key", () => {
      // Arrange
      const tempDir = makeTempDir();
      const unknownPath = path.join(tempDir, "unknown.yaml");
      fs.writeFileSync(unknownPath, "bogus: 1\n");

      // Act
      const message = loadError(unknownPath, tempDir);

      // Assert
      expect(message).toContain(unknownPath);
      expect(message).toContain("bogus");
      expect(message).not.toMatch(/^\s*\[/);
      expect(message).not.toContain("- : ");
    });

    it("should report the key path for an unknown key under check-spec", () => {
      // Arrange
      const tempDir = makeTempDir();
      const nestedPath = path.join(tempDir, "nested.yaml");
      fs.writeFileSync(nestedPath, "check-spec:\n  treshold: 100\n");

      // Act
      const message = loadError(nestedPath, tempDir);

      // Assert
      expect(message).toContain(nestedPath);
      expect(message).toContain("check-spec");
      expect(message).toContain("treshold");
    });

    it("should return an empty config for an empty file", () => {
      // Arrange
      const tempDir = makeTempDir();
      const emptyPath = path.join(tempDir, "empty.yaml");
      fs.writeFileSync(emptyPath, "");

      // Act
      const config = loadConfig({ configPath: emptyPath, cwd: tempDir });

      // Assert
      expect(config).toEqual({});
    });

    it("should throw an error naming the path when the top level is an array", () => {
      // Arrange
      const tempDir = makeTempDir();
      const arrayPath = path.join(tempDir, "array.yaml");
      fs.writeFileSync(arrayPath, "- a\n- b\n");

      // Act
      const message = loadError(arrayPath, tempDir);

      // Assert
      expect(message).toContain(arrayPath);
    });
  });
});
