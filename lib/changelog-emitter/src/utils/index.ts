import { ChangeRecord } from "../types.js";
import { Version } from "@typespec/versioning";

/**
 * Get the version string from a Version object.
 * If the enum member has a string value assigned (e.g., v1: "1.0.0"), use that.
 * Otherwise, use the enum member name (e.g., "v1").
 *
 * @param version - The version object
 * @returns The version string
 */
export function getVersionString(version: Version): string {
  // Check if the version has an enumMember with a value
  if (
    version.enumMember?.value &&
    typeof version.enumMember.value === "string"
  ) {
    return version.enumMember.value;
  }
  // Fall back to the version name
  return version.name;
}

/**
 * Get or create a changes array for a specific schema and version.
 * If changes for the version already exist, return that array.
 * Otherwise, create a new empty array and return it.
 *
 * @param schemaLogs - The logs for a specific schema { [version: string]: ChangeRecord[] }
 * @param versionName - The name of the version to find or create
 * @returns The existing or newly created changes array
 */
export function getOrCreateChanges(
  schemaLogs: { [version: string]: ChangeRecord[] },
  versionName: string,
): ChangeRecord[] {
  if (!schemaLogs[versionName]) {
    schemaLogs[versionName] = [];
  }
  return schemaLogs[versionName];
}

/**
 * Generic utility to determine what a named entity's name was at a specific version, considering all renames.
 * This works for any type that has a `name` property and can have rename data.
 *
 * @param currentName - The current name of the entity
 * @param version - The version to check
 * @param renamedFromData - The rename data from getRenamedFrom
 * @returns The name at that version
 */
export function getNameAtVersion(
  currentName: string,
  version: Version,
  renamedFromData: Array<{ version: Version; oldName: string }> | undefined,
): string {
  if (!renamedFromData || renamedFromData.length === 0) {
    return currentName;
  }

  // Sort renames by version index to get chronological order
  const sortedRenames = [...renamedFromData].sort(
    (a, b) => a.version.index - b.version.index,
  );

  // Find the first rename that happened after the target version
  for (const rename of sortedRenames) {
    if (rename.version.index > version.index) {
      // This rename happened after our target version, so use the old name from this rename
      return rename.oldName;
    }
  }

  // If no renames happened after this version, the entity had its current name
  return currentName;
}
