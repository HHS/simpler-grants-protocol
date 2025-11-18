import type { JsonSchema } from "@jsonforms/core";

// Structured changelog types (matching changelog-emitter output)
export interface ChangeRecord {
  message: string;
  action:
    | "added"
    | "removed"
    | "renamed"
    | "madeRequired"
    | "madeOptional"
    | "typeChanged";
  targetKind:
    | "model"
    | "field"
    | "enum"
    | "member"
    | "operation"
    | "union"
    | "variant"
    | "scalar"
    | "interface";
  currTargetName?: string;
  prevTargetName?: string;
  currDataType?: string;
  prevDataType?: string;
}

export interface Changelog {
  versions: string[];
  logs: {
    [schemaName: string]: {
      [version: string]: ChangeRecord[];
    };
  };
}

export interface VersionGenerationResult {
  version: string;
  schemas: Map<string, JsonSchema>;
}

/**
 * Generates schema versions for a given version string
 * @param version - Version string (e.g., "0.1.0")
 * @param changelog - The changelog data parsed from changelog.json
 * @param schemas - Map of all current schemas (latest versions)
 * @returns Schema object for the specified version
 */
export function generateSchemaVersions(
  version: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _changelog: Changelog,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _schemas: Map<string, JsonSchema>,
): VersionGenerationResult {
  // TODO: Implement schema version generation logic
  return {
    version,
    schemas: new Map(),
  };
}
