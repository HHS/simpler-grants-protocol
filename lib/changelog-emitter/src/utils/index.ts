import { ChangelogEntry } from "../types.js";

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
