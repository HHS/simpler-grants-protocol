import type { OverrideMap } from "./types";

// =============================================================================
// PATH UTILITIES
// =============================================================================

/**
 * Translates a dotted property path into the JSON-Forms scope string used
 * inside a UI schema's Control elements.
 *
 * @example
 *   pathToScope("contact.name.firstName")
 *   // → "#/properties/contact/properties/name/properties/firstName"
 */
function pathToScope(dottedPath: string): string {
  const segments = dottedPath.split(".");
  return "#/" + segments.map((s) => `properties/${s}`).join("/");
}

// =============================================================================
// UI SCHEMA OVERRIDE MERGE
// =============================================================================

/** A node in a JSON-Forms UI schema (Control or Layout). */
type UiNode = Record<string, unknown> & {
  type?: string;
  scope?: string;
  elements?: UiNode[];
};

/**
 * Walks a UI-schema tree and yields every Control node along with a
 * direct reference so callers can patch in place. Layouts (Group,
 * VerticalLayout, etc.) are descended into via their `elements` arrays.
 */
function* walkControls(node: UiNode): Generator<UiNode> {
  if (typeof node.scope === "string") {
    yield node;
  }
  if (Array.isArray(node.elements)) {
    for (const child of node.elements) {
      yield* walkControls(child as UiNode);
    }
  }
}

/**
 * Returns a deep-cloned UI schema with per-path label / control overrides
 * applied. Each override key is a dotted property path that is converted
 * to the matching JSON-Forms `scope` string and looked up inside the tree.
 *
 * @throws Error when an override path resolves to a scope that does not
 *   appear anywhere in the base UI schema. This is intentional: silently
 *   dropping a mistyped path would leave the form unchanged with no
 *   feedback, which is exactly the failure mode the user wants surfaced.
 */
export function applyUiOverrides(
  baseUiSchema: Record<string, unknown>,
  overrides: OverrideMap | undefined,
): Record<string, unknown> {
  if (!overrides || Object.keys(overrides).length === 0) {
    return baseUiSchema;
  }

  const cloned = structuredClone(baseUiSchema) as UiNode;
  const controlsByScope = new Map<string, UiNode>();
  for (const control of walkControls(cloned)) {
    if (typeof control.scope === "string") {
      controlsByScope.set(control.scope, control);
    }
  }

  for (const [dottedPath, patch] of Object.entries(overrides)) {
    const scope = pathToScope(dottedPath);
    const control = controlsByScope.get(scope);
    if (!control) {
      throw new Error(
        `x-overrides.uiSchema path "${dottedPath}" (scope "${scope}") ` +
          `does not match any Control in the base UI schema.`,
      );
    }
    Object.assign(control, patch);
  }

  return cloned as Record<string, unknown>;
}

// =============================================================================
// MAPPING OVERRIDE MERGE
// =============================================================================

/**
 * Returns a deep-cloned mapping object with per-path leaf entries
 * replaced by the corresponding override values.
 *
 * Each override key is a dotted path into the nested mapping object;
 * the entire leaf entry at that path is replaced by the override value
 * (not shallow-merged), since a mapping leaf is a single semantic unit
 * (e.g. `{ field: "..." }` or a `{ switch: ... }` block).
 *
 * @throws Error when an override path does not resolve to an existing
 *   leaf in the base mapping.
 */
export function applyMappingOverrides(
  baseMapping: Record<string, unknown>,
  overrides: OverrideMap | undefined,
): Record<string, unknown> {
  if (!overrides || Object.keys(overrides).length === 0) {
    return baseMapping;
  }

  const cloned = structuredClone(baseMapping) as Record<string, unknown>;

  for (const [dottedPath, patch] of Object.entries(overrides)) {
    const segments = dottedPath.split(".");
    const lastSegment = segments[segments.length - 1];
    let cursor: Record<string, unknown> = cloned;

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      const next = cursor[segment];
      if (typeof next !== "object" || next === null) {
        throw new Error(
          `x-overrides mapping path "${dottedPath}" cannot be resolved: ` +
            `segment "${segment}" is not an object in the base mapping.`,
        );
      }
      cursor = next as Record<string, unknown>;
    }

    if (!(lastSegment in cursor)) {
      throw new Error(
        `x-overrides mapping path "${dottedPath}" cannot be resolved: ` +
          `key "${lastSegment}" is not present in the base mapping.`,
      );
    }
    cursor[lastSegment] = patch;
  }

  return cloned;
}
