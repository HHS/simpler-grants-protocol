import { compileTypeSpec } from "../../utils/typespec";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

describe("typespec utils", () => {
  describe("compileTypeSpec", () => {
    const outputDir = path.resolve(__dirname, "../../.generated");

    // Helper function to recursively remove directory
    const removeDir = (dir: string) => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
          const curPath = path.join(dir, file);
          if (fs.lstatSync(curPath).isDirectory()) {
            removeDir(curPath);
          } else {
            fs.unlinkSync(curPath);
          }
        });
        fs.rmdirSync(dir);
      }
    };

    // Clean up generated files after each test
    afterEach(() => {
      removeDir(outputDir);
    });

    // ############################################################
    // Successful compilation
    // ############################################################

    it("should compile TypeSpec to OpenAPI3 YAML", () => {
      // Act
      const result = compileTypeSpec();

      // Assert
      expect(fs.existsSync(result)).toBe(true);
      const content = yaml.parse(fs.readFileSync(result, "utf-8"));
      expect(content.openapi).toBeDefined();
    });

    // ############################################################
    // Error handling
    // ############################################################

    it("should throw error if compilation fails", () => {
      // Arrange - Temporarily rename main.tsp to simulate missing file
      const mainTspPath = path.resolve(__dirname, "../../utils/main.tsp");
      const backupPath = mainTspPath + ".backup";
      if (fs.existsSync(mainTspPath)) {
        fs.renameSync(mainTspPath, backupPath);
      }

      try {
        // Act & Assert
        expect(() => compileTypeSpec()).toThrow("Failed to compile TypeSpec");
      } finally {
        // Clean up - Restore main.tsp
        if (fs.existsSync(backupPath)) {
          fs.renameSync(backupPath, mainTspPath);
        }
      }
    });
  });
});
