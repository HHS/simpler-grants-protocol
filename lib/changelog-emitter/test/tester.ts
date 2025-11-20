import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { deepStrictEqual } from "node:assert";
import { Logs, ChangeRecord } from "../src/types.js";

// Legacy format for backwards compatibility
interface LegacyChangelogEntry {
  version: string;
  changes: ChangeRecord[];
}

type LegacyLogs = {
  [schemaName: string]: LegacyChangelogEntry[];
};

export const outputPath = "changelog.json";

// #########################################################
// # Create testers
// #########################################################

// Tester for emitter
export const EmitterTester = createTester(
  resolvePath(import.meta.dirname, ".."),
  {
    libraries: ["@typespec/versioning", "typespec-versioning-changelog"],
  },
)
  .importLibraries()
  .using("Versioning")
  .emit("typespec-versioning-changelog");

// #########################################################
// # Emitter functions
// #########################################################

/**
 * Emit without versioning
 * @param code - The code to emit
 * @param options - The options to pass to the emitter
 * @returns The outputs of the emitter
 */
export async function emit(
  code: string,
  options = {},
): Promise<Record<string, string>> {
  const host = await EmitterTester.createInstance();
  const [result, diagnostics] = await host.compileAndDiagnose(code, {
    compilerOptions: {
      options: { "emitter-test": { ...options } },
    },
  });

  // Check for compilation errors
  if (diagnostics.length > 0) {
    const errorMessages = diagnostics.map((d) => d.message).join("\n");
    throw new Error(`TypeSpec compilation failed:\n${errorMessages}`);
  }

  return result.outputs;
}

/**
 * Convert legacy format to new format
 */
function convertLegacyLogs(legacy: LegacyLogs): Logs {
  const logs: Logs = {};

  for (const [schemaName, entries] of Object.entries(legacy)) {
    logs[schemaName] = {};
    for (const entry of entries) {
      logs[schemaName][entry.version] = entry.changes;
    }
  }

  return logs;
}

/**
 * Emit code and validate the changelog output
 * @param code - The TypeSpec code to emit
 * @param expected - The expected changelog structure (legacy or new format)
 * @param options - The options to pass to the emitter
 */
export async function emitAndValidate(
  code: string,
  expected: Logs | LegacyLogs,
  options = {},
): Promise<void> {
  const outputs = await emit(code, options);
  const changelog = JSON.parse(outputs[outputPath]);

  // Check if it's the legacy format (array of entries) vs new format (map of versions)
  let expectedLogs: Logs;
  const firstSchemaValue = Object.values(expected)[0];
  if (Array.isArray(firstSchemaValue)) {
    // Legacy format - convert it
    expectedLogs = convertLegacyLogs(expected as LegacyLogs);
  } else {
    // New format
    expectedLogs = expected as Logs;
  }

  deepStrictEqual(changelog.logs, expectedLogs);
}
