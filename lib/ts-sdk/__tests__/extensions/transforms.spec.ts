import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";

import { TransformError, buildTransforms, getFromPath, withCustomFields } from "@/extensions";
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
      buildTransforms({}, {}, new Map([["field", (_d: unknown, _a: unknown) => null]]))
    ).toThrow(/collide with defaults/);
    // Also `match` — confirms the collision check isn't hardcoded to `field`.
    expect(() =>
      buildTransforms({}, {}, new Map([["match", (_d: unknown, _a: unknown) => null]]))
    ).toThrow(/collide with defaults/);
  });

  it("rejects mappings whose nodes are structurally malformed (array where scalar expected)", () => {
    expect(() =>
      buildTransforms({ a: ["unexpected", "array"] as unknown as Record<string, unknown> }, {})
    ).toThrow(/Invalid mapping node/);
  });

  it("accepts a well-formed pair of mappings", () => {
    const built = buildTransforms(toCommonMapping, fromCommonMapping);
    expect(typeof built.toCommon).toBe("function");
    expect(typeof built.fromCommon).toBe("function");
  });

  it("rejects sibling keys alongside a handler key — two handlers in one node (Python PoC parity)", () => {
    // The runtime walker is first-key-wins, so `{ field, const }` would
    // silently drop `const` — almost always an author bug — so reject at
    // build time.
    expect(() => buildTransforms({ value: { field: "data.x", const: "fallback" } }, {})).toThrow(
      /cannot have sibling keys/
    );
  });

  it("rejects a handler key alongside a non-handler sibling at the same node", () => {
    // The non-handler sibling would also be silently dropped by the runtime
    // walker once the handler dispatches. Catch the typo early.
    expect(() => buildTransforms({ value: { field: "data.x", extra: "literal" } }, {})).toThrow(
      /cannot have sibling keys/
    );
  });
});

// ############################################################################
// toCommon happy path
// ############################################################################

describe("buildTransforms — toCommon", () => {
  it("returns the transformed result with an empty error list on success", () => {
    const { toCommon } = buildTransforms(toCommonMapping, fromCommonMapping);
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

  it("wraps a handler exception as a TransformError carrying handler + cause", () => {
    const { toCommon } = buildTransforms({ amount: { stringToNumber: "data.bogus" } }, {});
    // Use a source value that fails coercion so stringToNumber throws.
    const out = toCommon({ data: { bogus: "abc" } });

    expect(out.errors).toHaveLength(1);
    const [err] = out.errors;
    expect(err).toBeInstanceOf(TransformError);
    expect(err.handler).toBe("stringToNumber");
    expect(err.cause).toBeInstanceOf(Error);
    // On handler exception, result is an empty object — no partial fields.
    // `toStrictEqual` (not `toEqual`) so the contract rejects null/undefined-
    // shaped "empty" sentinels — the documented shape is a literal `{}`.
    expect(out.result).toStrictEqual({});
  });

  it("short-circuits on the first HandlerError — two failing fields produce a single TransformError", () => {
    // Locks in the documented asymmetry: handler-failure mode is first-error-stops,
    // while the Zod-validation path aggregates every issue. Two `stringToNumber`
    // calls both fail on `"abc"`, but only one TransformError surfaces.
    const { toCommon } = buildTransforms(
      {
        a: { stringToNumber: "data.bogus_a" },
        b: { stringToNumber: "data.bogus_b" },
      },
      {}
    );

    const out = toCommon({ data: { bogus_a: "abc", bogus_b: "def" } });

    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]).toBeInstanceOf(TransformError);
    expect(out.errors[0].handler).toBe("stringToNumber");
  });

  it("flattens Zod validation issues into TransformError[] when commonSchema is provided", () => {
    const { toCommon } = buildTransforms(
      // Output is intentionally missing required CG fields so Zod fails.
      { title: { field: "data.opportunity_title" } },
      {},
      undefined,
      OpportunityBaseSchema
    );

    const out = toCommon(SOURCE_DATA);

    expect(out.errors.length).toBeGreaterThan(0);
    expect(out.errors[0]).toBeInstanceOf(TransformError);
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

  it("produces one TransformError per ZodIssue (aggregation contract — not first-issue-only)", () => {
    // Pin the documented asymmetry from buildTransforms() JSDoc: handler
    // failures short-circuit (one TransformError per call), Zod failures
    // aggregate every issue. Build a small schema that produces a
    // deterministic two-issue failure so a regression to
    // `[parsed.error.issues[0]]` would fail this test.
    const TwoFieldSchema = z.object({
      a: z.string().min(5),
      b: z.number().int(),
    });

    const { toCommon } = buildTransforms(
      {
        a: { const: "x" },
        b: { const: "not-a-number" },
      },
      {},
      undefined,
      TwoFieldSchema
    );

    const out = toCommon({});

    expect(out.errors).toHaveLength(2);
    expect(out.errors.every(e => e instanceof TransformError)).toBe(true);
    const paths = out.errors.map(e => e.path).sort();
    expect(paths).toEqual(["a", "b"]);
  });

  it("validates against the fully extended schema produced by withCustomFields", () => {
    const extendedOpp = withCustomFields(OpportunityBaseSchema, {
      legacyId: { fieldType: CustomFieldType.integer, value: z.number().int() },
    });

    const { toCommon } = buildTransforms(
      {
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
      {},
      undefined,
      extendedOpp
    );

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
    const { fromCommon } = buildTransforms(toCommonMapping, fromCommonMapping);
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
    const { toCommon, fromCommon } = buildTransforms(toCommonMapping, fromCommonMapping);

    const cg = toCommon(SOURCE_DATA);
    expect(cg.errors).toEqual([]);

    const back = fromCommon(cg.result);
    expect(back.errors).toEqual([]);
    expect((back.result as { data: { opportunity_title: string } }).data.opportunity_title).toBe(
      "Research into conservation techniques"
    );
  });

  it("wraps a handler exception as a TransformError carrying handler + cause", () => {
    const { fromCommon } = buildTransforms({}, { data: { amount: { stringToNumber: "bogus" } } });
    // Use a CG-shaped value where `bogus` fails coercion so stringToNumber throws.
    const out = fromCommon({ bogus: "abc" } as never);

    expect(out.errors).toHaveLength(1);
    const [err] = out.errors;
    expect(err).toBeInstanceOf(TransformError);
    expect(err.handler).toBe("stringToNumber");
    expect(err.cause).toBeInstanceOf(Error);
    // Same contract as the toCommon side: literal `{}`, not null/undefined.
    expect(out.result).toStrictEqual({});
  });

  it("flattens Zod validation issues into TransformError[] when sourceSchema is provided", () => {
    const SourceSchema = z.object({
      native_id: z.string(),
      native_title: z.string(),
    });

    const { fromCommon } = buildTransforms(
      {},
      // Only maps native_title — native_id will be missing, causing a Zod error.
      { native_title: { field: "title" } },
      undefined,
      undefined,
      SourceSchema
    );

    const out = fromCommon({ title: "Test Opp" } as never);

    expect(out.errors.length).toBeGreaterThan(0);
    expect(out.errors[0]).toBeInstanceOf(TransformError);
    expect(out.errors.some(e => e.path === "native_id")).toBe(true);
    // result preserves the raw transformed object so callers can inspect malformed data.
    expect(out.result).toEqual({ native_title: "Test Opp" });
  });

  it("passes through valid fromCommon output when sourceSchema is satisfied", () => {
    const SourceSchema = z.object({
      native_id: z.string(),
      native_title: z.string(),
    });

    const { fromCommon } = buildTransforms(
      {},
      {
        native_id: { field: "id" },
        native_title: { field: "title" },
      },
      undefined,
      undefined,
      SourceSchema
    );

    const out = fromCommon({ id: "abc-123", title: "Test Opp" } as never);

    expect(out.errors).toEqual([]);
    expect(out.result).toEqual({ native_id: "abc-123", native_title: "Test Opp" });
  });

  it("produces one TransformError per ZodIssue from sourceSchema (same aggregation contract as commonSchema)", () => {
    const SourceSchema = z.object({
      a: z.string().min(5),
      b: z.number().int(),
    });

    const { fromCommon } = buildTransforms(
      {},
      {
        a: { const: "x" },
        b: { const: "not-a-number" },
      },
      undefined,
      undefined,
      SourceSchema
    );

    const out = fromCommon({} as never);

    expect(out.errors).toHaveLength(2);
    expect(out.errors.every(e => e instanceof TransformError)).toBe(true);
    const paths = out.errors.map(e => e.path).sort();
    expect(paths).toEqual(["a", "b"]);
  });
});

// ############################################################################
// Null preservation — three-state contract
// ############################################################################

describe("buildTransforms — null preservation (three-state)", () => {
  // Optional fields carry three distinct states on the wire: absent ("not
  // provided"), explicit `null` ("doesn't apply"), and a value. The transform
  // handlers preserve all three so the publisher's assertion survives
  // end-to-end through `toCommon` / `fromCommon`.

  it("preserves explicit null on the toCommon side (publisher 'doesn't apply')", () => {
    // Source has `description: null` — publisher asserts the field doesn't
    // apply for this record. The `field` handler returns the terminal null;
    // the walker places it on the output object as a real `null`, distinct
    // from an absent key.
    const { toCommon } = buildTransforms(
      {
        id: { field: "data.opportunity_uuid" },
        title: { field: "data.opportunity_title" },
        description: { field: "data.opportunity_description" },
      },
      {}
    );

    const out = toCommon({
      data: {
        opportunity_uuid: "uuid-1",
        opportunity_title: "T",
        opportunity_description: null,
      },
    });

    expect(out.errors).toEqual([]);
    expect(out.result).toEqual({
      id: "uuid-1",
      title: "T",
      description: null,
    });
    // Pin the absent vs. null distinction explicitly.
    expect((out.result as Record<string, unknown>).description).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(out.result, "description")).toBe(true);
  });

  it("validates a null-bearing toCommon result against a .nullish() Zod schema", () => {
    // SDKs already accept null on `.nullish()` fields; this
    // pins it inside the buildTransforms() Zod path so a future schema
    // change that swapped `.nullish()` for plain `.optional()` would surface
    // here as a TransformError. `source` is `.nullish()` on OpportunityBaseSchema;
    // `description` is required (z.string()) so it can't carry the null state.
    const { toCommon } = buildTransforms(
      {
        ...toCommonMapping,
        source: { field: "data.source_url" },
      },
      {},
      undefined,
      OpportunityBaseSchema
    );

    const out = toCommon({
      data: {
        ...SOURCE_DATA.data,
        source_url: null,
      },
    });

    expect(out.errors).toEqual([]);
    expect((out.result as { source: string | null }).source).toBeNull();
  });

  it("preserves null through a full toCommon → fromCommon round trip", () => {
    // The reverse direction must also carry null verbatim — `null` on the
    // CommonGrants side ("publisher said doesn't apply") survives back to
    // the native shape.
    const { toCommon, fromCommon } = buildTransforms(
      {
        id: { field: "data.opportunity_uuid" },
        title: { field: "data.opportunity_title" },
        description: { field: "data.opportunity_description" },
      },
      {
        data: {
          opportunity_uuid: { field: "id" },
          opportunity_title: { field: "title" },
          opportunity_description: { field: "description" },
        },
      }
    );

    const cg = toCommon({
      data: {
        opportunity_uuid: "uuid-1",
        opportunity_title: "T",
        opportunity_description: null,
      },
    });
    expect(cg.errors).toEqual([]);
    expect((cg.result as { description: string | null }).description).toBeNull();

    const back = fromCommon(cg.result);
    expect(back.errors).toEqual([]);
    expect(
      (back.result as { data: { opportunity_description: string | null } }).data
        .opportunity_description
    ).toBeNull();
  });

  it("preserves null through the numberToString handler in a real mapping", () => {
    // Cross-check that the coercing handlers carry null in a buildTransforms
    // context, not just at the unit-test level.
    const { toCommon } = buildTransforms(
      { legacyId: { numberToString: "data.opportunity_id" } },
      {}
    );

    const out = toCommon({ data: { opportunity_id: null } });

    expect(out.errors).toEqual([]);
    expect(out.result).toEqual({ legacyId: null });
  });

  it("distinguishes absent from null at the buildTransforms boundary", () => {
    // Pin the asymmetry the three-state contract depends on: absent source
    // produces an absent output KEY; null source produces a present, explicit
    // null. The distinction is by key presence, not just by value — both an
    // absent key and a present-`undefined` key read as `undefined` via
    // property access, so this test asserts `hasOwnProperty` directly.
    const { toCommon } = buildTransforms(
      {
        absentField: { field: "data.does_not_exist" },
        nullField: { field: "data.declared_null" },
      },
      {}
    );

    const out = toCommon({ data: { declared_null: null } });

    expect(out.errors).toEqual([]);
    const result = out.result as Record<string, unknown>;
    // null source ("doesn't apply") → present key with value null.
    expect(result).toHaveProperty("nullField");
    expect(result.nullField).toBeNull();
    // absent source ("not provided") → key omitted entirely. The walker skips
    // `undefined`-valued children so the in-memory object matches the wire
    // shape `JSON.stringify` produces.
    expect(result).not.toHaveProperty("absentField");
    expect(result.absentField).toBeUndefined();
  });
});

// ############################################################################
// Custom handlers
// ############################################################################

describe("TransformError — serialization", () => {
  // The SDK does not redact by default. Both tests
  // assert on the same TransformError instance — one without redaction (PII
  // flows), one with the adopter-supplied projection (PII contained).
  // Forcing one shared setup keeps "redacted vs. raw is the only delta" a
  // structural property of the test code rather than just narration.
  let err: TransformError;

  beforeEach(() => {
    const { toCommon } = buildTransforms({ amount: { stringToNumber: "data.bogus" } }, {});
    [err] = toCommon({ data: { bogus: "abc", ssn: "PII_PAYLOAD_123" } }).errors;
  });

  it("includes sourceValue and cause in JSON.stringify by default — adopters redact", () => {
    expect(err).toBeInstanceOf(TransformError);
    expect(err.sourceValue).toEqual({ data: { bogus: "abc", ssn: "PII_PAYLOAD_123" } });
    expect(err.cause).toBeInstanceOf(Error);

    // No redaction by default: PII flows through JSON.stringify.
    const serialized = JSON.stringify(err);
    expect(serialized).toContain("PII_PAYLOAD_123");
    expect(serialized).toContain("sourceValue");
  });

  it("supports an adopter-provided redacted projection for safe logging", () => {
    // The projection adopters are documented to use (see README).
    const safe = {
      name: err.name,
      message: err.message,
      path: err.path,
      handler: err.handler,
    };
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("PII_PAYLOAD_123");
    expect(JSON.parse(serialized)).toEqual({
      name: "TransformError",
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

    const { toCommon } = buildTransforms(
      {
        label: {
          join: { fields: ["data.opportunity_number", "data.opportunity_title"], sep: " — " },
        },
      },
      {},
      new Map([["join", join]])
    );

    const out = toCommon(SOURCE_DATA);
    expect(out.errors).toEqual([]);
    expect((out.result as { label: string }).label).toBe(
      "ABC-123-XYZ-001 — Research into conservation techniques"
    );
  });
});

// ############################################################################
// Output key validation (commonSchema provided)
// ############################################################################

describe("buildTransforms — output key validation (commonSchema provided)", () => {
  it("throws when a top-level mapping key is not a field on the schema", () => {
    expect(() =>
      buildTransforms({ titlee: { field: "data.title" } }, {}, undefined, OpportunityBaseSchema)
    ).toThrow(/unknown output fields.*"titlee"/);
  });

  it("accepts all valid top-level schema field names", () => {
    expect(() =>
      buildTransforms({ title: { field: "data.title" } }, {}, undefined, OpportunityBaseSchema)
    ).not.toThrow();
  });

  it("accepts valid fields on a schema extended with withCustomFields()", () => {
    const extended = withCustomFields(OpportunityBaseSchema, {
      legacyId: { fieldType: CustomFieldType.string },
    });
    // Base fields remain valid on the extended schema
    expect(() =>
      buildTransforms({ title: { field: "data.title" } }, {}, undefined, extended)
    ).not.toThrow();
  });

  it("does not throw when commonSchema is absent", () => {
    // No commonSchema → output key validation is skipped entirely
    expect(() => buildTransforms({ notAField: { field: "data.x" } }, {})).not.toThrow();
  });

  it("silently passes when commonSchema is not a ZodObject", () => {
    // ZodRecord is not instanceof ZodObject — permissive fallback, no throw
    const nonObjectModel = z.record(z.unknown());
    expect(() =>
      buildTransforms({ anyKey: { field: "data.x" } }, {}, undefined, nonObjectModel)
    ).not.toThrow();
  });

  it("does not validate fromCommonMapping output keys when only commonSchema is provided", () => {
    // commonSchema validates toCommon output — fromCommonMapping is not checked
    expect(() =>
      buildTransforms(
        { title: { field: "data.title" } },
        { notAField: { field: "title" } },
        undefined,
        OpportunityBaseSchema
      )
    ).not.toThrow();
  });

  it("validates fromCommonMapping output keys when sourceSchema is a ZodObject", () => {
    const SourceSchema = z.object({ native_title: z.string() });
    expect(() =>
      buildTransforms(
        {},
        { notANativeField: { field: "title" } },
        undefined,
        undefined,
        SourceSchema
      )
    ).toThrow(/unknown output fields.*"notANativeField"/);
  });

  it("does not validate fromCommonMapping output keys when sourceSchema is absent", () => {
    expect(() => buildTransforms({}, { notAField: { field: "title" } })).not.toThrow();
  });

  it("reports multiple unknown fields in the same error", () => {
    expect(
      () =>
        buildTransforms(
          { titlee: { field: "data.title" }, descripton: { field: "data.desc" } },
          {},
          undefined,
          OpportunityBaseSchema
        )
      // Keys are sorted before joining, so "descripton" comes before "titlee"
    ).toThrow(/unknown output fields.*"descripton".*"titlee"/);
  });

  it("rejects a custom-field name placed at the top level, even on the extended schema", () => {
    const extended = withCustomFields(OpportunityBaseSchema, {
      legacyId: { fieldType: CustomFieldType.string },
    });
    // legacyId lives under `customFields`, never as a top-level key
    expect(() =>
      buildTransforms({ legacyId: { field: "data.x" } }, {}, undefined, extended)
    ).toThrow(/unknown output fields.*"legacyId"/);
  });

  it("accepts a custom field mapped under the top-level customFields key", () => {
    const extended = withCustomFields(OpportunityBaseSchema, {
      legacyId: { fieldType: CustomFieldType.string },
    });
    expect(() =>
      buildTransforms({ customFields: { legacyId: { field: "data.x" } } }, {}, undefined, extended)
    ).not.toThrow();
  });
});
