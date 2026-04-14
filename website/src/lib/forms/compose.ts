/**
 * Helpers that synthesize a form-level x-ui-schema and x-mapping-* from the
 * extensions declared on the form's composed properties (typically QB
 * questions referenced via $ref). The form spec author declares the
 * properties; the loader composes their UI schemas and mappings instead of
 * forcing the author to redeclare them.
 *
 * The loader prefers an explicitly-declared form-level x-ui-schema /
 * x-mapping-* over the synthesized version, so simple forms with no
 * composition (like the canary) keep working unchanged.
 */

import type { UiNode } from "./types";

// =============================================================================
// UI SCHEMA COMPOSITION
// =============================================================================

/**
 * Returns a deep-cloned UI subtree with every Control's `scope` re-prefixed
 * so it sits under `#/properties/<propName>/...` instead of `#/properties/...`.
 *
 * Used when lifting a child question's UI schema into a parent form's
 * composed UI schema.
 */
function rescopeUi(node: UiNode, propName: string): UiNode {
  const cloned = structuredClone(node);
  const visit = (n: UiNode): void => {
    if (typeof n.scope === "string" && n.scope.startsWith("#/")) {
      // "#/properties/X/..." -> "#/properties/<propName>/properties/X/..."
      n.scope = `#/properties/${propName}/${n.scope.slice(2)}`;
    }
    if (Array.isArray(n.elements)) {
      for (const child of n.elements) visit(child as UiNode);
    }
  };
  visit(cloned);
  return cloned;
}

/**
 * Synthesizes a form-level VerticalLayout from each property's `x-ui-schema`.
 *
 * Properties that carry their own `x-ui-schema` (typically QB questions
 * referenced via $ref) are lifted in as nested elements, re-scoped to sit
 * under their property name. Properties without `x-ui-schema` (atomic
 * types like `string` with `@example`) get a default Control referencing
 * the property's scope.
 */
export function composeUiSchema(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const elements: UiNode[] = [];
  for (const [propName, propSchema] of Object.entries(properties)) {
    if (typeof propSchema !== "object" || propSchema === null) continue;
    const childUi = (propSchema as Record<string, unknown>)["x-ui-schema"];
    if (typeof childUi === "object" && childUi !== null) {
      elements.push(rescopeUi(childUi as UiNode, propName));
    } else {
      elements.push({
        type: "Control",
        scope: `#/properties/${propName}`,
      });
    }
  }
  return { type: "VerticalLayout", elements };
}

// =============================================================================
// MAPPING COMPOSITION
// =============================================================================

/**
 * Deep-merges `source` into `target` (mutating `target`). Object values are
 * merged recursively; non-object values from `source` overwrite `target`.
 */
function deepMergeInto(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (
      value !== null &&
      existing !== null &&
      typeof value === "object" &&
      typeof existing === "object" &&
      !Array.isArray(value) &&
      !Array.isArray(existing)
    ) {
      deepMergeInto(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      target[key] = value;
    }
  }
}

/**
 * Synthesizes a form-level `x-mapping-from-cg` by nesting each property's
 * own `x-mapping-from-cg` under its property name.
 *
 * Each child mapping's keys describe paths relative to that child's
 * structure. Nesting them under the property name makes them relative to
 * the parent form.
 *
 * The field entry values are CommonGrants data-model paths (e.g.
 * `organizations.primary.name`) and stay unchanged, since they always
 * reference the same place in the CG model regardless of where the
 * question sits in the form.
 *
 * @example
 * // Given a form with `org: QuestionOrgName` whose x-mapping-from-cg is:
 * //   { name: { field: "organizations.primary.name" } }
 * //
 * // composeMappingFromCg produces:
 * //   { org: { name: { field: "organizations.primary.name" } } }
 * //
 * // The form-side key changed (name -> org.name) but the CG-side
 * // value ("organizations.primary.name") stayed the same.
 */
export function composeMappingFromCg(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [propName, propSchema] of Object.entries(properties)) {
    if (typeof propSchema !== "object" || propSchema === null) continue;
    const childMapping = (propSchema as Record<string, unknown>)[
      "x-mapping-from-cg"
    ];
    if (typeof childMapping !== "object" || childMapping === null) continue;
    result[propName] = structuredClone(childMapping);
  }
  return result;
}

/**
 * Walks a mapping subtree and rewrites every `field: "<path>"` (and the
 * `field` inside any `switch` block) to be relative to the parent property
 * by prefixing the path with `<propName>.`.
 */
function rewriteFieldRefs(node: unknown, propName: string): unknown {
  if (typeof node !== "object" || node === null) return node;
  if (Array.isArray(node)) {
    return node.map((n) => rewriteFieldRefs(n, propName));
  }
  const obj = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "field" && typeof value === "string") {
      out[key] = `${propName}.${value}`;
    } else if (
      key === "switch" &&
      typeof value === "object" &&
      value !== null
    ) {
      const sw = value as Record<string, unknown>;
      out[key] = {
        ...sw,
        ...(typeof sw.field === "string"
          ? { field: `${propName}.${sw.field}` }
          : {}),
      };
    } else {
      out[key] = rewriteFieldRefs(value, propName);
    }
  }
  return out;
}

/**
 * Synthesizes a form-level `x-mapping-to-cg` by deep-merging each property's
 * own `x-mapping-to-cg`, with `field` references rewritten to be
 * relative to the parent form.
 *
 * The top-level keys in each child mapping are CommonGrants data-model
 * paths (e.g. `organizations.primary.name`); these stay as written
 * because the CG model is the same regardless of form structure. Only
 * the form-side paths inside `field` (or `switch.field`) entries get
 * re-prefixed with the property name.
 *
 * When multiple properties contribute to the same CG path tree (e.g.
 * both `org` and `contact` write under `contacts`), their sub-trees are
 * deep-merged so no CG path is lost.
 *
 * @example
 * // Given a form with `org: QuestionOrgName` whose x-mapping-to-cg is:
 * //   { organizations: { primary: { name: { field: "name" } } } }
 * //
 * // composeMappingToCg produces:
 * //   { organizations: { primary: { name: { field: "org.name" } } } }
 * //
 * // The CG-side keys stayed the same. The form-side field reference
 * // ("name") became "org.name" because it's now relative to the
 * // form root.
 */
export function composeMappingToCg(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [propName, propSchema] of Object.entries(properties)) {
    if (typeof propSchema !== "object" || propSchema === null) continue;
    const childMapping = (propSchema as Record<string, unknown>)[
      "x-mapping-to-cg"
    ];
    if (typeof childMapping !== "object" || childMapping === null) continue;
    const rewritten = rewriteFieldRefs(childMapping, propName) as Record<
      string,
      unknown
    >;
    deepMergeInto(result, rewritten);
  }
  return result;
}
