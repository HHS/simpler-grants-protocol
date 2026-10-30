import { vi } from "vitest";
import type { Mock } from "vitest";
import * as typespecUtils from "../../utils/typespec";
import * as fs from "fs";
import * as path from "path";

vi.mock("fs", async importOriginal => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
  };
});

// Import after the module import so we can properly mock
const { findMainTspPath, resolveTspBinPath } = typespecUtils;

describe("typespec utils", () => {
  it("should find main.tsp in the lib directory", () => {
    // Act
    const mainTspPath = findMainTspPath();

    // Assert
    expect(fs.existsSync(mainTspPath)).toBe(true);
    expect(mainTspPath.endsWith("lib/main.tsp")).toBe(true);

    // Verify the file contains valid TypeSpec
    const content = fs.readFileSync(mainTspPath, "utf-8");
    expect(content).toContain("import");
  });

  it("should resolve the tsp compiler's real JS entry rather than the .bin shim", () => {
    // Act
    const tspBinPath = resolveTspBinPath();

    // Assert
    expect(path.isAbsolute(tspBinPath)).toBe(true);
    expect(fs.existsSync(tspBinPath)).toBe(true);
    expect(tspBinPath.endsWith(".js")).toBe(true);
    expect(tspBinPath).not.toContain(`${path.sep}.bin${path.sep}`);
    expect(tspBinPath).toContain(path.join("@typespec", "compiler"));
  });

  describe("resolveTspBinPath errors", () => {
    it("should throw a clear error naming @typespec/compiler when its package.json has no tsp bin", () => {
      // Arrange
      (fs.readFileSync as Mock).mockReturnValueOnce(JSON.stringify({ name: "@typespec/compiler" }));

      // Act
      const act = () => resolveTspBinPath();

      // Assert
      expect(act).toThrow(/@typespec\/compiler.*install/is);
    });

    it("should throw a clear error naming @typespec/compiler when the compiler is not installed", () => {
      // Arrange
      const resolve = () => {
        throw new Error("Cannot find module '@typespec/compiler/package.json'");
      };

      // Act
      const act = () => resolveTspBinPath(resolve);

      // Assert
      expect(act).toThrow(/@typespec\/compiler.*install/is);
    });

    it("should throw a clear error naming @typespec/compiler when its package.json is malformed", () => {
      // Arrange
      (fs.readFileSync as Mock).mockReturnValueOnce("{ not json");

      // Act
      const act = () => resolveTspBinPath();

      // Assert
      expect(act).toThrow(/@typespec\/compiler.*install/is);
    });
  });
});
