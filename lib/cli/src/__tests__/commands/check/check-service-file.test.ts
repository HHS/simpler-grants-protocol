import { vi } from "vitest";
import { DefaultCheckService } from "../../../commands/check/check-service";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as yaml from "js-yaml";
import { OpenAPIV3 } from "openapi-types";

const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

afterAll(() => {
  mockConsoleLog.mockRestore();
  mockConsoleWarn.mockRestore();
  mockConsoleError.mockRestore();
});

// No mocks - we want to test the real behavior
describe("DefaultCheckService - Circular References", () => {
  let service: DefaultCheckService;

  beforeEach(() => {
    service = new DefaultCheckService();
    vi.clearAllMocks();
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

describe("DefaultCheckService - Bundled Base Specs", () => {
  const VERSION_PARAM_REF = "#/components/parameters/CommonGrants.Headers.VersionRequest";
  let service: DefaultCheckService;
  let tmpDir: string;

  beforeEach(() => {
    service = new DefaultCheckService();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cg-check-"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Load a base spec bundled with the CLI, to edit into an implementation spec */
  function loadBundledSpec(version: string): OpenAPIV3.Document {
    const specPath = path.resolve(__dirname, `../../../../lib/openapi/openapi.${version}.yaml`);
    return yaml.load(fs.readFileSync(specPath, "utf8")) as OpenAPIV3.Document;
  }

  /** Write an implementation spec to a temp file and return its path */
  function writeTempSpec(doc: OpenAPIV3.Document): string {
    const specPath = path.join(tmpDir, "impl.yaml");
    fs.writeFileSync(specPath, yaml.dump(doc));
    return specPath;
  }

  function removeVersionParam(operation: OpenAPIV3.OperationObject): void {
    operation.parameters = operation.parameters!.filter(
      param => !("$ref" in param) || param.$ref !== VERSION_PARAM_REF
    );
  }

  function prefixPaths(doc: OpenAPIV3.Document, prefix: string): OpenAPIV3.Document {
    const paths = Object.entries(doc.paths).map(([route, item]) => [`${prefix}${route}`, item]);
    return { ...doc, paths: Object.fromEntries(paths) };
  }

  it("should use the bundled 0.6.0 base spec when protocolVersion is 0.6.0", async () => {
    // The 0.6.0 base is the simplest spec that is compliant with itself
    const implPath = path.resolve(__dirname, "../../../../lib/openapi/openapi.0.6.0.yaml");

    // Act & Assert - Should resolve without a "Base spec file not found" error
    await service.checkSpec(implPath, { protocolVersion: "0.6.0" });

    // Verify success
    expect(mockConsoleLog).toHaveBeenCalledWith("Spec is valid and compliant with base spec");
  });

  it.each(["0.1.0", "0.2.0", "0.3.0", "0.4.0", "0.5.0"])(
    "should leave the output unchanged when checking the bundled %s spec against itself",
    async version => {
      const implPath = path.resolve(__dirname, `../../../../lib/openapi/openapi.${version}.yaml`);

      // Act & Assert - Pre-0.6.0 specs have no version headers and must be unaffected
      await service.checkSpec(implPath, { protocolVersion: version });

      // Verify the exact success output and no warnings
      expect(mockConsoleLog).toHaveBeenCalledWith("Spec is valid and compliant with base spec");
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    }
  );

  it("should report operations missing the CG-Version parameter or CG-Version-Served header", async () => {
    const impl = loadBundledSpec("0.6.0");
    removeVersionParam(impl.paths["/common-grants/opportunities"]!.get!);
    const read = impl.paths["/common-grants/opportunities/{oppId}"]!.get!;
    delete (read.responses["200"] as OpenAPIV3.ResponseObject).headers!["CG-Version-Served"];

    // Act & Assert - Both operations should be reported end to end
    const result = service.checkSpec(writeTempSpec(impl), { protocolVersion: "0.6.0" });
    await expect(result).rejects.toThrow(/GET \/common-grants\/opportunities\b(?!\/)/);
    await expect(result).rejects.toThrow("[CG-Version]");
    await expect(result).rejects.toThrow("GET /common-grants/opportunities/{oppId}");
    await expect(result).rejects.toThrow("CG-Version-Served");
  });

  it("should report missing version headers on an experimental route", async () => {
    const impl = loadBundledSpec("0.6.0");
    const list = impl.paths["/common-grants/forms"]!.get!;
    expect(list.tags).toContain("experimental");
    removeVersionParam(list);
    delete (list.responses["200"] as OpenAPIV3.ResponseObject).headers;

    // Act & Assert - Experimental routes skip the other checks but not the headers
    const result = service.checkSpec(writeTempSpec(impl), { protocolVersion: "0.6.0" });
    await expect(result).rejects.toThrow("GET /common-grants/forms");
    await expect(result).rejects.toThrow("[CG-Version]");
    await expect(result).rejects.toThrow("[CG-Version-Served]");
  });

  it("should accept the CG-Version parameter declared once on the path item", async () => {
    const impl = loadBundledSpec("0.6.0");
    const pathItem = impl.paths["/common-grants/opportunities"]!;
    removeVersionParam(pathItem.get!);
    pathItem.parameters = [{ $ref: VERSION_PARAM_REF }];

    // Act & Assert - Neither a missing header nor an extra "PARAMETERS" route is reported
    await service.checkSpec(writeTempSpec(impl), { protocolVersion: "0.6.0" });

    // Verify success
    expect(mockConsoleLog).toHaveBeenCalledWith("Spec is valid and compliant with base spec");
  });

  it("should report one error when routes carry a version segment instead of listing missing routes", async () => {
    const impl = prefixPaths(loadBundledSpec("0.6.0"), "/v0.6");

    // Act
    const result = service.checkSpec(writeTempSpec(impl), { protocolVersion: "0.6.0" });

    // Assert - One error points at the CG-Version header; no per-route findings
    await expect(result).rejects.toThrow("CG-Version");
    await expect(result).rejects.toThrow("/v0.6/common-grants/");
    await expect(result).rejects.toThrow("1 errors");
    await expect(result).rejects.not.toThrow("Routes missing");
  });

  it("should not point at the CG-Version header when checking against a version without it", async () => {
    const impl = prefixPaths(loadBundledSpec("0.5.0"), "/v0.5");

    // Act
    const result = service.checkSpec(writeTempSpec(impl), { protocolVersion: "0.5.0" });

    // Assert - Still one error instead of the missing routes, without the header advice
    await expect(result).rejects.toThrow("/v0.5/common-grants/");
    await expect(result).rejects.toThrow("1 errors");
    await expect(result).rejects.not.toThrow("CG-Version");
  });

  it("should default to 0.6.0 when no protocol version is given", async () => {
    const implPath = path.resolve(__dirname, "../../../../lib/openapi/openapi.0.5.0.yaml");

    // Act & Assert - 0.5.0 has no version headers, so the 0.6.0 default must flag them
    await expect(service.checkSpec(implPath, {})).rejects.toThrow("[CG-Version]");
  });
});
