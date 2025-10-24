export { $onEmit } from "../emitter.js";
export { $lib } from "../lib.js";

import { TargetType } from "../types.js";

/**
 * Generate a message for when a target is added.
 * Mirrors the @Versioning.added decorator functionality.
 * @param targetType - The type of target being added (e.g. "model", "enum", "operation", etc.)
 * @param targetName - The name of the target
 * @returns Formatted message string
 */
function added(targetType: TargetType, targetName: string): string {
  return `Added \`${targetName}\` ${targetType}`;
}

/**
 * Generate a message for when a target is removed.
 * Mirrors the @Versioning.removed decorator functionality.
 * @param targetType - The type of target being removed (e.g. "model", "enum", "operation", etc.)
 * @param targetName - The name of the target
 * @returns Formatted message string
 */
function removed(targetType: TargetType, targetName: string): string {
  return `Removed \`${targetName}\` ${targetType}`;
}

/**
 * Generate a message for when a model property is made required.
 * Mirrors the @Versioning.madeRequired decorator functionality.
 * @param targetName - The name of the property
 * @returns Formatted message string
 */
function madeRequired(targetName: string): string {
  return `Made \`${targetName}\` field required`;
}

/**
 * Generate a message for when a model property is made optional.
 * Mirrors the @Versioning.madeOptional decorator functionality.
 * @param targetName - The name of the property
 * @returns Formatted message string
 */
function madeOptional(targetName: string): string {
  return `Made \`${targetName}\` field optional`;
}

/**
 * Generate a message for when a target is renamed.
 * Mirrors the @Versioning.renamedFrom decorator functionality.
 * @param targetType - The type of target being renamed (e.g. "model", "enum", "operation", etc.)
 * @param oldName - The old name of the target
 * @param newName - The new name of the target
 * @returns Formatted message string
 */
function renamedFrom(
  targetType: TargetType,
  oldName: string,
  newName: string,
): string {
  return `Renamed ${targetType} from \`${oldName}\` to \`${newName}\``;
}

/**
 * Generate a message for when a model property type is changed.
 * Mirrors the @Versioning.typeChangedFrom decorator functionality.
 * @param targetName - The name of the property (e.g. "name", "email", "id", etc.)
 * @param oldType - The old type of the property
 * @param newType - The new type of the property
 * @returns Formatted message string
 */
function typeChangedFrom(
  targetName: string,
  oldType: string,
  newType: string,
): string {
  return `Changed \`${targetName}\` field type from \`${oldType}\` to \`${newType}\``;
}

/**
 * Generate a message for when an operation return type is changed.
 * Mirrors the @Versioning.returnTypeChangedFrom decorator functionality.
 * @param targetName - The name of the operation (e.g. "getUser", "createUser", "deleteUser", etc.)
 * @param oldType - The old return type
 * @param newType - The new return type
 * @returns Formatted message string
 */
function returnTypeChangedFrom(
  targetName: string,
  oldType: string,
  newType: string,
): string {
  return `Changed \`${targetName}\` return type from \`${oldType}\` to \`${newType}\``;
}

/**
 * Log utilities for generating consistent changelog messages.
 * These functions mirror the TypeSpec versioning decorators structure
 * and provide parameterized message generation for different types of schema changes.
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
