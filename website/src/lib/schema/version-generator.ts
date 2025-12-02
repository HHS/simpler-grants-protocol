import type { JsonSchema } from "@jsonforms/core";
import {
  Action,
  TargetType,
  type ChangeRecord,
  type Changelog,
} from "typespec-versioning-changelog";

// #############################################################################
// # Types
// #############################################################################

export interface VersionGenerationResult {
  version: string;
  schemas: Map<string, JsonSchema>;
}

const NEEDS_SCHEMA_FILE: TargetType[] = [
  TargetType.Model,
  TargetType.Enum,
  TargetType.Scalar,
] as const;

// #############################################################################
// # Public functions
// #############################################################################

/**
 * Generates schema versions for a given version string
 * @param version - Version string (e.g., "0.1.0")
 * @param changelog - The changelog data parsed from changelog.json
 * @param schemas - Map of all current schemas (latest versions)
 * @returns Schema object for the specified version
 */
export function generateSchemaVersions(
  version: string,
  changelog: Changelog,
  schemas: Map<string, JsonSchema>,
): VersionGenerationResult {
  const versionedSchemas = new Map<string, JsonSchema>();

  // Build a map of current name -> historical name for this version
  const nameMapping = buildNameMapping(version, changelog);

  // Process each schema
  for (const [currentName, currentSchema] of schemas) {
    const schemaLogs = changelog.logs[currentName];

    // Determine if this schema exists in the target version
    const existence = getSchemaExistence(currentName, version, changelog);

    if (!existence.exists) {
      continue; // Schema doesn't exist in this version
    }

    // Get the name this schema had in the target version
    const versionedName = existence.nameInVersion || currentName;

    // Clone and modify the schema for this version
    const versionedSchema = generateSchemaForVersion(
      currentSchema,
      currentName,
      version,
      schemaLogs,
      nameMapping,
    );

    versionedSchemas.set(versionedName, versionedSchema);
  }

  return {
    version,
    schemas: versionedSchemas,
  };
}

// #############################################################################
// # Build name mapping
// #############################################################################

/**
 * Build a mapping of current schema names to their names in the target version
 */
function buildNameMapping(
  targetVersion: string,
  changelog: Changelog,
): Map<string, string> {
  const mapping = new Map<string, string>();

  for (const schemaName of Object.keys(changelog.logs)) {
    const nameInVersion = getSchemaNameInVersion(
      schemaName,
      targetVersion,
      changelog,
    );
    if (nameInVersion && nameInVersion !== schemaName) {
      mapping.set(schemaName, nameInVersion);
    }
  }

  return mapping;
}

// #############################################################################
// # Get schema existence
// #############################################################################

/**
 * Determine if a schema exists in a given version and what name it has
 */
function getSchemaExistence(
  currentName: string,
  targetVersion: string,
  changelog: Changelog,
): { exists: boolean; nameInVersion?: string } {
  const schemaLogs = changelog.logs[currentName];

  if (!schemaLogs) {
    // No changelog entry means it doesn't exist
    return { exists: false };
  }

  // Find when the schema was added
  let addedVersion: string | null = null;
  let removedVersion: string | null = null;

  for (const version of changelog.versions) {
    const changes = schemaLogs[version];
    if (!changes) continue;

    for (const change of changes) {
      if (
        change.action === Action.Added &&
        NEEDS_SCHEMA_FILE.includes(change.targetKind)
      ) {
        addedVersion = version;
      }
      if (
        change.action === Action.Removed &&
        NEEDS_SCHEMA_FILE.includes(change.targetKind)
      ) {
        removedVersion = version;
      }
    }

    // Stop if we've passed the target version
    if (compareVersions(version, targetVersion) > 0) break;
  }

  // Check if schema was added before or in target version
  if (!addedVersion || compareVersions(addedVersion, targetVersion) > 0) {
    return { exists: false };
  }

  // Check if schema was removed before or in target version
  if (removedVersion && compareVersions(removedVersion, targetVersion) <= 0) {
    return { exists: false };
  }

  // Get the name in the target version
  const nameInVersion = getSchemaNameInVersion(
    currentName,
    targetVersion,
    changelog,
  );

  return { exists: true, nameInVersion: nameInVersion || undefined };
}

// #############################################################################
// # Get schema name in version
// #############################################################################

/**
 * Get the name a schema had in a specific version (handles renames)
 * @param currentName - The current name of the schema
 * @param targetVersion - Version string (e.g., "0.1.0")
 * @param changelog - The changelog data parsed from changelog.json
 * @returns The name the schema had in the target version, or null if it didn't exist
 */
export function getSchemaNameInVersion(
  currentName: string,
  targetVersion: string,
  changelog: Changelog,
): string | null {
  const schemaLogs = changelog.logs[currentName];
  if (!schemaLogs) return null;

  // Check if the schema was actually added
  let wasAdded = false;
  for (const version of changelog.versions) {
    const changes = schemaLogs[version];
    if (!changes) continue;

    for (const change of changes) {
      if (
        change.action === Action.Added &&
        NEEDS_SCHEMA_FILE.includes(change.targetKind)
      ) {
        wasAdded = true;
        break;
      }
    }
    if (wasAdded) break;
  }

  if (!wasAdded) return null;

  // Now walk backward from current to target to find the old name
  const renameHistory: Array<{ version: string; from: string; to: string }> =
    [];

  for (const version of changelog.versions) {
    const changes = schemaLogs[version];
    if (!changes) continue;

    for (const change of changes) {
      if (
        change.action === Action.Renamed &&
        NEEDS_SCHEMA_FILE.includes(change.targetKind)
      ) {
        renameHistory.push({
          version,
          from: change.prevTargetName || "",
          to: change.currTargetName || "",
        });
      }
    }
  }

  // Start with current name and walk backward through renames
  let result = currentName;
  for (let i = renameHistory.length - 1; i >= 0; i--) {
    const rename = renameHistory[i];
    if (compareVersions(rename.version, targetVersion) > 0) {
      // This rename happened after target version, so use the old name
      if (result === rename.to) {
        result = rename.from;
      }
    }
  }

  return result;
}

// #############################################################################
// # Generate schema for version
// #############################################################################

/**
 * Generate a schema for a specific version
 */
function generateSchemaForVersion(
  currentSchema: JsonSchema,
  currentName: string,
  targetVersion: string,
  schemaLogs: { [version: string]: ChangeRecord[] } | undefined,
  nameMapping: Map<string, string>,
): JsonSchema {
  // Deep clone the schema
  const versionedSchema = JSON.parse(
    JSON.stringify(currentSchema),
  ) as JsonSchema & { $id?: string };

  // Update $id if schema was renamed
  const nameInVersion = nameMapping.get(currentName) || currentName;
  if (versionedSchema.$id) {
    versionedSchema.$id = `${nameInVersion}.yaml`;
  }

  // Get fields that should be removed (added after target version)
  const fieldsToRemove = new Set<string>();

  if (schemaLogs) {
    for (const version of Object.keys(schemaLogs).sort()) {
      if (compareVersions(version, targetVersion) > 0) {
        const changes = schemaLogs[version];
        for (const change of changes) {
          if (
            change.action === Action.Added &&
            change.targetKind === TargetType.ModelProperty
          ) {
            fieldsToRemove.add(change.currTargetName || "");
          }
        }
      }
    }
  }

  // Remove fields that didn't exist yet
  if (versionedSchema.properties) {
    for (const fieldName of fieldsToRemove) {
      delete versionedSchema.properties[fieldName];
    }
  }

  // Remove from required array
  if (versionedSchema.required && Array.isArray(versionedSchema.required)) {
    versionedSchema.required = versionedSchema.required.filter(
      (field) => !fieldsToRemove.has(field),
    );
  }

  // Update $refs to use historical names
  updateRefs(versionedSchema, nameMapping);

  return versionedSchema;
}

// #############################################################################
// # Update refs
// #############################################################################

/**
 * Update all $ref values in a schema to use historical names
 */
function updateRefs(obj: unknown, nameMapping: Map<string, string>): void {
  if (!obj || typeof obj !== "object") return;

  const objRecord = obj as Record<string, unknown>;

  for (const [key, value] of Object.entries(objRecord)) {
    if (key === "$ref" && typeof value === "string") {
      // Update reference to use historical name
      for (const [currentName, historicalName] of nameMapping) {
        if (value === `${currentName}.yaml`) {
          objRecord[key] = `${historicalName}.yaml`;
          break;
        }
      }
    } else if (typeof value === "object" && value !== null) {
      updateRefs(value, nameMapping);
    }
  }
}

// #############################################################################
// # Compare versions
// #############################################################################

/**
 * Compare two semantic version strings
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}
