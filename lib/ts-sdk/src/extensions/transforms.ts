/**
 * `buildTransforms()` — compile a pair of declarative mapping objects into typed
 * `(toCommon, fromCommon)` callables.
 *
 * Each direction is author-provided — this utility never inverts one into the
 * other, because many-to-one handlers like `switch` are not reversible.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";

import { PluginError, type Handler, type TransformResult } from "./types";
import { DEFAULT_HANDLERS, HandlerError, transformFromMapping } from "./transformation";

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
 * unknown key is indistinguishable from an output field name); detection of
 * unknown top-level output keys is now handled by `validateOutputPaths` when
 * `commonModel` is provided; detection at arbitrary nesting depth remains deferred.
 *
 * Sibling keys at a handler-dispatch node are rejected here. The runtime
 * walker is first-key-wins, so `{ field: "x", const: "fallback" }` would
 * silently drop `const` — almost always an author typo — so fail loud at
 * build time instead (parity with the Python PoC's build-time validation).
 * The low-level `transformFromMapping` walker stays lenient so programmatic
 * callers composing partial mappings aren't forced into the strict shape.
 *
 * @internal
 */
function validateMapping(mapping: unknown, knownHandlers: Set<string>, path = ""): void {
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

  // A handler invocation must be the sole key in its node — see the function
  // docstring above for the first-key-wins rationale and cross-SDK parity.
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
    if (knownHandlers.has(key)) {
      // Handler invocation — argument is runtime-only, do not recurse.
      continue;
    }
    validateMapping(value, knownHandlers, childPath);
  }
}

/**
 * Validate that every top-level output key in `mapping` that is not a known
 * handler name is a real field on `commonModel`.
 *
 * Only runs when `commonModel` is an instance of `z.ZodObject` — when it is
 * not (e.g. `ZodRecord`, `ZodUnion`), returns without error. In practice all
 * schemas produced by `withCustomFields()` and `OpportunityBaseSchema` are
 * `ZodObject`s (`.extend()` / `.merge()` preserve the concrete type), so the
 * fallback is a safety net, not an expected code path.
 *
 * Called only for `toCommonMapping` — `fromCommonMapping` maps to native
 * format whose shape is unknown to this layer.
 *
 * Cross-SDK note: Python raises `ValueError`; TypeScript uses `Error` for
 * all structural build-time failures (consistent with `validateMapping`).
 *
 * @internal
 */
function validateOutputPaths(
  mapping: Record<string, unknown>,
  knownHandlers: Set<string>,
  // Bivariant `any` at the input position matches buildTransforms's own
  // commonModel signature and avoids a contravariant `unknown` type error.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commonModel: z.ZodType<unknown, z.ZodTypeDef, any>
): void {
  if (!(commonModel instanceof z.ZodObject)) return;
  const validNames = new Set(Object.keys(commonModel.shape));
  const outputKeys = Object.keys(mapping).filter(k => !knownHandlers.has(k));
  const invalid = outputKeys.filter(k => !validNames.has(k));
  if (invalid.length === 0) return;
  throw new Error(
    `buildTransforms (toCommonMapping): unknown output fields ${JSON.stringify(invalid.sort())} for schema. ` +
      `Declare them as customFields in ObjectSchemasInput or check the field name.`
  );
}

// ############################################################################
// Public - buildTransforms
// ############################################################################

/**
 * Return shape of {@link buildTransforms}.
 */
export interface BuiltTransforms<TNative, TCommon> {
  toCommon: (native: TNative) => TransformResult<TCommon>;
  fromCommon: (common: TCommon) => TransformResult<TNative>;
}

/**
 * Compile a pair of declarative mapping objects into typed
 * `(toCommon, fromCommon)` callables.
 *
 * @example
 * ```ts
 * const { toCommon, fromCommon } = buildTransforms(
 *   {
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
 *   { data: { opportunity_title: { field: "title" } } },
 * );
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
 * @param toCommonMapping - ADR-0017 mapping from native format → CommonGrants.
 * @param fromCommonMapping - ADR-0017 mapping from CommonGrants → native format.
 * @param handlers - Optional custom handlers registered for this call only.
 *   Name collisions with {@link DEFAULT_HANDLERS} raise a `TypeError` at call
 *   time rather than silently shadowing the default.
 * @param commonModel - Optional Zod schema to validate `toCommon` output against.
 *   Must be the fully extended schema (e.g. result of `withCustomFields(...)`) —
 *   not the base schema. Passing the base schema silently weakens validation of
 *   typed custom fields. When provided, `safeParse()` runs on the transform
 *   result and Zod issues are flattened into `TransformResult.errors`.
 *   `PluginError.path` for Zod-flattened issues uses dot notation including
 *   numeric indices (e.g. `"customFields.items.0.value"`).
 *
 * @throws TypeError when custom handler names collide with built-in defaults.
 * @throws Error when either mapping is structurally malformed (sibling keys
 *   on a handler-dispatch node).
 */
export function buildTransforms<TNative = unknown, TCommon = unknown>(
  toCommonMapping: Record<string, unknown>,
  fromCommonMapping: Record<string, unknown>,
  handlers?: Map<string, Handler>,
  // Bivariant `any` accepts schemas with input/output asymmetry; `unknown`
  // would reject them at the contravariant input position.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commonModel?: z.ZodType<TCommon, z.ZodTypeDef, any>
): BuiltTransforms<TNative, TCommon> {
  if (handlers) {
    const collisions = [...handlers.keys()].filter(k => DEFAULT_HANDLERS.has(k));
    if (collisions.length > 0) {
      throw new TypeError(
        `buildTransforms: handler names collide with defaults: ${JSON.stringify(collisions.sort())}`
      );
    }
  }

  const merged = new Map([...DEFAULT_HANDLERS, ...(handlers ?? [])]);
  const known = new Set(merged.keys());

  // Validate mapping structure up front so structurally malformed mappings
  // fail at build time, not on first invocation.
  validateMapping(toCommonMapping, known);
  validateMapping(fromCommonMapping, known);
  if (commonModel !== undefined) {
    validateOutputPaths(toCommonMapping, known, commonModel);
  }

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
    // inspect malformed data.
    return { result: ran.value as TCommon, errors };
  };

  const fromCommon = (common: TCommon): TransformResult<TNative> => {
    const ran = runMapping(common, fromCommonMapping);
    if (!ran.ok) return { result: {} as TNative, errors: [ran.error] };
    return { result: ran.value as TNative, errors: [] };
  };

  return { toCommon, fromCommon };
}
