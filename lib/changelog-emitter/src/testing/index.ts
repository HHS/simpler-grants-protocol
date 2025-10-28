import { resolvePath } from "@typespec/compiler";
import {
  createTestLibrary,
  TypeSpecTestLibrary,
} from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const EmitterTestTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "typespec-versioning-changelog",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../../"),
});
