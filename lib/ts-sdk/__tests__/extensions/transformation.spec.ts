import { describe, it, expect } from "vitest";

// Public barrel only re-exports the high-level surface. Individual handler
// functions are imported directly from the source module for unit testing —
// they remain module-internal otherwise.
import { DEFAULT_HANDLERS, getFromPath, transformFromMapping } from "@/extensions";
import {
  constValue,
  HandlerError,
  numberToString,
  fieldValue,
  stringToNumber,
  switchOnValue,
} from "@/extensions/transformation";

// ############################################################################
// getFromPath
// ############################################################################

describe("getFromPath", () => {
  it("returns the value at a dot-notation path", () => {
    expect(getFromPath({ a: { b: { c: 42 } } }, "a.b.c")).toBe(42);
  });

  it("returns undefined when an intermediate step is missing", () => {
    expect(getFromPath({ a: { b: 1 } }, "a.c.d")).toBeUndefined();
  });

  it("returns undefined when a step traverses into a non-object", () => {
    expect(getFromPath({ a: 1 }, "a.b")).toBeUndefined();
  });

  it("returns the entire input on empty path", () => {
    const input = { a: 1 };
    expect(getFromPath(input, "")).toBe(input);
  });

  it("returns the provided default when missing", () => {
    expect(getFromPath({ a: 1 }, "z", "fallback")).toBe("fallback");
  });

  it("preserves the original value type (no coercion)", () => {
    expect(getFromPath({ a: false }, "a")).toBe(false);
    expect(getFromPath({ a: null }, "a")).toBeNull();
    expect(getFromPath({ a: 0 }, "a")).toBe(0);
  });

  it("does not resolve inherited prototype-chain properties", () => {
    // Mapping field paths can come from untrusted sources via
    // `mergeExtensions()`, so a path like `__proto__.polluted` must NOT
    // resolve to `Object.prototype.polluted`. The implementation uses
    // `Object.prototype.hasOwnProperty.call` rather than `in`; if a future
    // refactor switched back to `in`, these would silently resolve to the
    // prototype chain.
    expect(getFromPath({}, "__proto__")).toBeUndefined();
    expect(getFromPath({}, "__proto__.polluted")).toBeUndefined();
    expect(getFromPath({}, "constructor")).toBeUndefined();
    expect(getFromPath({}, "constructor.prototype.x")).toBeUndefined();
    expect(getFromPath({}, "toString")).toBeUndefined();
    expect(getFromPath({ a: 1 }, "a.toString")).toBeUndefined();
  });
});

// ############################################################################
// Individual handlers
// ############################################################################

describe("fieldValue", () => {
  it("wraps getFromPath with the field path arg", () => {
    expect(fieldValue({ x: { y: "z" } }, "x.y")).toBe("z");
  });

  it("returns undefined on missing path", () => {
    expect(fieldValue({ x: 1 }, "x.y")).toBeUndefined();
  });

  it("preserves terminal null ('doesn't apply')", () => {
    // `fieldValue` defers to `getFromPath`, which returns the terminal value
    // verbatim — so an explicit `null` survives unchanged. This pins the
    // three-state contract for the bare `field` handler.
    expect(fieldValue({ a: null }, "a")).toBeNull();
  });

  it("returns undefined when an intermediate null short-circuits the path", () => {
    // `null` means "doesn't apply for THIS field." A null
    // intermediate ("the parent doesn't apply") is treated as a propagating
    // assertion: child paths return undefined ("not provided") rather than
    // null, because the publisher made the assertion at the parent level.
    // Scoped-out for now; see the README "Null handling" section.
    expect(fieldValue({ a: null }, "a.b")).toBeUndefined();
  });
});

describe("constValue", () => {
  it("returns the literal regardless of source data", () => {
    expect(constValue({ ignored: true }, "USD")).toBe("USD");
    expect(constValue({}, 42)).toBe(42);
    expect(constValue(null, null)).toBeNull();
  });
});

describe("switchOnValue", () => {
  const spec = {
    field: "status",
    case: { posted: "open", archived: "closed" },
    default: "custom",
  };

  it("returns the case lookup when source value matches", () => {
    expect(switchOnValue({ status: "posted" }, spec)).toBe("open");
    expect(switchOnValue({ status: "archived" }, spec)).toBe("closed");
  });

  it("returns the default when no case matches", () => {
    expect(switchOnValue({ status: "forecasted" }, spec)).toBe("custom");
  });

  it("returns undefined when no default is provided and no case matches", () => {
    expect(switchOnValue({ status: "x" }, { field: "status", case: { y: 1 } })).toBeUndefined();
  });

  it("throws when spec is not an object (D2: fail loud on malformed mapping)", () => {
    // Prior contract returned `undefined` silently when `spec` was non-object,
    // which let a typo'd mapping like `{ match: "literal-where-spec-belongs" }`
    // produce missing fields with no error trail. New contract: throw, so the
    // walker wraps as `HandlerError` and the boundary materializes a
    // `PluginError` with `handler: "match"`.
    expect(() => switchOnValue({ status: "posted" }, "garbage")).toThrow(/spec must be an object/);
    expect(() => switchOnValue({ status: "posted" }, null)).toThrow(/spec must be an object/);
    expect(() => switchOnValue({ status: "posted" }, 42)).toThrow(/spec must be an object/);
    // Arrays pass `typeof === "object"` and non-null, but are not the
    // structural-object shape `switchOnValue` expects. A mapping like
    // `{ match: ["posted", "archived"] }` (plausible from a plugin author
    // hand-writing JSON config) would otherwise silently resolve to
    // `s.field`/`s.case`/`s.default` all-undefined and return undefined.
    expect(() => switchOnValue({ status: "posted" }, ["posted", "archived"])).toThrow(
      /spec must be an object/
    );
  });

  it("does not coerce numeric source values to string-keyed cases", () => {
    // TS uses an explicit `typeof val === "string"` guard. Python's PoC uses
    // bare `dict.get(val, default)` which would natively support non-string
    // keys; but for JSON-loaded mappings (where `case` keys are always
    // strings) the practical behavior matches — string-keyed lookup misses
    // a numeric `val`, falls through to `default`. TS pins this explicitly.
    expect(switchOnValue({ n: 1 }, { field: "n", case: { "1": "yes" }, default: "no" })).toBe("no");
    // String "1" still matches.
    expect(switchOnValue({ n: "1" }, { field: "n", case: { "1": "yes" }, default: "no" })).toBe(
      "yes"
    );
  });

  it("does not coerce boolean source values to string-keyed cases", () => {
    expect(switchOnValue({ b: true }, { field: "b", case: { true: "yes" }, default: "no" })).toBe(
      "no"
    );
    expect(switchOnValue({ b: false }, { field: "b", case: { false: "yes" }, default: "no" })).toBe(
      "no"
    );
  });

  it("returns the default when the field is missing (no `undefined` string coercion)", () => {
    // Prior implementation coerced missing-field `undefined` to the literal
    // string "undefined" and matched a `case: { undefined: ... }` entry. The
    // current contract returns `default` when the source value is non-string,
    // even if a `case` entry happens to be keyed `"undefined"`.
    expect(
      switchOnValue({}, { field: "missing", case: { undefined: "matched" }, default: "no" })
    ).toBe("no");
  });

  it("returns the default when `field` is omitted (object source not key-coercible)", () => {
    // With no `field`, `getFromPath` returns the whole `data` object;
    // an object value is non-string and short-circuits to `default`.
    expect(switchOnValue({ a: 1 }, { case: { a: "b" }, default: "fallback" })).toBe("fallback");
  });

  // Three-state preservation for null source values. The mapping
  // author opts in to target-side translation via a `"null"` case key;
  // otherwise the publisher's "doesn't apply" assertion passes through
  // unchanged. `default` is NOT consulted for null — `default` belongs to
  // "unrecognized value," not to "publisher asserts irrelevant."

  it("passes null source through as null when no `case.null` is provided", () => {
    expect(switchOnValue({ status: null }, spec)).toBeNull();
  });

  it("does NOT fall through to `default` for a null source (default is for unrecognized values)", () => {
    // The current spec has `default: "custom"`. If null source incorrectly
    // fell through to default, this would be "custom" instead of null.
    expect(switchOnValue({ status: null }, spec)).not.toBe("custom");
  });

  it("uses a `case.null` mapping when the author opts in (target-side translation)", () => {
    // A mapping author who wants to translate the publisher's "doesn't
    // apply" assertion into a target-side sentinel (e.g. an `n_a` status
    // token) opts in by adding a `"null"` key to the case map.
    expect(
      switchOnValue(
        { status: null },
        { field: "status", case: { posted: "open", null: "n_a" }, default: "custom" }
      )
    ).toBe("n_a");
  });

  it("opt-in null mapping wins over the pass-through default", () => {
    // Pin the precedence: case.null takes priority over the pass-through
    // null behavior. (Documents that the author's explicit decision
    // overrides the SDK's default treatment.)
    expect(switchOnValue({ status: null }, { field: "status", case: { null: "translated" } })).toBe(
      "translated"
    );
  });
});

describe("numberToString", () => {
  it("coerces a number to its string form", () => {
    expect(numberToString({ amount: 1000 }, "amount")).toBe("1000");
    expect(numberToString({ x: 1.5 }, "x")).toBe("1.5");
  });

  it("returns null on explicit null source ('doesn't apply')", () => {
    // The publisher asserted the field is irrelevant for this record. The
    // handler must preserve that assertion instead of collapsing it to
    // `undefined` (which would be indistinguishable from "not provided").
    // `String(null)` is bypassed — it would otherwise emit the literal "null".
    expect(numberToString({ a: null }, "a")).toBeNull();
  });

  it("returns undefined on absent source ('not provided')", () => {
    expect(numberToString({}, "a")).toBeUndefined();
  });
});

describe("stringToNumber", () => {
  it("parses an integer string as a number", () => {
    expect(stringToNumber({ a: "42" }, "a")).toBe(42);
  });

  it("parses a decimal string via the float fallback", () => {
    expect(stringToNumber({ a: "1.5" }, "a")).toBe(1.5);
  });

  it("returns null on explicit null source ('doesn't apply')", () => {
    // Parallels numberToString — null is the publisher's assertion that the
    // field doesn't apply. Preserve it as data; don't collapse to undefined.
    expect(stringToNumber({ a: null }, "a")).toBeNull();
  });

  it("returns undefined on absent source ('not provided')", () => {
    expect(stringToNumber({}, "x")).toBeUndefined();
  });

  it("throws on non-numeric input", () => {
    expect(() => stringToNumber({ a: "abc" }, "a")).toThrow(/cannot convert/);
  });

  it("throws on the empty string (would otherwise coerce to 0)", () => {
    // `Number("")` returns 0 in JavaScript, which would silently turn an
    // implicit-absent CSV cell into a real zero on the transformed side.
    expect(() => stringToNumber({ a: "" }, "a")).toThrow(/cannot convert/);
  });

  it("throws on a whitespace-only string (post-trim empty)", () => {
    // `Number("  ")` also coerces to 0; the trim-then-empty-check covers it.
    expect(() => stringToNumber({ a: "   " }, "a")).toThrow(/cannot convert/);
  });

  it("accepts integer strings up to Number.MAX_SAFE_INTEGER", () => {
    expect(stringToNumber({ a: String(Number.MAX_SAFE_INTEGER) }, "a")).toBe(
      Number.MAX_SAFE_INTEGER
    );
    expect(stringToNumber({ a: String(Number.MIN_SAFE_INTEGER) }, "a")).toBe(
      Number.MIN_SAFE_INTEGER
    );
  });

  it("throws on integer strings beyond the safe-integer range (no silent precision loss)", () => {
    // Without the safe-integer guard, `Number("9999999999999999999")` would
    // return `1e19` — a different value than the input. Plugin authors
    // round-tripping 64-bit IDs would see silent corruption. Reject instead.
    expect(() => stringToNumber({ a: "9999999999999999999" }, "a")).toThrow(/cannot convert/);
    expect(() => stringToNumber({ a: "-9999999999999999999" }, "a")).toThrow(/cannot convert/);
  });
});

// ############################################################################
// DEFAULT_HANDLERS registry
// ############################################################################

describe("DEFAULT_HANDLERS", () => {
  it("registers all built-in handler names", () => {
    expect(Object.keys(DEFAULT_HANDLERS).sort()).toEqual(
      ["const", "field", "match", "numberToString", "stringToNumber", "switch"].sort()
    );
  });

  it("points `match` and `switch` at the same handler function (alias)", () => {
    expect(DEFAULT_HANDLERS.match).toBe(DEFAULT_HANDLERS.switch);
  });

  it("is frozen to prevent runtime mutation", () => {
    expect(Object.isFrozen(DEFAULT_HANDLERS)).toBe(true);
  });
});

// ############################################################################
// transformFromMapping
// ############################################################################

describe("transformFromMapping", () => {
  it("returns primitives unchanged", () => {
    expect(transformFromMapping({}, "literal")).toBe("literal");
    expect(transformFromMapping({}, 42)).toBe(42);
    expect(transformFromMapping({}, null)).toBeNull();
  });

  it("preserves output object shape and recurses on each value", () => {
    const data = { foo: { bar: "baz" } };
    const mapping = {
      a: { field: "foo.bar" },
      b: { value: { field: "foo.bar" }, currency: "USD" },
    };
    expect(transformFromMapping(data, mapping)).toEqual({
      a: "baz",
      b: { value: "baz", currency: "USD" },
    });
  });

  it("dispatches built-in handlers via the registry", () => {
    expect(
      transformFromMapping(
        { s: "posted" },
        {
          match: { field: "s", case: { posted: "open" }, default: "custom" },
        }
      )
    ).toBe("open");
  });

  it("supports the `switch` alias for `match`", () => {
    expect(
      transformFromMapping(
        { s: "posted" },
        {
          switch: { field: "s", case: { posted: "open" }, default: "custom" },
        }
      )
    ).toBe("open");
  });

  it("reads only the first key of a handler-dispatch node — sibling keys are silently ignored", () => {
    // Locks in the documented walker contract: a node whose first key is a
    // handler dispatches that handler with the corresponding arg, and the
    // remaining keys are dropped. Mixing handlers in one node is unsupported
    // by design; this test prevents a regression that would start treating
    // the node as an output shape.
    const mapping = { field: "x", const: "fallback-ignored" };
    expect(transformFromMapping({ x: "value-from-field" }, mapping)).toBe("value-from-field");
  });

  it("throws on max-depth excess", () => {
    // Build a deeply nested mapping that exceeds the default max depth.
    let deep: unknown = "leaf";
    for (let i = 0; i < 600; i++) deep = { nested: deep };
    expect(() => transformFromMapping({}, deep)).toThrow(/Maximum transformation depth/);
  });

  it("wraps handler exceptions in HandlerError carrying the handler name", () => {
    let caught: unknown;
    try {
      transformFromMapping({ x: "not-a-number" }, { stringToNumber: "x" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(HandlerError);
    expect((caught as HandlerError).handler).toBe("stringToNumber");
    expect((caught as Error).message).toMatch(/cannot convert/);
  });

  it("ignores inherited prototype keys when dispatching (prototype-pollution hardening)", () => {
    const mapping: Record<string, unknown> = {};
    // toString exists on Object.prototype but is not a registered handler key.
    mapping["toString"] = { field: "x" };
    // Should treat `toString` as an output field name, not as a handler dispatch.
    const out = transformFromMapping({ x: 1 }, mapping);
    expect(out).toEqual({ toString: 1 });
  });

  it("preserves a handler-returned null on the output object (three-state)", () => {
    // The walker must place `null` returned by a handler onto the output
    // shape — not drop the key, not coerce to undefined. Combined with the
    // null-aware handlers, this preserves the publisher's "doesn't apply"
    // assertion end-to-end through `toCommon` / `fromCommon`.
    expect(transformFromMapping({ a: null }, { x: { numberToString: "a" } })).toEqual({
      x: null,
    });
    expect(transformFromMapping({ a: null }, { x: { stringToNumber: "a" } })).toEqual({
      x: null,
    });
    expect(
      transformFromMapping({ status: null }, { value: { match: { field: "status" } } })
    ).toEqual({ value: null });
  });

  it("omits an output key whose handler returned undefined ('not provided')", () => {
    // Counterpart to the null-preservation test above: an absent source field
    // produces `undefined` from the handler, and the walker must OMIT the key
    // rather than write `{ x: undefined }`. This is what makes the in-memory
    // object distinguish "not provided" (key absent) from "doesn't apply"
    // (key present, value null). `toEqual` treats `{}` and `{ x: undefined }`
    // as equal, so assert key presence with `hasOwnProperty` directly.
    const out = transformFromMapping({}, { x: { numberToString: "missing" } }) as Record<
      string,
      unknown
    >;
    expect(Object.prototype.hasOwnProperty.call(out, "x")).toBe(false);
    // A sibling present key is still written — only the undefined child is dropped.
    const mixed = transformFromMapping(
      { a: 42 },
      { present: { numberToString: "a" }, absent: { field: "nope" } }
    ) as Record<string, unknown>;
    expect(mixed).toEqual({ present: "42" });
    expect(Object.prototype.hasOwnProperty.call(mixed, "absent")).toBe(false);
  });

  it("rejects `__proto__` as an output field name (prototype-pollution hardening)", () => {
    // JSON.parse adds `__proto__` as an own enumerable property (it uses
    // CreateDataProperty, not Set, so the inherited setter never fires) — that's
    // the actual attack vector. Assignment via `obj["__proto__"] = ...` would
    // instead invoke the prototype setter and silently drop the key.
    // The walker must reject the name so attacker-controlled mapping JSON can't
    // suppress an output field by claiming it.
    const mapping = JSON.parse('{"__proto__": {"field": "x"}}') as Record<string, unknown>;
    expect(() => transformFromMapping({ x: 1 }, mapping)).toThrow(/'__proto__' is not allowed/);
  });
});
