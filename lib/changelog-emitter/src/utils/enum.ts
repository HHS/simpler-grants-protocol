import { EmitContext, Enum, EnumMember } from "@typespec/compiler";
import {
  getAddedOnVersions,
  getRemovedOnVersions,
  Version,
} from "@typespec/versioning";
import { Changelog, ChangeRecord } from "../types.js";
import { getOrCreateChanges, getVersionString } from "./index.js";
import { Log } from "./logging.js";
import { TargetType } from "../types.js";

// #############################################################################
// # Public enum logger
// #############################################################################

/**
 * Process all changelog entries for an enum, including the enum itself and its members.
 * This function handles enum additions/removals and member additions/removals.
 *
 * @param context - The emit context, with details about the compiled typespec code
 * @param enumType - The enum being processed
 * @param allVersions - The list of available versions in the namespace
 * @param changelog - The main changelog object to which enum changes are added
 *
 * @example Input typespec code:
 *
 * ```
 * @added(Versions.v1)
 * enum Status {
 *   Active,
 *   @added(Versions.v2)
 *   Pending,
 *   @removed(Versions.v2)
 *   Archived,
 *   Inactive
 * }
 * ```
 *
 * Results in:
 *
 * ```
 * {
 *   "Status": [
 *     {
 *       "version": "v1",
 *       "changes": ["Enum created"]
 *     },
 *     {
 *       "version": "v2",
 *       "changes": ["Added `Pending` member", "Removed `Archived` member"]
 *     },
 *   ]
 * }
 * ```
 */
export function logEnumChanges(
  context: EmitContext,
  enumType: Enum,
  allVersions: Version[],
  changelog: Changelog,
): void {
  // Skip the Versions enum
  if (enumType.name === "Versions") {
    return;
  }

  const enumName = enumType.name;

  // Initialize logs for this schema if not exists
  if (!changelog.logs[enumName]) {
    changelog.logs[enumName] = {};
  }
  const enumLogs = changelog.logs[enumName];

  // Process enum-level changes
  logEnumAdditions(context, enumType, allVersions, enumLogs);
  logEnumRemovals(context, enumType, enumLogs);

  // Process enum members
  const members = Array.from(enumType.members.values()) as EnumMember[];
  for (const member of members) {
    logEnumMemberAdditions(context, member, enumLogs);
    logEnumMemberRemovals(context, member, enumLogs);
  }

  // If no changes were logged, remove the empty entry
  if (Object.keys(enumLogs).length === 0) {
    delete changelog.logs[enumName];
  }
}

// #############################################################################
// # Enum helpers
// #############################################################################

/**
 * Record a changelog entry each time the enum was added to the namespace.
 */
function logEnumAdditions(
  context: EmitContext,
  enumType: Enum,
  allVersions: Version[],
  enumLogs: { [version: string]: ChangeRecord[] },
): void {
  const enumAddedVersions = getAddedOnVersions(context.program, enumType);

  if (enumAddedVersions && enumAddedVersions.length > 0) {
    for (const version of enumAddedVersions) {
      const changes = getOrCreateChanges(enumLogs, getVersionString(version));
      changes.push(Log.added(TargetType.Enum, enumType.name));
    }
  } else {
    // If no explicit @added, assume it was created in the first version
    const firstVersion = allVersions[0];
    if (firstVersion) {
      const changes = getOrCreateChanges(
        enumLogs,
        getVersionString(firstVersion),
      );
      changes.push(Log.added(TargetType.Enum, enumType.name));
    }
  }
}

/**
 * Record a changelog entry each time the enum was removed from the namespace.
 */
function logEnumRemovals(
  context: EmitContext,
  enumType: Enum,
  enumLogs: { [version: string]: ChangeRecord[] },
): void {
  const enumRemovedVersions = getRemovedOnVersions(context.program, enumType);
  if (enumRemovedVersions && enumRemovedVersions.length > 0) {
    for (const version of enumRemovedVersions) {
      const changes = getOrCreateChanges(enumLogs, getVersionString(version));
      changes.push(Log.removed(TargetType.Enum, enumType.name));
    }
  }
}

// #############################################################################
// # Enum member helpers
// #############################################################################

/**
 * Record a changelog entry each time a member was added to the enum.
 */
function logEnumMemberAdditions(
  context: EmitContext,
  member: EnumMember,
  enumLogs: { [version: string]: ChangeRecord[] },
): void {
  const memberAddedVersions = getAddedOnVersions(context.program, member);
  if (memberAddedVersions && memberAddedVersions.length > 0) {
    for (const version of memberAddedVersions) {
      const changes = getOrCreateChanges(enumLogs, getVersionString(version));
      changes.push(Log.added(TargetType.EnumMember, member.name));
    }
  }
}

/**
 * Record a changelog entry each time a member was removed from the enum.
 */
function logEnumMemberRemovals(
  context: EmitContext,
  member: EnumMember,
  enumLogs: { [version: string]: ChangeRecord[] },
): void {
  const memberRemovedVersions = getRemovedOnVersions(context.program, member);
  if (memberRemovedVersions && memberRemovedVersions.length > 0) {
    for (const version of memberRemovedVersions) {
      const changes = getOrCreateChanges(enumLogs, getVersionString(version));
      changes.push(Log.removed(TargetType.EnumMember, member.name));
    }
  }
}
