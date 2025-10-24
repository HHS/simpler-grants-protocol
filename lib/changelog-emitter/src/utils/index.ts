import { ChangelogEntry } from "../types.js";
import { Version } from "@typespec/versioning";

/**
 * Get or create a changelog entry for a specific version.
 * If an entry for the version already exists, it returns that entry.
 * Otherwise, it creates a new entry with an empty changes array.
 *
 * @param changelog - The changelog array to search or add to
 * @param versionName - The name of the version to find or create
 * @returns The existing or newly created changelog entry
 */
export function getOrCreateEntry(
  changelog: ChangelogEntry[],
  versionName: string,
): ChangelogEntry {
  let entry = changelog.find((e) => e.version === versionName);
  if (!entry) {
    entry = {
      version: versionName,
      changes: [],
    };
    changelog.push(entry);
  }
  return entry;
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
