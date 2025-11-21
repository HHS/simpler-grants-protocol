import { EmitContext, Model, ModelProperty } from "@typespec/compiler";
import {
  getAddedOnVersions,
  getRemovedOnVersions,
  getRenamedFrom,
  Version,
} from "@typespec/versioning";
import { Changelog, ChangeRecord } from "../types.js";
import {
  getOrCreateChanges,
  getNameAtVersion,
  getVersionString,
} from "./index.js";
import { Log } from "./logging.js";
import { TargetType } from "../types.js";

// #############################################################################
// # Public model logger
// #############################################################################

/**
 * Process all changelog entries for a model, including the model itself and its properties.
 * This function handles model additions/removals and property additions/removals/requirement changes.
 *
 * @param context - The emit context, with details about the compiled typespec code
 * @param model - The model being processed
 * @param allVersions - The list of available versions in the namespace
 * @param changelog - The main changelog object to which model changes are added
 *
 * @example Input typespec code:
 *
 * ```
 * @added(Versions.v1)
 * model User {
 *   name: string;
 *   @added(Versions.v2)
 *   email: string;
 *   @madeRequired(Versions.v3)
 *   id: string;
 * }
 * ```
 *
 * Results in:
 *
 * ```
 * {
 *   "User": [
 *     {
 *       "version": "v1",
 *       "changes": ["Schema created"]
 *     },
 *     {
 *       "version": "v2",
 *       "changes": ["Added `email` field"]
 *     },
 *     {
 *       "version": "v3",
 *       "changes": ["Made `id` field required"]
 *     }
 *   ]
 * }
 * ```
 */
export function logModelChanges(
  context: EmitContext,
  model: Model,
  allVersions: Version[],
  changelog: Changelog,
): void {
  const modelName = model.name;

  // Initialize logs for this schema if not exists
  if (!changelog.logs[modelName]) {
    changelog.logs[modelName] = {};
  }
  const modelLogs = changelog.logs[modelName];

  // Process model-level changes
  logModelAdditions(context, model, allVersions, modelLogs);
  logModelRemovals(context, model, modelLogs);
  logModelRenames(context, model, modelLogs);

  // Process model properties
  const properties = Array.from(model.properties.values()) as ModelProperty[];
  for (const property of properties) {
    logModelPropertyAdditions(context, property, modelLogs);
    logModelPropertyRemovals(context, property, modelLogs);
    logModelPropertyRenames(context, property, modelLogs);
    logModelPropertyMadeRequired(context, property, modelLogs);
    logModelPropertyMadeOptional(context, property, modelLogs);
  }

  // If no changes were logged, remove the empty entry
  if (Object.keys(modelLogs).length === 0) {
    delete changelog.logs[modelName];
  }
}

// #############################################################################
// # Model helpers
// #############################################################################

/**
 * Record a changelog entry each time the model was added to the namespace.
 */
function logModelAdditions(
  context: EmitContext,
  model: Model,
  allVersions: Version[],
  modelLogs: { [version: string]: ChangeRecord[] },
): void {
  const modelAddedVersions = getAddedOnVersions(context.program, model);
  const renamedFromData = getRenamedFrom(context.program, model);

  if (modelAddedVersions && modelAddedVersions.length > 0) {
    for (const version of modelAddedVersions) {
      const changes = getOrCreateChanges(modelLogs, getVersionString(version));
      const modelNameAtVersion = getNameAtVersion(
        model.name,
        version,
        renamedFromData,
      );
      changes.push(Log.added(TargetType.Model, modelNameAtVersion));
    }
  } else {
    // If no explicit @added, assume it was created in the first version
    const firstVersion = allVersions[0];
    if (firstVersion) {
      const changes = getOrCreateChanges(
        modelLogs,
        getVersionString(firstVersion),
      );
      const modelNameAtVersion = getNameAtVersion(
        model.name,
        firstVersion,
        renamedFromData,
      );
      changes.push(Log.added(TargetType.Model, modelNameAtVersion));
    }
  }
}

/**
 * Record a changelog entry each time the model was removed from the namespace.
 */
function logModelRemovals(
  context: EmitContext,
  model: Model,
  modelLogs: { [version: string]: ChangeRecord[] },
): void {
  const modelRemovedVersions = getRemovedOnVersions(context.program, model);
  const renamedFromData = getRenamedFrom(context.program, model);

  if (modelRemovedVersions && modelRemovedVersions.length > 0) {
    for (const version of modelRemovedVersions) {
      const changes = getOrCreateChanges(modelLogs, getVersionString(version));
      const modelNameAtVersion = getNameAtVersion(
        model.name,
        version,
        renamedFromData,
      );
      changes.push(Log.removed(TargetType.Model, modelNameAtVersion));
    }
  }
}

/**
 * Record a changelog entry each time the model was renamed.
 */
function logModelRenames(
  context: EmitContext,
  model: Model,
  modelLogs: { [version: string]: ChangeRecord[] },
): void {
  const renamedFromData = getRenamedFrom(context.program, model);
  if (renamedFromData && renamedFromData.length > 0) {
    // Sort by version index to maintain chronological order
    const sortedRenames = [...renamedFromData].sort(
      (a, b) => a.version.index - b.version.index,
    );

    for (let i = 0; i < sortedRenames.length; i++) {
      const rename = sortedRenames[i];
      const changes = getOrCreateChanges(
        modelLogs,
        getVersionString(rename.version),
      );

      // Determine the new name for this rename
      // For the last rename, the new name is the current model name
      // For intermediate renames, the new name is the old name of the next rename
      let newName: string;
      if (i === sortedRenames.length - 1) {
        newName = model.name;
      } else {
        newName = sortedRenames[i + 1].oldName;
      }

      changes.push(Log.renamedFrom(TargetType.Model, rename.oldName, newName));
    }
  }
}

// #############################################################################
// # Model property helpers
// #############################################################################

/**
 * Record a changelog entry each time a property was added to the model.
 */
function logModelPropertyAdditions(
  context: EmitContext,
  property: ModelProperty,
  modelLogs: { [version: string]: ChangeRecord[] },
): void {
  const propertyAddedVersions = getAddedOnVersions(context.program, property);
  const renamedFromData = getRenamedFrom(context.program, property);

  if (propertyAddedVersions && propertyAddedVersions.length > 0) {
    for (const version of propertyAddedVersions) {
      const changes = getOrCreateChanges(modelLogs, getVersionString(version));
      const propertyNameAtVersion = getNameAtVersion(
        property.name,
        version,
        renamedFromData,
      );
      changes.push(Log.added(TargetType.ModelProperty, propertyNameAtVersion));
    }
  }
}

/**
 * Record a changelog entry each time a property was removed from the model.
 */
function logModelPropertyRemovals(
  context: EmitContext,
  property: ModelProperty,
  modelLogs: { [version: string]: ChangeRecord[] },
): void {
  const propertyRemovedVersions = getRemovedOnVersions(
    context.program,
    property,
  );
  const renamedFromData = getRenamedFrom(context.program, property);

  if (propertyRemovedVersions && propertyRemovedVersions.length > 0) {
    for (const version of propertyRemovedVersions) {
      const changes = getOrCreateChanges(modelLogs, getVersionString(version));
      const propertyNameAtVersion = getNameAtVersion(
        property.name,
        version,
        renamedFromData,
      );
      changes.push(
        Log.removed(TargetType.ModelProperty, propertyNameAtVersion),
      );
    }
  }
}

/**
 * Record a changelog entry each time a property was made required in a specific version.
 */
function logModelPropertyMadeRequired(
  context: EmitContext,
  property: ModelProperty,
  modelLogs: { [version: string]: ChangeRecord[] },
): void {
  const propertyDecorators = property.decorators;
  if (propertyDecorators) {
    for (const decorator of propertyDecorators) {
      if (decorator.decorator.name === "$madeRequired") {
        const versionArg = decorator.args[0];
        if (
          versionArg &&
          versionArg.value &&
          "name" in versionArg.value &&
          typeof versionArg.value.name === "string"
        ) {
          // Check if the enum member has a string value (e.g., v1: "1.0.0")
          let versionName = versionArg.value.name;
          if (
            "value" in versionArg.value &&
            typeof versionArg.value.value === "string"
          ) {
            versionName = versionArg.value.value;
          }
          const changes = getOrCreateChanges(modelLogs, versionName);
          changes.push(Log.madeRequired(property.name));
        }
      }
    }
  }
}

/**
 * Record a changelog entry each time a property was made optional in a specific version.
 */
function logModelPropertyMadeOptional(
  context: EmitContext,
  property: ModelProperty,
  modelLogs: { [version: string]: ChangeRecord[] },
): void {
  const propertyDecorators = property.decorators;
  if (propertyDecorators) {
    for (const decorator of propertyDecorators) {
      if (decorator.decorator.name === "$madeOptional") {
        const versionArg = decorator.args[0];
        if (
          versionArg &&
          versionArg.value &&
          "name" in versionArg.value &&
          typeof versionArg.value.name === "string"
        ) {
          // Check if the enum member has a string value (e.g., v1: "1.0.0")
          let versionName = versionArg.value.name;
          if (
            "value" in versionArg.value &&
            typeof versionArg.value.value === "string"
          ) {
            versionName = versionArg.value.value;
          }
          const changes = getOrCreateChanges(modelLogs, versionName);
          changes.push(Log.madeOptional(property.name));
        }
      }
    }
  }
}

/**
 * Record a changelog entry each time a property was renamed.
 */
function logModelPropertyRenames(
  context: EmitContext,
  property: ModelProperty,
  modelLogs: { [version: string]: ChangeRecord[] },
): void {
  const renamedFromData = getRenamedFrom(context.program, property);
  if (renamedFromData && renamedFromData.length > 0) {
    // Sort by version index to maintain chronological order
    const sortedRenames = [...renamedFromData].sort(
      (a, b) => a.version.index - b.version.index,
    );

    for (let i = 0; i < sortedRenames.length; i++) {
      const rename = sortedRenames[i];
      const changes = getOrCreateChanges(
        modelLogs,
        getVersionString(rename.version),
      );

      // Determine the new name for this rename
      // For the last rename, the new name is the current property name
      // For intermediate renames, the new name is the old name of the next rename
      let newName: string;
      if (i === sortedRenames.length - 1) {
        newName = property.name;
      } else {
        newName = sortedRenames[i + 1].oldName;
      }

      changes.push(
        Log.renamedFrom(TargetType.ModelProperty, rename.oldName, newName),
      );
    }
  }
}
