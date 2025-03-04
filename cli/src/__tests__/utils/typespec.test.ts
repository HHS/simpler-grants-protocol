import * as typespecUtils from "../../utils/typespec";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

// Import after the module import so we can properly mock
const { compileTypeSpec, findMainTspPath } = typespecUtils;

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
      jest.restoreAllMocks();
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
    // Finding the main.tsp file
    // ############################################################

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
  });
});
