import { describe, it, expect } from "vitest";
import { z } from "zod";

import { PluginError, buildTransforms, getFromPath, withCustomFields } from "@/extensions";
import { OpportunityBaseSchema } from "@/schemas/zod/models";
import { CustomFieldType } from "@/constants";

// ############################################################################
// Test fixtures
// ############################################################################

const SOURCE_DATA = {
  data: {
    agency_name: "Department of Examples",
    created_at: "2025-01-15T09:00:00Z",
    last_modified_at: "2025-04-01T12:30:00Z",
    opportunity_description: "Funding to advance research into conservation techniques.",
    opportunity_id: 12345,
    opportunity_number: "ABC-123-XYZ-001",
    opportunity_status: "posted",
    opportunity_title: "Research into conservation techniques",
    opportunity_uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  },
};

const toCommonMapping = {
  id: { field: "data.opportunity_uuid" },
  title: { field: "data.opportunity_title" },
  description: { field: "data.opportunity_description" },
  createdAt: { field: "data.created_at" },
  lastModifiedAt: { field: "data.last_modified_at" },
  status: {
    value: {
      match: {
        field: "data.opportunity_status",
        case: { posted: "open", archived: "closed", forecasted: "forecasted" },
        default: "custom",
      },
    },
  },
};

const fromCommonMapping = {
  data: {
    opportunity_title: { field: "title" },
    opportunity_uuid: { field: "id" },
  },
};

// ############################################################################
// Call-time validation
// ############################################################################

describe("buildTransforms — call-time validation", () => {
  it("rejects custom handler names that collide with defaults", () => {
    expect(() =>
      buildTransforms({
        toCommonMapping: {},
        fromCommonMapping: {},
        handlers: {
          field: (_d: unknown, _a: unknown) => null,
        },
      })
    ).toThrow(/collide with defaults/);
  });

  it("rejects custom handler names that shadow Object.prototype keys (Decision #8 hardening)", () => {
    expect(() =>
      buildTransforms({
        toCommonMapping: {},
        fromCommonMapping: {},
        handlers: {
          constructor: (_d: unknown, _a: unknown) => null,
        },
      })
    ).toThrow(/shadow Object\.prototype/);
  });

  it("rejects mappings whose nodes are structurally malformed (array where scalar expected)", () => {
    expect(() =>
      buildTransforms({
        toCommonMapping: { a: ["unexpected", "array"] as unknown as Record<string, unknown> },
        fromCommonMapping: {},
      })
    ).toThrow(/Invalid mapping node/);
  });

  it("accepts a well-formed pair of mappings", () => {
    const built = buildTransforms({ toCommonMapping, fromCommonMapping });
    expect(typeof built.toCommon).toBe("function");
    expect(typeof built.fromCommon).toBe("function");
  });

  it("rejects a mapping whose nesting depth exceeds the shared cap", () => {
    // Build a mapping just past the default depth cap so validateMapping
    // throws before buildTransforms returns. Mirrors the runtime walker's
    // depth-cap test; locks in the shared `DEFAULT_MAX_TRANSFORM_DEPTH` so
    // adversarial mapping JSON cannot survive build-time validation only
    // to blow the stack at runtime.
    let deep: unknown = "leaf";
    for (let i = 0; i < 600; i++) deep = { nested: deep };
    expect(() =>
      buildTransforms({
        toCommonMapping: deep as Record<string, unknown>,
        fromCommonMapping: {},
      })
    ).toThrow(/exceeded maximum nesting depth/);
  });

  it("rejects sibling keys alongside a handler key — two handlers in one node (Python PoC parity)", () => {
    // The runtime walker is first-key-wins, so `{ field, const }` would
    // silently drop `const`. Almost always an author bug. Match Python's
    // `_validate_mapping` and reject at build time.
    expect(() =>
      buildTransforms({
        toCommonMapping: { value: { field: "x", const: "fallback" } },
        fromCommonMapping: {},
      })
    ).toThrow(/cannot have sibling keys/);
  });

  it("rejects a handler key alongside a non-handler sibling at the same node", () => {
    // The non-handler sibling would also be silently dropped by the runtime
    // walker once the handler dispatches. Catch the typo early.
    expect(() =>
      buildTransforms({
        toCommonMapping: { value: { field: "x", extra: "literal" } },
        fromCommonMapping: {},
      })
    ).toThrow(/cannot have sibling keys/);
  });
});

// ############################################################################
// toCommon happy path
// ############################################################################

describe("buildTransforms — toCommon", () => {
  it("returns the transformed result with an empty error list on success", () => {
    const { toCommon } = buildTransforms({ toCommonMapping, fromCommonMapping });
    const out = toCommon(SOURCE_DATA);

    expect(out.errors).toEqual([]);
    expect(out.result).toEqual({
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "Research into conservation techniques",
      description: "Funding to advance research into conservation techniques.",
      createdAt: "2025-01-15T09:00:00Z",
      lastModifiedAt: "2025-04-01T12:30:00Z",
      status: { value: "open" },
    });
  });

  it("wraps a handler exception as a PluginError carrying handler + cause", () => {
    const { toCommon } = buildTransforms({
      toCommonMapping: { amount: { stringToNumber: "data.bogus" } },
      fromCommonMapping: {},
    });
    // Use a source value that fails coercion so stringToNumber throws.
    const out = toCommon({ data: { bogus: "abc" } });

    expect(out.errors).toHaveLength(1);
    const [err] = out.errors;
    expect(err).toBeInstanceOf(PluginError);
    expect(err.handler).toBe("stringToNumber");
    expect(err.cause).toBeInstanceOf(Error);
    // On handler exception, result is an empty object — no partial fields.
    // Matches Python PoC's TransformResult(result={}, errors=[...]) behavior.
    // `toStrictEqual` (not `toEqual`) so the contract rejects null/undefined-
    // shaped "empty" sentinels — the documented shape is a literal `{}`.
    expect(out.result).toStrictEqual({});
  });

  it("short-circuits on the first HandlerError — two failing fields produce a single PluginError", () => {
    // Locks in the documented asymmetry: handler-failure mode is first-error-stops,
    // while the Zod-validation path aggregates every issue. Two `stringToNumber`
    // calls both fail on `"abc"`, but only one PluginError surfaces.
    const { toCommon } = buildTransforms({
      toCommonMapping: {
        a: { stringToNumber: "data.bogus_a" },
        b: { stringToNumber: "data.bogus_b" },
      },
      fromCommonMapping: {},
    });

    const out = toCommon({ data: { bogus_a: "abc", bogus_b: "def" } });

    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]).toBeInstanceOf(PluginError);
    expect(out.errors[0].handler).toBe("stringToNumber");
  });

  it("flattens Zod validation issues into PluginError[] when commonModel is provided", () => {
    const { toCommon } = buildTransforms({
      // Output is intentionally missing required CG fields so Zod fails.
      toCommonMapping: { title: { field: "data.opportunity_title" } },
      fromCommonMapping: {},
      commonModel: OpportunityBaseSchema,
    });

    const out = toCommon(SOURCE_DATA);

    expect(out.errors.length).toBeGreaterThan(0);
    expect(out.errors[0]).toBeInstanceOf(PluginError);
    // Path is a non-empty dot-joined string for field-level issues, or
    // `undefined` for root-level issues from schema-wide `.refine()` calls.
    expect(
      out.errors.every(
        e => e.path === undefined || (typeof e.path === "string" && e.path.length > 0)
      )
    ).toBe(true);
    // result preserves the raw transformed object so callers can inspect malformed data.
    expect(out.result).toEqual({ title: "Research into conservation techniques" });
  });

  it("produces one PluginError per ZodIssue (aggregation contract — not first-issue-only)", () => {
    // Pin the documented asymmetry from buildTransforms() JSDoc: handler
    // failures short-circuit (one PluginError per call), Zod failures
    // aggregate every issue. Build a small schema that produces a
    // deterministic two-issue failure so a regression to
    // `[parsed.error.issues[0]]` would fail this test.
    const TwoFieldSchema = z.object({
      a: z.string().min(5),
      b: z.number().int(),
    });

    const { toCommon } = buildTransforms({
      toCommonMapping: {
        a: { const: "x" },
        b: { const: "not-a-number" },
      },
      fromCommonMapping: {},
      commonModel: TwoFieldSchema,
    });

    const out = toCommon({});

    expect(out.errors).toHaveLength(2);
    expect(out.errors.every(e => e instanceof PluginError)).toBe(true);
    const paths = out.errors.map(e => e.path).sort();
    expect(paths).toEqual(["a", "b"]);
  });

  it("validates against the fully extended schema produced by withCustomFields", () => {
    const extendedOpp = withCustomFields(OpportunityBaseSchema, {
      legacyId: { fieldType: CustomFieldType.integer, value: z.number().int() },
    });

    const { toCommon } = buildTransforms({
      toCommonMapping: {
        id: { field: "data.opportunity_uuid" },
        title: { field: "data.opportunity_title" },
        description: { field: "data.opportunity_description" },
        createdAt: { field: "data.created_at" },
        lastModifiedAt: { field: "data.last_modified_at" },
        status: { value: { const: "open" } },
        customFields: {
          legacyId: {
            value: { field: "data.opportunity_id" },
            name: "legacyId",
            fieldType: "integer",
          },
        },
      },
      fromCommonMapping: {},
      commonModel: extendedOpp,
    });

    const out = toCommon(SOURCE_DATA);

    expect(out.errors).toEqual([]);
    const result = out.result as z.infer<typeof extendedOpp>;
    expect(result.customFields?.legacyId?.value).toBe(12345);
  });
});

// ############################################################################
// fromCommon
// ############################################################################

describe("buildTransforms — fromCommon", () => {
  it("transforms CG → native using the fromCommon mapping", () => {
    const { fromCommon } = buildTransforms({ toCommonMapping, fromCommonMapping });
    const out = fromCommon({
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "Research into conservation techniques",
    });

    expect(out.errors).toEqual([]);
    expect(out.result).toEqual({
      data: {
        opportunity_title: "Research into conservation techniques",
        opportunity_uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      },
    });
  });

  it("supports a round trip on fields covered by both directions", () => {
    const { toCommon, fromCommon } = buildTransforms({ toCommonMapping, fromCommonMapping });

    const cg = toCommon(SOURCE_DATA);
    expect(cg.errors).toEqual([]);

    const back = fromCommon(cg.result);
    expect(back.errors).toEqual([]);
    expect((back.result as { data: { opportunity_title: string } }).data.opportunity_title).toBe(
      "Research into conservation techniques"
    );
  });

  it("wraps a handler exception as a PluginError carrying handler + cause", () => {
    const { fromCommon } = buildTransforms({
      toCommonMapping: {},
      fromCommonMapping: { data: { amount: { stringToNumber: "bogus" } } },
    });
    // Use a CG-shaped value where `bogus` fails coercion so stringToNumber throws.
    const out = fromCommon({ bogus: "abc" } as never);

    expect(out.errors).toHaveLength(1);
    const [err] = out.errors;
    expect(err).toBeInstanceOf(PluginError);
    expect(err.handler).toBe("stringToNumber");
    expect(err.cause).toBeInstanceOf(Error);
    // Same contract as the toCommon side: literal `{}`, not null/undefined.
    expect(out.result).toStrictEqual({});
  });
});

// ############################################################################
// Custom handlers
// ############################################################################

describe("PluginError — PII-safe serialization", () => {
  it("omits sourceValue and cause from JSON.stringify by default", () => {
    const { toCommon } = buildTransforms({
      toCommonMapping: { amount: { stringToNumber: "data.bogus" } },
      fromCommonMapping: {},
    });
    const out = toCommon({ data: { bogus: "abc", ssn: "PII_PAYLOAD_123" } });

    const [err] = out.errors;
    expect(err).toBeInstanceOf(PluginError);
    // Sanity: the fields are still readable directly for callers that opt in.
    expect(err.sourceValue).toEqual({ data: { bogus: "abc", ssn: "PII_PAYLOAD_123" } });
    expect(err.cause).toBeInstanceOf(Error);

    const serialized = JSON.stringify(err);
    expect(serialized).not.toContain("PII_PAYLOAD_123");
    expect(serialized).not.toContain("sourceValue");
    const parsed = JSON.parse(serialized);
    expect(parsed).toEqual({
      name: "PluginError",
      message: expect.any(String),
      handler: "stringToNumber",
    });
  });
});

describe("buildTransforms — custom handlers", () => {
  it("invokes a custom handler registered for this call only", () => {
    const join = (data: unknown, spec: unknown) => {
      const s = spec as { fields?: string[]; sep?: string };
      const sep = s.sep ?? " ";
      const parts = (s.fields ?? [])
        .map(path => getFromPath(data, path))
        .filter(v => v !== undefined && v !== null)
        .map(String);
      return parts.length > 0 ? parts.join(sep) : undefined;
    };

    const { toCommon } = buildTransforms({
      toCommonMapping: {
        label: {
          join: { fields: ["data.opportunity_number", "data.opportunity_title"], sep: " — " },
        },
      },
      fromCommonMapping: {},
      handlers: { join },
    });

    const out = toCommon(SOURCE_DATA);
    expect(out.errors).toEqual([]);
    expect((out.result as { label: string }).label).toBe(
      "ABC-123-XYZ-001 — Research into conservation techniques"
    );
  });
});

// ############################################################################
// Decision #8 hardening — handler-return prototype-pollution scrub
// ############################################################################

describe("buildTransforms — handler-return __proto__ scrub (Decision #8 hardening)", () => {
  it("strips own `__proto__` from a `const` handler's plain-object return", () => {
    // JSON.parse adds `__proto__` as an own enumerable property on the
    // resulting object — the canonical entry point for prototype-pollution
    // payloads in mapping JSON reconstituted from untrusted sources via
    // mergeExtensions(). The walker treats handler returns as opaque, so
    // without the scrub a downstream for-in deep-merge of the result would
    // pollute Object.prototype. Pin the scrub here.
    const evilArg = JSON.parse('{"__proto__": {"polluted": true}, "ok": 1}');
    expect(Object.prototype.hasOwnProperty.call(evilArg, "__proto__")).toBe(true);

    const { toCommon } = buildTransforms({
      toCommonMapping: { wrap: { const: evilArg } },
      fromCommonMapping: {},
    });
    const out = toCommon({});
    const wrap = (out.result as { wrap: Record<string, unknown> }).wrap;

    expect(out.errors).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(wrap, "__proto__")).toBe(false);
    expect(wrap.ok).toBe(1);
  });

  it("strips own `__proto__` from a `field` handler's plucked object", () => {
    const evilSource = { data: JSON.parse('{"__proto__": {"polluted": true}, "ok": 1}') };

    const { toCommon } = buildTransforms({
      toCommonMapping: { wrap: { field: "data" } },
      fromCommonMapping: {},
    });
    const out = toCommon(evilSource);
    const wrap = (out.result as { wrap: Record<string, unknown> }).wrap;

    expect(Object.prototype.hasOwnProperty.call(wrap, "__proto__")).toBe(false);
    expect(wrap.ok).toBe(1);
  });

  it("after the scrub, a vulnerable for-in deep-merge of the result does NOT pollute Object.prototype", () => {
    const evilArg = JSON.parse('{"__proto__": {"polluted": true}}');
    const { toCommon } = buildTransforms({
      toCommonMapping: { wrap: { const: evilArg } },
      fromCommonMapping: {},
    });
    const out = toCommon({});

    // Standard recursive for-in deep-merge — the canonical pollution gadget
    // used by countless utility libs. Without the runtime scrub above this
    // would set Object.prototype.polluted = true.
    function vulnerableMerge(t: Record<string, unknown>, s: Record<string, unknown>) {
      for (const k in s) {
        const sv = s[k];
        if (typeof sv === "object" && sv !== null) {
          const tv = t[k];
          if (typeof tv === "object" && tv !== null) {
            vulnerableMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
          } else {
            t[k] = sv;
          }
        } else {
          t[k] = sv;
        }
      }
    }

    const target: Record<string, unknown> = {};
    vulnerableMerge(target, out.result as Record<string, unknown>);

    // The smoking gun: a fresh empty object would expose `polluted: true`
    // on its prototype if pollution had occurred.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
