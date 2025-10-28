import {
  EmitContext,
  emitFile,
  resolvePath,
  Model,
  Namespace,
  Enum,
} from "@typespec/compiler";
import { getAllVersions, Version } from "@typespec/versioning";
import { Changelog } from "./types.js";
import { logModelChanges } from "./utils/model.js";
import { logEnumChanges } from "./utils/enum.js";

const changelogPath = "changelog.json";

// #############################################################################
// # Public functions
// #############################################################################

/**
 * Generate a changelog for a given namespace and all its sub-namespaces.
 * @param context - The emit context
 * @param namespace - The namespace to generate a changelog for
 * @param parentVersions - Optional parent namespace versions to inherit
 * @returns The changelog
 */
export function generateChangelog(
  context: EmitContext,
  namespace: Namespace,
  parentVersions?: Version[],
): Changelog {
  const changelog: Changelog = {};

  // Try to get versions for this namespace, or use parent versions
  let allVersions = getAllVersions(context.program, namespace);
  if (!allVersions && parentVersions) {
    allVersions = parentVersions;
  }

  if (!allVersions) {
    // If no versions found, still process sub-namespaces recursively
    const subNamespaces = Array.from(
      namespace.namespaces.values(),
    ) as Namespace[];
    for (const subNamespace of subNamespaces) {
      const subChangelog = generateChangelog(
        context,
        subNamespace,
        parentVersions,
      );
      // Merge sub-namespace changelog into main changelog
      for (const [schemaName, entries] of Object.entries(subChangelog)) {
        changelog[schemaName] = entries;
      }
    }
    return changelog;
  }

  // Process models in current namespace
  const models = Array.from(namespace.models.values()) as Model[];
  for (const model of models) {
    logModelChanges(context, model, allVersions, changelog);
  }

  // Process enums in current namespace (excluding Versions enum)
  const enums = Array.from(namespace.enums.values()) as Enum[];
  for (const enumType of enums) {
    logEnumChanges(context, enumType, allVersions, changelog);
  }

  // Recursively process sub-namespaces, passing down the versions
  const subNamespaces = Array.from(
    namespace.namespaces.values(),
  ) as Namespace[];
  for (const subNamespace of subNamespaces) {
    const subChangelog = generateChangelog(context, subNamespace, allVersions);
    // Merge sub-namespace changelog into main changelog
    for (const [schemaName, entries] of Object.entries(subChangelog)) {
      changelog[schemaName] = entries;
    }
  }

  return changelog;
}

export async function $onEmit(context: EmitContext) {
  const globalNamespace = context.program.getGlobalNamespaceType();
  const topLevelNamespaces = Array.from(globalNamespace.namespaces.values());

  // Collect changelogs from all namespaces into a single changelog
  const combinedChangelog: Changelog = {};

  // Iterate through all top-level namespaces (excluding the global TypeSpec namespace)
  for (const namespace of topLevelNamespaces) {
    // Skip the global TypeSpec namespace
    if (namespace.name === "TypeSpec") {
      continue;
    }

    // Generate changelog for this namespace and all its sub-namespaces
    const changelog = generateChangelog(context, namespace);

    // Merge this namespace's changelog into the combined changelog
    for (const [schemaName, entries] of Object.entries(changelog)) {
      combinedChangelog[schemaName] = entries;
    }
  }

  // Emit the combined changelog as a single file
  await emitFile(context.program, {
    path: resolvePath(context.emitterOutputDir, changelogPath),
    content: JSON.stringify(combinedChangelog, null, 2),
  });
}
