import { existsSync } from "fs";
import * as path from "path";
import { Paths } from "./paths";

/**
 * Gives the path, relative to the repository root, of the JSON Schema file the
 * website's TypeSpec build writes for a schema, or of its copy for one
 * protocol version (`v0.5.0`).
 *
 * @throws if the file doesn't exist, so a page naming an unknown schema fails the build
 */
export function schemaFilePath(schemaName: string, version?: string): string {
  const dir = version
    ? path.join(Paths.SCHEMAS_DIR, "versions", version)
    : Paths.SCHEMAS_DIR;
  const file = path.join(dir, `${schemaName}.yaml`);
  const relative = path
    .relative(Paths.REPO_ROOT, file)
    .split(path.sep)
    .join("/");

  if (!existsSync(file)) {
    throw new Error(
      `No JSON Schema for "${schemaName}"${version ? ` in ${version}` : ""}: ${relative} doesn't exist`,
    );
  }
  return relative;
}
