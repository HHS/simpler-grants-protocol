import * as typespecUtils from "../../utils/typespec";
import * as fs from "fs";

// Import after the module import so we can properly mock
const { findMainTspPath } = typespecUtils;

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
});
