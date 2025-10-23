import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "typespec-versioning-changelog",
  diagnostics: {},
});

export const { reportDiagnostic, createDiagnostic } = $lib;
