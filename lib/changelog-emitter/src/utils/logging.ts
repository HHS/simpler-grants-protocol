export { $onEmit } from "../emitter.js";
export { $lib } from "../lib.js";

import { TargetType, Action, type ChangeRecord } from "../types.js";

/**
 * Generate a change record for when a target is added.
 * Mirrors the @Versioning.added decorator functionality.
 * @param targetKind - The type of target being added (e.g. "model", "enum", "operation", etc.)
 * @param targetName - The name of the target
 * @returns Structured change record
 */
function added(targetKind: TargetType, targetName: string): ChangeRecord {
  const message = `Added \`${targetName}\` ${targetKind}`;
  return {
    message,
    action: Action.Added,
    targetKind,
    currTargetName: targetName,
  };
}

/**
 * Generate a change record for when a target is removed.
 * Mirrors the @Versioning.removed decorator functionality.
 * @param targetKind - The type of target being removed (e.g. "model", "enum", "operation", etc.)
 * @param targetName - The name of the target
 * @returns Structured change record
 */
function removed(targetKind: TargetType, targetName: string): ChangeRecord {
  const message = `Removed \`${targetName}\` ${targetKind}`;
  return {
    message,
    action: Action.Removed,
    targetKind,
    currTargetName: targetName,
  };
}

/**
 * Generate a change record for when a model property is made required.
 * Mirrors the @Versioning.madeRequired decorator functionality.
 * @param targetName - The name of the property
 * @returns Structured change record
 */
function madeRequired(targetName: string): ChangeRecord {
  const message = `Made \`${targetName}\` field required`;
  return {
    message,
    action: Action.MadeRequired,
    targetKind: TargetType.ModelProperty,
    currTargetName: targetName,
  };
}

/**
 * Generate a change record for when a model property is made optional.
 * Mirrors the @Versioning.madeOptional decorator functionality.
 * @param targetName - The name of the property
 * @returns Structured change record
 */
function madeOptional(targetName: string): ChangeRecord {
  const message = `Made \`${targetName}\` field optional`;
  return {
    message,
    action: Action.MadeOptional,
    targetKind: TargetType.ModelProperty,
    currTargetName: targetName,
  };
}

/**
 * Generate a change record for when a target is renamed.
 * Mirrors the @Versioning.renamedFrom decorator functionality.
 * @param targetKind - The type of target being renamed (e.g. "model", "enum", "operation", etc.)
 * @param oldName - The old name of the target
 * @param newName - The new name of the target
 * @returns Structured change record
 */
function renamedFrom(
  targetKind: TargetType,
  oldName: string,
  newName: string,
): ChangeRecord {
  const message = `Renamed ${targetKind} from \`${oldName}\` to \`${newName}\``;
  return {
    message,
    action: Action.Renamed,
    targetKind,
    prevTargetName: oldName,
    currTargetName: newName,
  };
}

/**
 * Generate a change record for when a model property type is changed.
 * Mirrors the @Versioning.typeChangedFrom decorator functionality.
 * @param targetName - The name of the property (e.g. "name", "email", "id", etc.)
 * @param oldType - The old type of the property
 * @param newType - The new type of the property
 * @returns Structured change record
 */
function typeChangedFrom(
  targetName: string,
  oldType: string,
  newType: string,
): ChangeRecord {
  const message = `Changed \`${targetName}\` field type from \`${oldType}\` to \`${newType}\``;
  return {
    message,
    action: Action.TypeChanged,
    targetKind: TargetType.ModelProperty,
    currTargetName: targetName,
    prevDataType: oldType,
    currDataType: newType,
  };
}

/**
 * Generate a change record for when an operation return type is changed.
 * Mirrors the @Versioning.returnTypeChangedFrom decorator functionality.
 * @param targetName - The name of the operation (e.g. "getUser", "createUser", "deleteUser", etc.)
 * @param oldType - The old return type
 * @param newType - The new return type
 * @returns Structured change record
 */
function returnTypeChangedFrom(
  targetName: string,
  oldType: string,
  newType: string,
): ChangeRecord {
  const message = `Changed \`${targetName}\` return type from \`${oldType}\` to \`${newType}\``;
  return {
    message,
    action: Action.TypeChanged,
    targetKind: TargetType.Operation,
    currTargetName: targetName,
    prevDataType: oldType,
    currDataType: newType,
  };
}

/**
 * Log utilities for generating consistent changelog records.
 * These functions mirror the TypeSpec versioning decorators structure
 * and provide structured change records for different types of schema changes.
 * Based on https://typespec.io/docs/libraries/versioning/reference/decorators/
 */
export const Log = {
  added,
  removed,
  madeRequired,
  madeOptional,
  renamedFrom,
  typeChangedFrom,
  returnTypeChangedFrom,
} as const;
