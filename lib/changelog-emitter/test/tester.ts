import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { deepStrictEqual } from "node:assert";
import { Changelog } from "../src/types.js";

export const outputPath = "changelog.json";

// #########################################################
// # Create testers
// #########################################################

// Tester for emitter
export const EmitterTester = createTester(
  resolvePath(import.meta.dirname, ".."),
  {
    libraries: ["@typespec/versioning", "typespec-versioning-changelog"],
  }
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
  options = {}
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
 * Emit code and validate the changelog output
 * @param code - The TypeSpec code to emit
 * @param expected - The expected changelog structure
 * @param options - The options to pass to the emitter
 */
export async function emitAndValidate(
  code: string,
  expected: Changelog,
  options = {}
): Promise<void> {
  const outputs = await emit(code, options);
  const changelog = JSON.parse(outputs[outputPath]);
  deepStrictEqual(changelog, expected);
}
