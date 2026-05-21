/**
 * Mapping-runtime utilities for declarative bidirectional transforms.
 *
 * Mirrors the Python SDK's `common_grants_sdk.utils.transformation` so the
 * two PoC ports share semantics. Used by `buildTransforms()` in
 * `./transforms`. Re-exported by `./index`.
 *
 * Handler conventions follow ADR-0017 (mapping format).
 *
 * @module @common-grants/sdk/extensions
 */

import type { Handler } from "./types";

// ############################################################################
// Public utilities - getFromPath, handlers, transformFromMapping
// ############################################################################

/**
 * Extract a value from an object using dot-notation.
 *
 * Walks the path through nested objects. Returns the default when any
 * intermediate step is missing or non-object.
 *
 * @example
 * ```ts
 * getFromPath({ a: { b: 1 } }, "a.b");        // 1
 * getFromPath({ a: { b: 1 } }, "a.c");        // undefined
 * getFromPath({ a: 1 }, "");                   // { a: 1 }   (empty path returns input)
 * ```
 */
export function getFromPath<T = unknown>(
  data: unknown,
  path: string,
  defaultValue: T | undefined = undefined
): T | undefined {
  if (path === "") return data as T;
  const parts = path.split(".");
  let cursor: unknown = data;
  for (const part of parts) {
    // `hasOwnProperty` not `in` — `in` walks the prototype chain, so an
    // attacker-controlled field path of `__proto__` would resolve to
    // `Object.prototype`. Mapping field paths can come from untrusted sources
    // via `mergeExtensions()` (ADR-0022 Decision #8).
    if (
      typeof cursor === "object" &&
      cursor !== null &&
      Object.prototype.hasOwnProperty.call(cursor, part)
    ) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return defaultValue;
    }
  }
  return cursor as T;
}

/**
 * `field` handler — pluck a value by dot-notation path.
 */
export function fieldValue(data: unknown, fieldPath: unknown): unknown {
  return getFromPath(data, String(fieldPath ?? ""));
}

/**
 * `const` handler — return a fixed literal value, ignoring source data.
 */
export function constValue(_data: unknown, value: unknown): unknown {
  return value;
}

/**
 * `match` / `switch` handler — case-based lookup on a field's value.
 *
 * Spec shape: `{ field: "path", case: { sourceValue: targetValue, ... }, default?: any }`.
 * Returns the mapped value if `data[field]` is a `case` key, otherwise `default`
 * (or undefined when no default is provided).
 *
 * Only string source values are candidate lookup keys: a non-string `val`
 * short-circuits to `default`. `case: { "1": "yes" }` does not match a source
 * value of `1`. Authors who need to map non-string source values should coerce
 * upstream (e.g. via a custom handler that `String()`-coerces before
 * dispatching `match`).
 *
 * A missing field resolves to `undefined` via `getFromPath`, which fails the
 * string-only guard and falls through to `default`. To distinguish "field
 * absent" from "field present and equal to undefined," guard upstream.
 *
 * If `field` is omitted or `""`, `getFromPath` returns the entire `data`
 * object — non-string, so the handler falls back to `default`. A `match` spec
 * with no `field` is functionally equivalent to `const: <default>`; prefer
 * `const` for clarity when the constant case is what you want.
 *
 * Cross-SDK divergence: Python's PoC uses bare `dict.get(val, default)` —
 * it accepts non-string `val` natively (though string-keyed `case` entries
 * still miss), and a non-dict `spec` crashes generically via `AttributeError`
 * on `.get()`. TS fails loud explicitly with a descriptive error in both
 * cases (cf. #810 for parallel Python proposal).
 *
 * `match` is the canonical handler name (ADR-0017); `switch` is kept as an
 * alias for backward compatibility (ADR-0022 Decision #3).
 *
 * @throws Error when `spec` is not a non-null object. The walker wraps this
 *   as a `HandlerError`; `buildTransforms` surfaces it as a `PluginError`
 *   with `handler: "match"`.
 */
export function switchOnValue(data: unknown, spec: unknown): unknown {
  if (typeof spec !== "object" || spec === null || Array.isArray(spec)) {
    throw new Error("match/switch handler: spec must be an object");
  }
  const s = spec as { field?: string; case?: Record<string, unknown>; default?: unknown };
  const val = getFromPath(data, s.field ?? "");
  const lookup = s.case ?? {};
  if (typeof val === "string" && Object.prototype.hasOwnProperty.call(lookup, val)) {
    return lookup[val];
  }
  return s.default;
}

/**
 * `numberToString` handler — pluck a value and coerce it to string via `String()`.
 *
 * Returns undefined if the path resolves to null/undefined (no string coercion
 * applied — `String(null)` would otherwise produce the literal "null").
 *
 * The handler is named for its primary use case (numeric source values) but the
 * coercion is `String()`, so booleans (`"true"` / `"false"`), arrays
 * (`"a,b,c"`), and other non-null values pass through unchanged. Plugin authors
 * who need strict number-only behavior should validate the source value before
 * the handler runs (e.g. via a custom handler) or use `field` plus a downstream
 * Zod check.
 */
export function numberToString(data: unknown, fieldPath: unknown): string | undefined {
  const val = getFromPath(data, String(fieldPath ?? ""));
  return val === null || val === undefined ? undefined : String(val);
}

/**
 * `stringToNumber` handler — pluck a value, coerce to an integer when the
 * string is a pure integer, otherwise fall back to a general `Number()`
 * coercion. Non-numeric inputs throw.
 *
 * Returns `undefined` when the source path is missing or resolves to
 * `null`/`undefined` (no throw — parallels `numberToString`).
 *
 * Divergences from Python's `int(s)` semantics, both intentional:
 *
 * - `int("42.0")` raises `ValueError` in Python; this handler falls through
 *   to `Number(s)` and returns `42`. Plugin authors porting a handler that
 *   relies on the Python behavior should add their own decimal-rejecting regex.
 * - Python's `int()` is arbitrary precision; JavaScript numbers are IEEE 754
 *   doubles with a safe-integer ceiling of `Number.MAX_SAFE_INTEGER`
 *   (2^53 − 1). An integer-shaped string outside that range cannot be
 *   represented without precision loss, so this handler throws rather than
 *   silently returning a corrupted value. Plugin authors round-tripping
 *   64-bit IDs should declare the field as a string (and skip this handler)
 *   or write a custom handler that returns a `BigInt`.
 *
 * Empty and whitespace-only strings throw — `Number("")` and `Number("  ")`
 * both coerce to `0` in JavaScript, which would silently turn an
 * implicit-absent CSV cell into a real zero on the transformed side.
 * Callers who want absent input to surface as `undefined` should null the
 * field upstream.
 */
export function stringToNumber(data: unknown, fieldPath: unknown): number | undefined {
  const val = getFromPath(data, String(fieldPath ?? ""));
  if (val === null || val === undefined) return undefined;
  const s = String(val).trim();
  // Empty / whitespace-only strings would otherwise coerce to 0 via `Number()`.
  if (s === "") {
    throw new Error("stringToNumber: cannot convert source value to a number");
  }
  // Integer-shaped strings parse as integers (Python `int(s)` parity);
  // anything else falls through to `Number(s)`. The integer branch is
  // intentional even though `Number(s)` would handle integer inputs too —
  // it pins the int-vs-float distinction at the call site.
  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    // Outside the safe-integer range, `Number(s)` silently loses precision
    // (e.g. `"9999999999999999999"` → `1e19`). Reject rather than corrupt.
    if (Number.isFinite(n) && Number.isSafeInteger(n)) return n;
    throw new Error("stringToNumber: cannot convert source value to a number");
  }
  const f = Number(s);
  if (Number.isFinite(f)) return f;
  // Don't embed the source value in the error message — it could be PII when
  // transforming applicant data. The handler name and cause flow into
  // `PluginError` separately for programmatic reasoning. Adopters who need
  // the offending value can still read it from `PluginError.sourceValue`
  // (which carries its own PII warning).
  throw new Error("stringToNumber: cannot convert source value to a number");
}

/**
 * Raised when a handler function throws. Carries the handler name for attribution.
 *
 * `buildTransforms()` catches this and wraps it as a `PluginError`, so callers
 * of the public `toCommon` / `fromCommon` pair will not see `HandlerError`
 * directly. The class is **internal**: not re-exported from the package barrel,
 * not part of the published `package.json` `exports` map, and not a supported
 * import path for adopters. Tests that drive `transformFromMapping` itself
 * import it from the source file for `instanceof` checks; consumers of
 * `transformFromMapping()` through the public surface should treat thrown
 * values as plain `Error`s.
 */
export class HandlerError extends Error {
  readonly handler: string;
  readonly cause: unknown;
  constructor(handler: string, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "HandlerError";
    this.handler = handler;
    this.cause = cause;
  }
}

/**
 * Registry of built-in mapping handlers.
 *
 * `match` is the canonical name per ADR-0017; `switch` is an alias kept for
 * backward compatibility (ADR-0022 Decision #3) — both point at the same
 * handler function.
 */
export const DEFAULT_HANDLERS: Readonly<Record<string, Handler>> = Object.freeze({
  const: constValue,
  field: fieldValue,
  match: switchOnValue,
  numberToString,
  stringToNumber,
  switch: switchOnValue,
});

/**
 * Default recursion-depth cap shared between `transformFromMapping` (runtime
 * walk) and `validateMapping` (build-time walk) so the two stay in sync if
 * the cap is ever bumped — a divergence would let an adversarial mapping pass
 * build-time validation but blow the stack at runtime.
 */
export const DEFAULT_MAX_TRANSFORM_DEPTH = 500;

/**
 * Options for {@link transformFromMapping}.
 */
export interface TransformFromMappingOptions {
  /** Handler registry. Defaults to {@link DEFAULT_HANDLERS}. */
  handlers?: Record<string, Handler>;
  /** Maximum recursion depth. Defaults to {@link DEFAULT_MAX_TRANSFORM_DEPTH}. */
  maxDepth?: number;
}

/**
 * Transform a data object according to an ADR-0017 mapping spec.
 *
 * The mapping is a nested object where:
 * - Primitive leaves (string, number, boolean, null) pass through as literals.
 * - Object nodes whose first key is a registered handler dispatch to that
 *   handler with `(data, handlerArg)`. The handler's return value is the
 *   transformed node. Sibling keys on a handler-dispatch node are silently
 *   ignored — only the first key is read. `{ field: "x", const: "fallback" }`
 *   silently drops `const`. Both this walker and `buildTransforms()`'s
 *   build-time `validateMapping` accept this shape; Python's PoC has the
 *   same first-key-wins behavior, so cross-SDK mapping JSON behaves
 *   identically.
 * - Object nodes whose first key is not a handler are treated as output
 *   shapes — each child is transformed recursively.
 *
 * @example
 * ```ts
 * transformFromMapping(
 *   { opportunity_status: "posted", opportunity_amount: 1000 },
 *   {
 *     status: { field: "opportunity_status" },
 *     amount: { value: { field: "opportunity_amount" }, currency: "USD" },
 *   }
 * );
 * // => { status: "posted", amount: { value: 1000, currency: "USD" } }
 * ```
 *
 * @throws Error when recursion exceeds `maxDepth`.
 * @throws Error when an output field name is literally `__proto__` (rejected
 *   to prevent prototype-chain mutation under bracket-assign).
 * @throws {@link HandlerError} when a registered handler throws.
 */
export function transformFromMapping(
  data: unknown,
  mapping: unknown,
  options: TransformFromMappingOptions = {}
): unknown {
  const handlers = options.handlers ?? DEFAULT_HANDLERS;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_TRANSFORM_DEPTH;

  const transformNode = (node: unknown, depth: number): unknown => {
    if (depth > maxDepth) {
      throw new Error("Maximum transformation depth exceeded.");
    }

    // Primitives, null, and arrays pass through as literals. Arrays in handler
    // args are opaque to the walker by design — handlers own their own shape.
    if (typeof node !== "object" || node === null || Array.isArray(node)) {
      return node;
    }

    const entries = Object.entries(node as Record<string, unknown>);
    if (entries.length === 0) return {};

    // Mirror the Python walker: check the first key. If it names a handler,
    // dispatch with the handler argument. Otherwise treat the node as an
    // output shape and recurse over every child.
    const [firstKey] = entries[0];
    // Disallow inherited / prototype properties (`__proto__`, `toString`,
    // etc.) from resolving to a handler — mapping JSON can be reconstituted
    // from untrusted sources via `mergeExtensions()` (ADR-0022 Decision #8).
    if (Object.prototype.hasOwnProperty.call(handlers, firstKey)) {
      const handlerFn = handlers[firstKey];
      const handlerArg = (node as Record<string, unknown>)[firstKey];
      let returned: unknown;
      try {
        returned = handlerFn(data, handlerArg);
      } catch (exc) {
        throw new HandlerError(firstKey, exc);
      }
      // Defense in depth: a handler's return value is opaque to the walker
      // (we never recurse into it), but a `const` / `field` / `match` handler
      // can return a `JSON.parse`-loaded object that carries an own
      // `__proto__` key. Strip that key from plain-object returns before
      // it lands on the transform result — downstream consumers using a
      // for-in deep-merge would otherwise pollute Object.prototype
      // (ADR-0022 Decision #8). Arrays and class instances pass through
      // unchanged; nested `__proto__` inside non-plain values is the
      // handler author's responsibility.
      //
      // Shallow-clone the value rather than `delete`-in-place: `fieldValue`
      // returns references plucked from caller input via `getFromPath`, so
      // an in-place delete would silently mutate the caller's data —
      // surprising for plugin authors caching parsed source records across
      // `toCommon` calls. Spread is the correct copy primitive here:
      // `{ ...src }` uses the spec's CopyDataProperties → CreateDataProperty,
      // which copies an own `__proto__` data property AS a data property
      // instead of firing the prototype setter. `Object.assign({}, src)`
      // would mutate the target's prototype chain instead — do not switch.
      if (
        typeof returned === "object" &&
        returned !== null &&
        !Array.isArray(returned) &&
        Object.getPrototypeOf(returned) === Object.prototype &&
        Object.prototype.hasOwnProperty.call(returned, "__proto__")
      ) {
        const cleaned = { ...(returned as Record<string, unknown>) };
        delete cleaned.__proto__;
        return cleaned;
      }
      return returned;
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of entries) {
      // Reject `__proto__` — bracket-assign invokes the prototype setter in
      // V8/SpiderMonkey and mutates the prototype chain (ADR-0022 Decision #8).
      if (k === "__proto__") {
        throw new Error(
          `Invalid mapping node: '__proto__' is not allowed as an output field name (depth ${depth})`
        );
      }
      out[k] = transformNode(v, depth + 1);
    }
    return out;
  };

  return transformNode(mapping, 0);
}
