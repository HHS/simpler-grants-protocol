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

export enum Action {
  Added = "added",
  Removed = "removed",
  Renamed = "renamed",
  MadeRequired = "madeRequired",
  MadeOptional = "madeOptional",
  TypeChanged = "typeChanged",
}

export interface ChangeRecord {
  message: string;
  action: Action;
  targetKind: TargetType;
  currTargetName?: string;
  prevTargetName?: string;
  currDataType?: string;
  prevDataType?: string;
}

export interface ChangelogEntry {
  version: string;
  changes: ChangeRecord[];
}

export interface Logs {
  [schemaName: string]: ChangelogEntry[];
}

export interface Changelog {
  versions: string[];
  logs: Logs;
}
