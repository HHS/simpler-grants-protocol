import { describe, it, expect } from "vitest";

// Public barrel only re-exports the high-level surface (mirrors the Python PoC's
// extensions/__init__.py). Individual handler functions are imported directly from
// the source module for unit testing — they remain module-internal otherwise.
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

  it("does not resolve inherited prototype-chain properties (ADR-0022 Decision #8)", () => {
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
});

describe("numberToString", () => {
  it("coerces a number to its string form", () => {
    expect(numberToString({ amount: 1000 }, "amount")).toBe("1000");
    expect(numberToString({ x: 1.5 }, "x")).toBe("1.5");
  });

  it("returns undefined on null or missing", () => {
    expect(numberToString({ a: null }, "a")).toBeUndefined();
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

  it("returns undefined on null or missing", () => {
    expect(stringToNumber({}, "x")).toBeUndefined();
    expect(stringToNumber({ a: null }, "a")).toBeUndefined();
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

  it("points `match` and `switch` at the same handler function (ADR-0017 alias)", () => {
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

  it("ignores inherited prototype keys when dispatching (Decision #8 hardening)", () => {
    const mapping: Record<string, unknown> = {};
    // toString exists on Object.prototype but is not a registered handler key.
    mapping["toString"] = { field: "x" };
    // Should treat `toString` as an output field name, not as a handler dispatch.
    const out = transformFromMapping({ x: 1 }, mapping);
    expect(out).toEqual({ toString: 1 });
  });

  it("rejects `__proto__` as an output field name (Decision #8 hardening)", () => {
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
