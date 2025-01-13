import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "@agile-six/opportunity-stream",
  diagnostics: {
    // We'll add diagnostics later if needed
  },
} as const);

// Optional but convenient, these are meant to be used locally in your library
export const { reportDiagnostic, createDiagnostic } = $lib;
