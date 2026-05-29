/**
 * `buildTransforms()` — compile a pair of ADR-0017 mapping objects into typed
 * `(toCommon, fromCommon)` callables.
 *
 * Mirrors the Python SDK's `common_grants_sdk.extensions.transforms` so the
 * two PoC ports share semantics. Per ADR-0022 Decision #6, each direction is
 * author-provided — this utility never inverts one into the other, because
 * many-to-one handlers like `switch` are not reversible.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";

import { PluginError, type Handler, type TransformResult } from "./types";
import {
  DEFAULT_HANDLERS,
  DEFAULT_MAX_TRANSFORM_DEPTH,
  HandlerError,
  transformFromMapping,
} from "./transformation";

// ############################################################################
// Internal - mapping structure validation
// ############################################################################

/**
 * Walk the mapping tree and throw on structural malformation.
 *
 * Each node must be a primitive (`string` / `number` / `boolean` / `null` /
 * `undefined`) or a plain object. Arrays and class instances are rejected.
 *
 * Handler arguments are runtime-only and skipped — they may legitimately be
 * arrays, deeply nested specs, or anything else the handler accepts. The
 * walker can't detect *unknown* handler names at static analysis time (an
 * unknown key is indistinguishable from an output field name); that
 * detection is deferred to the full SDK per ADR-0022 Decision #7.
 *
 * Bounded by `DEFAULT_MAX_TRANSFORM_DEPTH` (shared with `transformFromMapping`)
 * so adversarial mapping JSON cannot exhaust the call stack before
 * `buildTransforms()` returns.
 *
 * Sibling keys at a handler-dispatch node are rejected here. The runtime
 * walker is first-key-wins, so `{ field: "x", const: "fallback" }` would
 * silently drop `const` — almost always an author typo — so fail loud at
 * build time instead. Cross-SDK parity: mirrors Python's `_validate_mapping`
 * (called from `build_transforms`), which raises on the same shape. The
 * low-level `transformFromMapping` walker stays lenient so programmatic
 * callers composing partial mappings aren't forced into the strict shape.
 *
 * @internal
 */
function validateMapping(mapping: unknown, knownHandlers: Set<string>, path = "", depth = 0): void {
  if (depth > DEFAULT_MAX_TRANSFORM_DEPTH) {
    throw new Error(
      `Invalid mapping at '${path}': exceeded maximum nesting depth of ${DEFAULT_MAX_TRANSFORM_DEPTH}`
    );
  }
  if (mapping === null || mapping === undefined) return;
  const t = typeof mapping;
  if (t === "string" || t === "number" || t === "boolean") return;

  if (t !== "object" || Array.isArray(mapping)) {
    throw new Error(
      `Invalid mapping node at '${path}': expected object, string, number, boolean, or null, got ${
        Array.isArray(mapping) ? "array" : t
      }`
    );
  }

  // A handler invocation must be the sole key in its node. The runtime walker
  // is first-key-wins, so a handler key alongside siblings silently drops the
  // siblings (`{ field, const }` keeps `field`, drops `const`) — almost always
  // an author typo. Fail loud at build time. Mirrors Python's `_validate_mapping`.
  const nodeKeys = Object.keys(mapping as Record<string, unknown>);
  const handlerKeys = nodeKeys.filter(k => knownHandlers.has(k));
  if (handlerKeys.length > 0 && nodeKeys.length > 1) {
    const siblings = nodeKeys.filter(k => !knownHandlers.has(k)).sort();
    throw new Error(
      `Invalid mapping node at '${path === "" ? "<root>" : path}': handler key '${
        handlerKeys[0]
      }' cannot have sibling keys ${JSON.stringify(siblings)}. ` +
        `A handler invocation must be the only key in its dict.`
    );
  }

  for (const [key, value] of Object.entries(mapping as Record<string, unknown>)) {
    const childPath = path === "" ? key : `${path}.${key}`;
    // Fail loud at build time so adopters can't ship a mapping whose only
    // signal is a runtime PluginError. Mirrors the walker's guard in
    // transformFromMapping (ADR-0022 Decision #8).
    if (key === "__proto__") {
      throw new Error(
        `Invalid mapping node at '${childPath}': '__proto__' is not allowed as an output field name`
      );
    }
    if (knownHandlers.has(key)) {
      // Handler invocation — argument is runtime-only, do not recurse.
      continue;
    }
    validateMapping(value, knownHandlers, childPath, depth + 1);
  }
}

// ############################################################################
// Public - buildTransforms
// ############################################################################

/**
 * Options for {@link buildTransforms}.
 */
export interface BuildTransformsOptions<TCommon = unknown> {
  /**
   * Custom mapping handlers registered for this call only.
   *
   * Name collisions with {@link DEFAULT_HANDLERS} raise a `TypeError` at call
   * time rather than silently shadowing the default (ADR-0022 Decision #8).
   */
  handlers?: Record<string, Handler>;

  /**
   * Optional Zod schema to validate `toCommon` output against.
   *
   * Must be the fully extended schema — e.g. the result of
   * `withCustomFields(OpportunityBaseSchema, specs)` — not the base schema.
   * Passing the base schema silently weakens validation of typed custom
   * fields, because Zod will only check `customFields` against
   * `Record<string, CustomField>` rather than the typed container produced
   * by the plugin's declarations.
   *
   * When provided, `commonModel.safeParse()` runs on the transform result and
   * any Zod issues are flattened into `TransformResult.errors` rather than
   * thrown. On validation failure, `result` holds the raw transformed object
   * (not the parsed instance), so callers can inspect malformed data
   * alongside the errors.
   *
   * `PluginError.path` for Zod-flattened issues is the issue's `path` array
   * joined with `"."` and stringified — including numeric array indices, so a
   * Zod issue with path `["customFields", "items", 0, "value"]` becomes
   * `"customFields.items.0.value"` (not the JSONPath form
   * `"items[0].value"`). This matches the Python PoC's `.`-join convention;
   * the full SDK's validation pass may revisit the format.
   */
  // Bivariant `any` accepts schemas with input/output asymmetry; `unknown`
  // would reject them at the contravariant input position.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commonModel?: z.ZodType<TCommon, z.ZodTypeDef, any>;
}

/**
 * Return shape of {@link buildTransforms}.
 */
export interface BuiltTransforms<TNative, TCommon> {
  toCommon: (native: TNative) => TransformResult<TCommon>;
  fromCommon: (common: TCommon) => TransformResult<TNative>;
}

/**
 * Compile a pair of ADR-0017 mapping objects into typed
 * `(toCommon, fromCommon)` callables.
 *
 * @example
 * ```ts
 * const { toCommon, fromCommon } = buildTransforms({
 *   toCommonMapping: {
 *     id:    { field: "data.opportunity_uuid" },
 *     title: { field: "data.opportunity_title" },
 *     status: {
 *       value: {
 *         match: {
 *           field: "data.opportunity_status",
 *           case: { posted: "open", archived: "closed" },
 *           default: "custom",
 *         },
 *       },
 *     },
 *   },
 *   fromCommonMapping: {
 *     data: { opportunity_title: { field: "title" } },
 *   },
 * });
 *
 * const result = toCommon(sourceData);
 * if (result.errors.length === 0) use(result.result);
 * ```
 *
 * @remarks
 * Error aggregation is asymmetric across the two failure modes:
 *
 * - Handler failures (a registered handler throws): the mapping walk
 *   short-circuits on the first failure, so `errors` carries exactly one
 *   `PluginError` even when several fields would have failed.
 * - Zod-validation failures (`commonModel` provided): every `ZodIssue` is
 *   flattened into a separate `PluginError`, so `errors` carries the full
 *   set.
 *
 * Callers writing strict-mode handling should treat any non-empty `errors`
 * as failure regardless of length.
 *
 * @throws TypeError when custom handler names collide with built-in defaults
 *   or shadow `Object.prototype` keys (e.g. `constructor`, `toString`,
 *   `__proto__`).
 * @throws Error when either mapping is structurally malformed (includes
 *   `__proto__` as an output field name, sibling keys on a handler-dispatch
 *   node, or recursion exceeding `DEFAULT_MAX_TRANSFORM_DEPTH`).
 */
export function buildTransforms<TNative = unknown, TCommon = unknown>(
  args: {
    toCommonMapping: Record<string, unknown>;
    fromCommonMapping: Record<string, unknown>;
  } & BuildTransformsOptions<TCommon>
): BuiltTransforms<TNative, TCommon> {
  const { toCommonMapping, fromCommonMapping, handlers, commonModel } = args;

  if (handlers) {
    const collisions = Object.keys(handlers).filter(k =>
      Object.prototype.hasOwnProperty.call(DEFAULT_HANDLERS, k)
    );
    if (collisions.length > 0) {
      throw new TypeError(
        `buildTransforms: handler names collide with defaults: ${JSON.stringify(collisions.sort())}`
      );
    }
    // Names that shadow Object.prototype keys (e.g. `constructor`, `toString`,
    // `__proto__`) become own properties of the merged registry on spread, then enter
    // `known` and would dispatch via the walker. Reject so a caller can't accidentally
    // open a path for attacker-controlled mapping JSON to invoke unexpected handlers
    // (ADR-0022 Decision #8 hardening). `__proto__` itself is an own property of
    // `Object.prototype` (as an accessor), so the single hasOwnProperty check
    // covers it without an explicit branch.
    const unsafe = Object.keys(handlers).filter(k =>
      Object.prototype.hasOwnProperty.call(Object.prototype, k)
    );
    if (unsafe.length > 0) {
      throw new TypeError(
        `buildTransforms: handler names shadow Object.prototype: ${JSON.stringify(unsafe.sort())}`
      );
    }
  }

  const merged: Record<string, Handler> = { ...DEFAULT_HANDLERS, ...(handlers ?? {}) };
  const known = new Set(Object.keys(merged));

  // Validate mapping structure up front so structurally malformed mappings
  // fail at build time, not on first invocation.
  validateMapping(toCommonMapping, known);
  validateMapping(fromCommonMapping, known);

  const runMapping = (
    data: unknown,
    mapping: Record<string, unknown>
  ): { ok: true; value: unknown } | { ok: false; error: PluginError } => {
    try {
      return { ok: true, value: transformFromMapping(data, mapping, { handlers: merged }) };
    } catch (exc) {
      if (exc instanceof HandlerError) {
        const cause = exc.cause;
        return {
          ok: false,
          error: new PluginError(cause instanceof Error ? cause.message : String(cause), {
            handler: exc.handler,
            sourceValue: data,
            cause,
          }),
        };
      }
      return {
        ok: false,
        error: new PluginError(exc instanceof Error ? exc.message : String(exc), {
          sourceValue: data,
          cause: exc,
        }),
      };
    }
  };

  const toCommon = (native: TNative): TransformResult<TCommon> => {
    const ran = runMapping(native, toCommonMapping);
    if (!ran.ok) return { result: {} as TCommon, errors: [ran.error] };

    if (commonModel === undefined) {
      return { result: ran.value as TCommon, errors: [] };
    }

    const parsed = commonModel.safeParse(ran.value);
    if (parsed.success) {
      return { result: parsed.data, errors: [] };
    }
    const errors = parsed.error.issues.map(issue => {
      // Root-level issues (e.g. from `.refine()` on the schema itself) have an
      // empty `path` — leave PluginError.path undefined so the "if known" contract
      // in the docstring holds.
      const joined = issue.path.length > 0 ? issue.path.map(p => String(p)).join(".") : undefined;
      return new PluginError(issue.message, { path: joined });
    });
    // Return the raw transformed object alongside errors so callers can
    // inspect malformed data — matches Python PoC behavior.
    return { result: ran.value as TCommon, errors };
  };

  const fromCommon = (common: TCommon): TransformResult<TNative> => {
    const ran = runMapping(common, fromCommonMapping);
    if (!ran.ok) return { result: {} as TNative, errors: [ran.error] };
    return { result: ran.value as TNative, errors: [] };
  };

  return { toCommon, fromCommon };
}
