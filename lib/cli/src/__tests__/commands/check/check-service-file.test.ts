import { DefaultCheckService } from "../../../commands/check/check-service";
import * as path from "path";

// No mocks - we want to test the real behavior
describe("DefaultCheckService - Circular References", () => {
  let service: DefaultCheckService;
  const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
  const mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    service = new DefaultCheckService();
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should handle circular references gracefully with the fix", async () => {
    // This test uses the actual test files we created and verified manually
    const basePath = path.join(__dirname, "test-files/base.yaml");
    const implPath = path.join(__dirname, "test-files/impl.yaml");

    // Act & Assert - Should handle circular references gracefully (green phase)
    // The fix with { circular: "ignore" } should allow this to pass
    await service.checkSpec(implPath, { base: basePath });

    // Verify success
    expect(mockConsoleLog).toHaveBeenCalledWith("Spec is valid and compliant with base spec");

    // Verify no errors or warnings were logged during circular reference handling
    expect(mockConsoleWarn).not.toHaveBeenCalled();
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it("should handle JSON spec files with circular references", async () => {
    // This test uses JSON versions of the test files to verify JSON support
    const basePath = path.join(__dirname, "test-files/base.json");
    const implPath = path.join(__dirname, "test-files/impl.json");

    // Act & Assert - Should handle JSON files with circular references gracefully
    await service.checkSpec(implPath, { base: basePath });

    // Verify success
    expect(mockConsoleLog).toHaveBeenCalledWith("Spec is valid and compliant with base spec");

    // Verify no errors or warnings were logged during circular reference handling
    expect(mockConsoleWarn).not.toHaveBeenCalled();
    expect(mockConsoleError).not.toHaveBeenCalled();
  });
});
