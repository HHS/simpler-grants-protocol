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

import { TransformError, type Handler, type TransformResult } from "./types";
import { DEFAULT_HANDLERS, HandlerError, transformFromMapping } from "../utils/transformation";

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
 * build time instead. The low-level `transformFromMapping` walker stays
 * lenient so programmatic callers composing partial mappings aren't forced
 * into the strict shape.
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
  // docstring above for the first-key-wins rationale.
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
 * @internal
 */
function validateOutputPaths(
  mapping: Record<string, unknown>,
  knownHandlers: Set<string>,
  // `any` lets this accept Zod schemas whose input type differs from their
  // output type (e.g. schemas that use .transform()). `unknown` would reject
  // those valid schemas here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commonSchema: z.ZodType<unknown, any>
): void {
  if (!(commonSchema instanceof z.ZodObject)) return;
  const validNames = new Set(Object.keys(commonSchema.shape));
  const outputKeys = Object.keys(mapping).filter(k => !knownHandlers.has(k));
  const invalid = outputKeys.filter(k => !validNames.has(k));
  if (invalid.length === 0) return;
  throw new Error(
    `buildTransforms (toCommonMapping): unknown output fields ${JSON.stringify(invalid.sort())} for schema. ` +
      `If these are custom fields, map them under the top-level "customFields" key ` +
      `(e.g. { customFields: { yourField: ... } }), not as top-level keys, and declare them in schemas[Object].customFields. ` +
      `Otherwise check the field name.`
  );
}

// ############################################################################
// Public - buildTransforms
// ############################################################################

/**
 * Return shape of {@link buildTransforms}.
 */
export interface BuiltTransforms<TSource, TCommon> {
  toCommon: (source: TSource) => TransformResult<TCommon>;
  fromCommon: (common: TCommon) => TransformResult<TSource>;
}

/**
 * Compile a pair of declarative mapping objects into typed
 * `(toCommon, fromCommon)` callables.
 *
 * @internal Plugin authors should use `definePlugin({ schemas: { [Name]: { mappings } } })`
 * instead of calling this directly. `definePlugin()` invokes `buildTransforms()`
 * automatically from the `mappings` entry and wraps the result with schema validation.
 * This function remains exported for unit testing and advanced use cases.
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
 *   `TransformError` even when several fields would have failed.
 * - Zod-validation failures (`commonSchema` or `sourceSchema` provided): every
 *   `ZodIssue` is flattened into a separate `TransformError`, so `errors` carries
 *   the full set.
 *
 * Callers writing strict-mode handling should treat any non-empty `errors`
 * as failure regardless of length.
 *
 * @param toCommonMapping - Declarative mapping from source system format → CommonGrants.
 * @param fromCommonMapping - Declarative mapping from CommonGrants → source system format.
 * @param handlers - Optional custom handlers registered for this call only.
 *   Name collisions with {@link DEFAULT_HANDLERS} raise a `TypeError` at call
 *   time rather than silently shadowing the default.
 * @param commonSchema - Optional Zod schema to validate `toCommon` output against.
 *   Must be the fully extended schema (e.g. result of `withCustomFields(...)`) —
 *   not the base schema. Passing the base schema silently weakens validation of
 *   typed custom fields. When provided, `safeParse()` runs on the transform
 *   result and Zod issues are flattened into `TransformResult.errors`.
 *   `TransformError.path` for Zod-flattened issues uses dot notation including
 *   numeric indices (e.g. `"customFields.items.0.value"`).
 * @param sourceSchema - Optional Zod schema to validate `fromCommon` output
 *   against. Without this, `fromCommon` casts its result to `TSource` without
 *   any runtime check, so `TSource` provides no real safety guarantee. When
 *   provided, `safeParse()` runs on the transform result and Zod issues are
 *   flattened into `TransformResult.errors` using the same format as
 *   `commonSchema`.
 *
 * @throws TypeError when custom handler names collide with built-in defaults.
 * @throws Error when either mapping is structurally malformed (sibling keys
 *   on a handler-dispatch node).
 */
export function buildTransforms<TSource = unknown, TCommon = unknown>(
  toCommonMapping: Record<string, unknown>,
  fromCommonMapping: Record<string, unknown>,
  handlers?: Map<string, Handler>,
  // `any` lets callers pass Zod schemas that transform their input into TCommon
  // (e.g. schemas using .transform()). `unknown` would reject those valid schemas.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commonSchema?: z.ZodType<TCommon, any>,
  // `any` lets callers pass Zod schemas that transform their input into TSource
  // (e.g. schemas using .transform()). `unknown` would reject those valid schemas.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sourceSchema?: z.ZodType<TSource, any>
): BuiltTransforms<TSource, TCommon> {
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
  if (commonSchema !== undefined) {
    validateOutputPaths(toCommonMapping, known, commonSchema);
  }
  if (sourceSchema !== undefined) {
    validateOutputPaths(fromCommonMapping, known, sourceSchema);
  }

  const runMapping = (
    data: unknown,
    mapping: Record<string, unknown>
  ): { ok: true; value: unknown } | { ok: false; error: TransformError } => {
    try {
      return { ok: true, value: transformFromMapping(data, mapping, { handlers: merged }) };
    } catch (exc) {
      if (exc instanceof HandlerError) {
        const cause = exc.cause;
        return {
          ok: false,
          error: new TransformError(cause instanceof Error ? cause.message : String(cause), {
            handler: exc.handler,
            sourceValue: data,
            cause,
          }),
        };
      }
      return {
        ok: false,
        error: new TransformError(exc instanceof Error ? exc.message : String(exc), {
          sourceValue: data,
          cause: exc,
        }),
      };
    }
  };

  const toCommon = (source: TSource): TransformResult<TCommon> => {
    const ran = runMapping(source, toCommonMapping);
    if (!ran.ok) return { result: {} as TCommon, errors: [ran.error] };

    if (commonSchema === undefined) {
      return { result: ran.value as TCommon, errors: [] };
    }

    const parsed = commonSchema.safeParse(ran.value);
    if (parsed.success) {
      return { result: parsed.data, errors: [] };
    }
    const errors = parsed.error.issues.map(issue => {
      // Root-level issues (e.g. from `.refine()` on the schema itself) have an
      // empty `path` — leave TransformError.path undefined so the "if known" contract
      // in the docstring holds.
      const joined = issue.path.length > 0 ? issue.path.map(p => String(p)).join(".") : undefined;
      return new TransformError(issue.message, { path: joined });
    });
    // Return the raw transformed object alongside errors so callers can
    // inspect malformed data.
    return { result: ran.value as TCommon, errors };
  };

  const fromCommon = (common: TCommon): TransformResult<TSource> => {
    const ran = runMapping(common, fromCommonMapping);
    if (!ran.ok) return { result: {} as TSource, errors: [ran.error] };

    if (sourceSchema === undefined) {
      return { result: ran.value as TSource, errors: [] };
    }

    const parsed = sourceSchema.safeParse(ran.value);
    if (parsed.success) {
      return { result: parsed.data, errors: [] };
    }
    const errors = parsed.error.issues.map(issue => {
      const joined = issue.path.length > 0 ? issue.path.map(p => String(p)).join(".") : undefined;
      return new TransformError(issue.message, { path: joined });
    });
    return { result: ran.value as TSource, errors };
  };

  return { toCommon, fromCommon };
}
