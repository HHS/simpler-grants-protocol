import type { OverrideMap, UiNode } from "./types";

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
 * Returns the deepest common scope-segment prefix shared by all entries in
 * `scopes`, then strips a trailing `/properties` segment so the result
 * matches what `pathToScope` produces for the parent property name.
 *
 * @example
 *   commonScopePrefix([
 *     "#/properties/contact/properties/address/properties/street1",
 *     "#/properties/contact/properties/address/properties/city",
 *   ])
 *   // → "#/properties/contact/properties/address"
 */
function commonScopePrefix(scopes: string[]): string {
  if (scopes.length === 0) return "";
  const parts = scopes.map((s) => s.split("/"));
  const first = parts[0];
  let len = first.length;
  for (const p of parts.slice(1)) {
    let i = 0;
    while (i < len && i < p.length && first[i] === p[i]) i++;
    len = i;
  }
  const joined = first.slice(0, len).join("/");
  return joined.endsWith("/properties")
    ? joined.slice(0, -"/properties".length)
    : joined;
}

/**
 * Walks a UI-schema tree and yields [childScopePrefix, groupNode] for every
 * Group/Layout node. The child scope prefix is the common scope-segment
 * prefix of all Control nodes within the group, which equals the
 * `pathToScope()` result for the dotted path that should target the group.
 *
 * This lets callers look up a Group by the same dotted-path key they would
 * use for its children (e.g. `"contact.address"` finds the Group whose
 * Controls all live under `#/properties/contact/properties/address/…`).
 */
function* walkGroups(node: UiNode): Generator<[string, UiNode]> {
  const type = node.type as string | undefined;
  if (
    type !== "Group" &&
    type !== "VerticalLayout" &&
    type !== "HorizontalLayout"
  ) {
    return;
  }

  const childScopes: string[] = [];
  for (const control of walkControls(node)) {
    if (typeof control.scope === "string") {
      childScopes.push(control.scope);
    }
  }
  if (childScopes.length > 0) {
    const prefix = commonScopePrefix(childScopes);
    if (prefix) yield [prefix, node];
  }

  if (Array.isArray(node.elements)) {
    for (const child of node.elements) {
      yield* walkGroups(child as UiNode);
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

  // Build a secondary index of Group/Layout nodes keyed by the common scope
  // prefix of their descendant Controls. This allows a dotted path like
  // "contact.address" to target the "Mailing Address" Group that wraps those
  // Controls, rather than requiring individual Control overrides.
  const groupsByChildPrefix = new Map<string, UiNode>();
  for (const [prefix, group] of walkGroups(cloned)) {
    if (!groupsByChildPrefix.has(prefix)) {
      groupsByChildPrefix.set(prefix, group);
    }
  }

  for (const [dottedPath, patch] of Object.entries(overrides)) {
    const scope = pathToScope(dottedPath);
    const target = controlsByScope.get(scope) ?? groupsByChildPrefix.get(scope);
    if (!target) {
      throw new Error(
        `x-overrides.uiSchema path "${dottedPath}" (scope "${scope}") ` +
          `does not match any Control or Group in the base UI schema.`,
      );
    }
    Object.assign(target, patch);
  }

  return cloned as Record<string, unknown>;
}

// =============================================================================
// MAPPING OVERRIDE MERGE
// =============================================================================

/**
 * Returns a deep-cloned mapping object with per-path field entries
 * replaced by the corresponding override values.
 *
 * Each override key is a dotted path into the nested mapping object;
 * the entire field entry at that path is replaced by the override value
 * (not shallow-merged), since a mapping field entry is a single
 * semantic unit (e.g. `{ field: "..." }` or a `{ switch: ... }` block).
 *
 * @throws Error when an override path does not resolve to an existing
 *   entry in the base mapping.
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
