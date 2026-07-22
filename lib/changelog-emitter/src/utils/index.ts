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
 * Deduplicate a list of versions by their version string.
 *
 * A model or property defined via `is`/`extends` on a versioned base inherits
 * the base's `@added`/`@removed` decorators in addition to its own, so
 * `getAddedOnVersions`/`getRemovedOnVersions` can report the same version more
 * than once. An entity can only be added or removed once per version, so
 * collapse the duplicates while preserving order.
 *
 * @param versions - The versions to deduplicate
 * @returns The versions with duplicate version strings removed
 */
export function dedupeVersions(versions: readonly Version[]): Version[] {
  const seen = new Set<string>();
  const result: Version[] = [];
  for (const version of versions) {
    const versionString = getVersionString(version);
    if (seen.has(versionString)) {
      continue;
    }
    seen.add(versionString);
    result.push(version);
  }
  return result;
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
