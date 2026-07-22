import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BatchParseError, parseBatch } from "../../src/client/results";

const rowSchema = z.object({ id: z.string(), amount: z.number() });
const good = { id: "a", amount: 1 };
const bad = { id: "b", amount: "not-a-number" };

describe("parseBatch", () => {
  it("partitions valid rows into items and failures into errors", () => {
    const { items, errors } = parseBatch(rowSchema, [good, bad, { id: "c", amount: 3 }]);
    expect(items).toEqual([good, { id: "c", amount: 3 }]);
    expect(errors).toHaveLength(1);
    expect(errors[0].index).toBe(1);
    expect(errors[0].raw).toEqual(bad);
    expect(errors[0].error).toBeInstanceOf(z.ZodError);
  });

  it("returns empty errors for an all-valid batch", () => {
    const { items, errors } = parseBatch(rowSchema, [good]);
    expect(items).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("returns empty items and errors for an empty batch", () => {
    const { items, errors } = parseBatch(rowSchema, []);
    expect(items).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('throws BatchParseError on the first failure under "throw"', () => {
    expect(() => parseBatch(rowSchema, [good, bad], "throw")).toThrow(BatchParseError);
    try {
      parseBatch(rowSchema, [good, bad], "throw");
      expect.unreachable("parseBatch should have thrown");
    } catch (e) {
      if (!(e instanceof BatchParseError)) throw e;
      expect(e.failure.index).toBe(1);
      expect(e.failure.raw).toEqual(bad);
      expect(e.failure.error).toBeInstanceOf(z.ZodError);
    }
  });
});
