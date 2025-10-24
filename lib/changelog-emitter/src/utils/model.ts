import { EmitContext, Model, ModelProperty } from "@typespec/compiler";
import {
  getAddedOnVersions,
  getRemovedOnVersions,
  Version,
} from "@typespec/versioning";
import { ChangelogEntry } from "../types.js";
import { getOrCreateEntry } from "./index.js";
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
  changelog: { [schemaName: string]: ChangelogEntry[] },
): void {
  const modelName = model.name;
  const modelChangelog: ChangelogEntry[] = [];

  // Process model-level changes
  logModelAdditions(context, model, allVersions, modelChangelog);
  logModelRemovals(context, model, modelChangelog);

  // Process model properties
  const properties = Array.from(model.properties.values()) as ModelProperty[];
  for (const property of properties) {
    logModelPropertyAdditions(context, property, modelChangelog);
    logModelPropertyRemovals(context, property, modelChangelog);
    logModelPropertyMadeRequired(context, property, modelChangelog);
    logModelPropertyMadeOptional(context, property, modelChangelog);
  }

  // Only include models that have changes
  if (modelChangelog.length > 0) {
    // Sort by version index to maintain order
    modelChangelog.sort((a, b) => {
      const versionA = allVersions.find((v) => v.name === a.version);
      const versionB = allVersions.find((v) => v.name === b.version);
      return (versionA?.index || 0) - (versionB?.index || 0);
    });

    changelog[modelName] = modelChangelog;
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
  modelChangelog: ChangelogEntry[],
): void {
  const modelAddedVersions = getAddedOnVersions(context.program, model);

  if (modelAddedVersions && modelAddedVersions.length > 0) {
    for (const version of modelAddedVersions) {
      const entry = getOrCreateEntry(modelChangelog, version.name);
      entry.changes.push(Log.added(TargetType.Model, model.name));
    }
  } else {
    // If no explicit @added, assume it was created in the first version
    const firstVersion = allVersions[0];
    if (firstVersion) {
      const entry = getOrCreateEntry(modelChangelog, firstVersion.name);
      entry.changes.push(Log.added(TargetType.Model, model.name));
    }
  }
}

/**
 * Record a changelog entry each time the model was removed from the namespace.
 */
function logModelRemovals(
  context: EmitContext,
  model: Model,
  modelChangelog: ChangelogEntry[],
): void {
  const modelRemovedVersions = getRemovedOnVersions(context.program, model);
  if (modelRemovedVersions && modelRemovedVersions.length > 0) {
    for (const version of modelRemovedVersions) {
      const entry = getOrCreateEntry(modelChangelog, version.name);
      entry.changes.push(Log.removed(TargetType.Model, model.name));
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
  modelChangelog: ChangelogEntry[],
): void {
  const propertyAddedVersions = getAddedOnVersions(context.program, property);
  if (propertyAddedVersions && propertyAddedVersions.length > 0) {
    for (const version of propertyAddedVersions) {
      const entry = getOrCreateEntry(modelChangelog, version.name);
      entry.changes.push(Log.added(TargetType.ModelProperty, property.name));
    }
  }
}

/**
 * Record a changelog entry each time a property was removed from the model.
 */
function logModelPropertyRemovals(
  context: EmitContext,
  property: ModelProperty,
  modelChangelog: ChangelogEntry[],
): void {
  const propertyRemovedVersions = getRemovedOnVersions(
    context.program,
    property,
  );
  if (propertyRemovedVersions && propertyRemovedVersions.length > 0) {
    for (const version of propertyRemovedVersions) {
      const entry = getOrCreateEntry(modelChangelog, version.name);
      entry.changes.push(Log.removed(TargetType.ModelProperty, property.name));
    }
  }
}

/**
 * Record a changelog entry each time a property was made required in a specific version.
 */
function logModelPropertyMadeRequired(
  context: EmitContext,
  property: ModelProperty,
  modelChangelog: ChangelogEntry[],
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
          const versionName = versionArg.value.name;
          const entry = getOrCreateEntry(modelChangelog, versionName);
          entry.changes.push(Log.madeRequired(property.name));
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
  modelChangelog: ChangelogEntry[],
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
          const versionName = versionArg.value.name;
          const entry = getOrCreateEntry(modelChangelog, versionName);
          entry.changes.push(Log.madeOptional(property.name));
        }
      }
    }
  }
}
