export { $onEmit } from "../emitter.js";
export { $lib } from "../lib.js";

import { TargetType } from "../types.js";

/**
 * Log namespace for generating consistent changelog messages.
 * These functions mirror the TypeSpec versioning decorators structure
 * and provide parameterized message generation for different types of schema changes.
 * Based on https://typespec.io/docs/libraries/versioning/reference/decorators/
 */
export namespace Log {
  /**
   * Generate a message for when a target is added.
   * Mirrors the @Versioning.added decorator functionality.
   * @param targetType - The type of target being added
   * @param targetName - The name of the target
   * @returns Formatted message string
   */
  export function added(targetType: TargetType, targetName: string): string {
    // Special case for Schema types (Model and Enum)
    if (targetType === "Schema") {
      return "Schema created";
    }

    // For all other types, use the template with the targetType value
    return `Added \`${targetName}\` ${targetType}`;
  }

  /**
   * Generate a message for when a target is removed.
   * Mirrors the @Versioning.removed decorator functionality.
   * @param targetType - The type of target being removed
   * @param targetName - The name of the target
   * @returns Formatted message string
   */
  export function removed(targetType: TargetType, targetName: string): string {
    // Special case for Schema types (Model and Enum)
    if (targetType === "Schema") {
      return "Removed schema";
    }

    // For all other types, use the template with the targetType value
    return `Removed \`${targetName}\` ${targetType}`;
  }

  /**
   * Generate a message for when a model property is made required.
   * Mirrors the @Versioning.madeRequired decorator functionality.
   * @param targetName - The name of the property
   * @returns Formatted message string
   */
  export function madeRequired(targetName: string): string {
    return `Made \`${targetName}\` field required`;
  }

  /**
   * Generate a message for when a model property is made optional.
   * Mirrors the @Versioning.madeOptional decorator functionality.
   * @param targetName - The name of the property
   * @returns Formatted message string
   */
  export function madeOptional(targetName: string): string {
    return `Made \`${targetName}\` field optional`;
  }

  /**
   * Generate a message for when a target is renamed.
   * Mirrors the @Versioning.renamedFrom decorator functionality.
   * @param targetType - The type of target being renamed
   * @param oldName - The old name of the target
   * @param newName - The new name of the target
   * @returns Formatted message string
   */
  export function renamedFrom(
    targetType: TargetType,
    oldName: string,
    newName: string
  ): string {
    // For all types, use the template with the targetType value
    return `Renamed ${targetType} from \`${oldName}\` to \`${newName}\``;
  }

  /**
   * Generate a message for when a model property type is changed.
   * Mirrors the @Versioning.typeChangedFrom decorator functionality.
   * @param targetName - The name of the property
   * @param oldType - The old type of the property
   * @param newType - The new type of the property
   * @returns Formatted message string
   */
  export function typeChangedFrom(
    targetName: string,
    oldType: string,
    newType: string
  ): string {
    return `Changed \`${targetName}\` field type from \`${oldType}\` to \`${newType}\``;
  }

  /**
   * Generate a message for when an operation return type is changed.
   * Mirrors the @Versioning.returnTypeChangedFrom decorator functionality.
   * @param targetName - The name of the operation
   * @param oldType - The old return type
   * @param newType - The new return type
   * @returns Formatted message string
   */
  export function returnTypeChangedFrom(
    targetName: string,
    oldType: string,
    newType: string
  ): string {
    return `Changed \`${targetName}\` return type from \`${oldType}\` to \`${newType}\``;
  }
}
