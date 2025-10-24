export interface ChangelogEntry {
  version: string;
  changes: string[];
}

export interface Changelog {
  [schemaName: string]: ChangelogEntry[];
}

/**
 * Target types that mirror the TypeSpec versioning decorators.
 * The values are designed to work directly with message templates.
 * Based on https://typespec.io/docs/libraries/versioning/reference/decorators/
 */
export enum TargetType {
  Model = "model",
  ModelProperty = "field",
  Enum = "enum",
  EnumMember = "member",
  Operation = "operation",
  Union = "union",
  UnionVariant = "variant",
  Scalar = "scalar",
  Interface = "interface",
}
