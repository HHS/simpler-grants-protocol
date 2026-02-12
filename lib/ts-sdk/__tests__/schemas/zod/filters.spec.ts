import { describe, it, expect } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper";
import {
  EquivalenceOperatorsEnum,
  ComparisonOperatorsEnum,
  ArrayOperatorsEnum,
  StringOperatorsEnum,
  RangeOperatorsEnum,
  AllOperatorsEnum,
  DefaultFilterSchema,
  StringComparisonFilterSchema,
  StringArrayFilterSchema,
  NumberComparisonFilterSchema,
  NumberRangeFilterSchema,
  NumberArrayFilterSchema,
  DateComparisonFilterSchema,
  DateRangeFilterSchema,
  MoneyComparisonFilterSchema,
  MoneyRangeFilterSchema,
} from "@/schemas";

// ############################################################################
// Equivalence operators
// ############################################################################

describe("EquivalenceOperatorsEnum", () => {
  const jsonSchemaId = "EquivalenceOperators.yaml";

  it("should validate a valid EquivalenceOperatorsEnum", () => {
    expect(EquivalenceOperatorsEnum.parse("eq")).toBe("eq");
    expect(EquivalenceOperatorsEnum.parse("neq")).toBe("neq");
  });

  it("should match equivalenceOperatorsEnum.yaml", () => {
    expectZodMatchesJsonSchema(EquivalenceOperatorsEnum, jsonSchemaId);
  });

  it("should raise an error for an invalid EquivalenceOperatorsEnum", () => {
    // "invalid" is not a valid operator
    expect(() => EquivalenceOperatorsEnum.parse("invalid")).toThrow();
    // "gt" is a comparison operator, not an equivalence operator
    expect(() => EquivalenceOperatorsEnum.parse("gt")).toThrow();
  });
});

// ############################################################################
// Comparison operators
// ############################################################################

describe("ComparisonOperatorsEnum", () => {
  const jsonSchemaId = "ComparisonOperators.yaml";

  it("should validate a valid ComparisonOperatorsEnum", () => {
    expect(ComparisonOperatorsEnum.parse("gt")).toBe("gt");
    expect(ComparisonOperatorsEnum.parse("gte")).toBe("gte");
    expect(ComparisonOperatorsEnum.parse("lt")).toBe("lt");
    expect(ComparisonOperatorsEnum.parse("lte")).toBe("lte");
  });

  it("should match comparisonOperatorsEnum.yaml", () => {
    expectZodMatchesJsonSchema(ComparisonOperatorsEnum, jsonSchemaId);
  });

  it("should raise an error for an invalid ComparisonOperatorsEnum", () => {
    // "invalid" is not a valid operator
    expect(() => ComparisonOperatorsEnum.parse("invalid")).toThrow();
    // "eq" is an equivalence operator, not a comparison operator
    expect(() => ComparisonOperatorsEnum.parse("eq")).toThrow();
  });
});

// ############################################################################
// Array operators
// ############################################################################

describe("ArrayOperatorsEnum", () => {
  const jsonSchemaId = "ArrayOperators.yaml";

  it("should validate a valid ArrayOperatorsEnum", () => {
    expect(ArrayOperatorsEnum.parse("in")).toBe("in");
    expect(ArrayOperatorsEnum.parse("notIn")).toBe("notIn");
  });

  it("should match arrayOperatorsEnum.yaml", () => {
    expectZodMatchesJsonSchema(ArrayOperatorsEnum, jsonSchemaId);
  });

  it("should raise an error for an invalid ArrayOperatorsEnum", () => {
    // "invalid" is not a valid operator
    expect(() => ArrayOperatorsEnum.parse("invalid")).toThrow();
    // "eq" is an equivalence operator, not an array operator
    expect(() => ArrayOperatorsEnum.parse("eq")).toThrow();
  });
});

// ############################################################################
// String operators
// ############################################################################

describe("StringOperatorsEnum", () => {
  const jsonSchemaId = "StringOperators.yaml";

  it("should validate a valid StringOperatorsEnum", () => {
    expect(StringOperatorsEnum.parse("like")).toBe("like");
    expect(StringOperatorsEnum.parse("notLike")).toBe("notLike");
  });

  it("should match stringOperatorsEnum.yaml", () => {
    expectZodMatchesJsonSchema(StringOperatorsEnum, jsonSchemaId);
  });

  it("should raise an error for an invalid StringOperatorsEnum", () => {
    // "invalid" is not a valid operator
    expect(() => StringOperatorsEnum.parse("invalid")).toThrow();
    // "eq" is an equivalence operator, not a string operator
    expect(() => StringOperatorsEnum.parse("eq")).toThrow();
  });
});

// ############################################################################
// Range operators
// ############################################################################

describe("RangeOperatorsEnum", () => {
  const jsonSchemaId = "RangeOperators.yaml";

  it("should validate a valid RangeOperatorsEnum", () => {
    expect(RangeOperatorsEnum.parse("between")).toBe("between");
    expect(RangeOperatorsEnum.parse("outside")).toBe("outside");
  });

  it("should match rangeOperatorsEnum.yaml", () => {
    expectZodMatchesJsonSchema(RangeOperatorsEnum, jsonSchemaId);
  });

  it("should raise an error for an invalid RangeOperatorsEnum", () => {
    // "invalid" is not a valid operator
    expect(() => RangeOperatorsEnum.parse("invalid")).toThrow();
    // "eq" is an equivalence operator, not a range operator
    expect(() => RangeOperatorsEnum.parse("eq")).toThrow();
  });
});

// ############################################################################
// All operators
// ############################################################################

describe("AllOperatorsEnum", () => {
  const jsonSchemaId = "AllOperators.yaml";

  it("should validate a valid AllOperatorsEnum", () => {
    expect(AllOperatorsEnum.parse("eq")).toBe("eq");
    expect(AllOperatorsEnum.parse("gt")).toBe("gt");
    expect(AllOperatorsEnum.parse("in")).toBe("in");
    expect(AllOperatorsEnum.parse("like")).toBe("like");
    expect(AllOperatorsEnum.parse("between")).toBe("between");
  });

  it("should match allOperatorsEnum.yaml", () => {
    expectZodMatchesJsonSchema(AllOperatorsEnum, jsonSchemaId);
  });

  it("should raise an error for an invalid AllOperatorsEnum", () => {
    // "invalid" is not a valid operator
    expect(() => AllOperatorsEnum.parse("invalid")).toThrow();
    // "unknown" is not a valid operator
    expect(() => AllOperatorsEnum.parse("unknown")).toThrow();
  });
});

// ############################################################################
// Default filter
// ############################################################################

describe("DefaultFilter Schema", () => {
  const jsonSchemaId = "DefaultFilter.yaml";

  it("should validate a valid DefaultFilter", () => {
    const validFilter = { operator: "eq", value: "test" };
    expect(DefaultFilterSchema.parse(validFilter)).toEqual(validFilter);
  });

  it("should match defaultFilter.yaml", () => {
    expectZodMatchesJsonSchema(DefaultFilterSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid DefaultFilter", () => {
    // "invalid" is not a valid operator
    expect(() => DefaultFilterSchema.parse({ operator: "invalid", value: "test" })).toThrow();
    // Missing required "operator" field
    expect(() => DefaultFilterSchema.parse({ value: "test" })).toThrow();
  });
});

// ############################################################################
// String comparison filter
// ############################################################################

describe("StringComparisonFilter Schema", () => {
  const jsonSchemaId = "StringComparisonFilter.yaml";

  it("should validate a valid StringComparisonFilter", () => {
    const validFilter = { operator: "eq", value: "test" };
    expect(StringComparisonFilterSchema.parse(validFilter)).toEqual(validFilter);
  });

  it("should match stringComparisonFilter.yaml", () => {
    expectZodMatchesJsonSchema(StringComparisonFilterSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid StringComparisonFilter", () => {
    // "gt" is not allowed for string comparisons (only equivalence and string operators)
    expect(() => StringComparisonFilterSchema.parse({ operator: "gt", value: "test" })).toThrow();
    // Value must be a string, not a number
    expect(() => StringComparisonFilterSchema.parse({ operator: "eq", value: 123 })).toThrow();
    // Missing required "value" field
    expect(() => StringComparisonFilterSchema.parse({ operator: "eq" })).toThrow();
  });
});

// ############################################################################
// String array filter
// ############################################################################

describe("StringArrayFilter Schema", () => {
  const jsonSchemaId = "StringArrayFilter.yaml";

  it("should validate a valid StringArrayFilter", () => {
    const validFilter = { operator: "in", value: ["test1", "test2"] };
    expect(StringArrayFilterSchema.parse(validFilter)).toEqual(validFilter);
  });

  it("should match stringArrayFilter.yaml", () => {
    expectZodMatchesJsonSchema(StringArrayFilterSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid StringArrayFilter", () => {
    // "eq" is not an array operator (only "in" and "notIn" are allowed)
    expect(() => StringArrayFilterSchema.parse({ operator: "eq", value: ["test"] })).toThrow();
    // Value must be an array, not a string
    expect(() => StringArrayFilterSchema.parse({ operator: "in", value: "test" })).toThrow();
    // Array elements must be strings, not numbers
    expect(() => StringArrayFilterSchema.parse({ operator: "in", value: [123] })).toThrow();
  });
});

// ############################################################################
// Number comparison filter
// ############################################################################

describe("NumberComparisonFilter Schema", () => {
  const jsonSchemaId = "NumberComparisonFilter.yaml";

  it("should validate a valid NumberComparisonFilter", () => {
    const validFilter = { operator: "gt", value: 100 };
    expect(NumberComparisonFilterSchema.parse(validFilter)).toEqual(validFilter);
  });

  it("should match numberComparisonFilter.yaml", () => {
    expectZodMatchesJsonSchema(NumberComparisonFilterSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid NumberComparisonFilter", () => {
    // "in" is not a comparison operator (only eq, neq, gt, gte, lt, lte are allowed)
    expect(() => NumberComparisonFilterSchema.parse({ operator: "in", value: 100 })).toThrow();
    // Value must be a number, not a string
    expect(() => NumberComparisonFilterSchema.parse({ operator: "gt", value: "100" })).toThrow();
    // Missing required "value" field
    expect(() => NumberComparisonFilterSchema.parse({ operator: "gt" })).toThrow();
  });
});

// ############################################################################
// Number range filter
// ############################################################################

describe("NumberRangeFilter Schema", () => {
  const jsonSchemaId = "NumberRangeFilter.yaml";

  it("should validate a valid NumberRangeFilter", () => {
    const validFilter = { operator: "between", value: { min: 10, max: 100 } };
    expect(NumberRangeFilterSchema.parse(validFilter)).toEqual(validFilter);
  });

  it("should match numberRangeFilter.yaml", () => {
    expectZodMatchesJsonSchema(NumberRangeFilterSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid NumberRangeFilter", () => {
    // "eq" is not a range operator (only "between" and "outside" are allowed)
    expect(() =>
      NumberRangeFilterSchema.parse({ operator: "eq", value: { min: 10, max: 100 } })
    ).toThrow();
    // min value must be a number, not a string
    expect(() =>
      NumberRangeFilterSchema.parse({ operator: "between", value: { min: "10", max: 100 } })
    ).toThrow();
    // Missing required "max" field in value object
    expect(() =>
      NumberRangeFilterSchema.parse({ operator: "between", value: { min: 10 } })
    ).toThrow();
  });
});

// ############################################################################
// Number array filter
// ############################################################################

describe("NumberArrayFilter Schema", () => {
  const jsonSchemaId = "NumberArrayFilter.yaml";

  it("should validate a valid NumberArrayFilter", () => {
    const validFilter = { operator: "in", value: [1, 2, 3] };
    expect(NumberArrayFilterSchema.parse(validFilter)).toEqual(validFilter);
  });

  it("should match numberArrayFilter.yaml", () => {
    expectZodMatchesJsonSchema(NumberArrayFilterSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid NumberArrayFilter", () => {
    // "eq" is not an array operator (only "in" and "notIn" are allowed)
    expect(() => NumberArrayFilterSchema.parse({ operator: "eq", value: [1, 2] })).toThrow();
    // Value must be an array, not a number
    expect(() => NumberArrayFilterSchema.parse({ operator: "in", value: 123 })).toThrow();
    // Array elements must be numbers, not strings
    expect(() => NumberArrayFilterSchema.parse({ operator: "in", value: ["1", "2"] })).toThrow();
  });
});

// ############################################################################
// Date comparison filter
// ############################################################################

describe("DateComparisonFilter Schema", () => {
  const jsonSchemaId = "DateComparisonFilter.yaml";

  it("should validate a valid DateComparisonFilter", () => {
    const validFilter = { operator: "gt", value: "2021-01-01" };
    expect(DateComparisonFilterSchema.parse(validFilter)).toEqual(validFilter);
  });

  it("should match dateComparisonFilter.yaml", () => {
    expectZodMatchesJsonSchema(DateComparisonFilterSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid DateComparisonFilter", () => {
    // "eq" is not a comparison operator (only gt, gte, lt, lte are allowed)
    expect(() =>
      DateComparisonFilterSchema.parse({ operator: "eq", value: "2021-01-01" })
    ).toThrow();
    // Value must be a valid ISO date or datetime string
    expect(() =>
      DateComparisonFilterSchema.parse({ operator: "gt", value: "invalid-date" })
    ).toThrow();
    // Missing required "value" field
    expect(() => DateComparisonFilterSchema.parse({ operator: "gt" })).toThrow();
  });
});

// ############################################################################
// Date range filter
// ############################################################################

describe("DateRangeFilter Schema", () => {
  const jsonSchemaId = "DateRangeFilter.yaml";

  it("should validate a valid DateRangeFilter", () => {
    const validFilter = { operator: "between", value: { min: "2021-01-01", max: "2021-12-31" } };
    expect(DateRangeFilterSchema.parse(validFilter)).toEqual(validFilter);
  });

  it("should match dateRangeFilter.yaml", () => {
    expectZodMatchesJsonSchema(DateRangeFilterSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid DateRangeFilter", () => {
    // "eq" is not a range operator (only "between" and "outside" are allowed)
    expect(() =>
      DateRangeFilterSchema.parse({
        operator: "eq",
        value: { min: "2021-01-01", max: "2021-12-31" },
      })
    ).toThrow();
    // min value must be a valid ISO date or datetime string
    expect(() =>
      DateRangeFilterSchema.parse({
        operator: "between",
        value: { min: "invalid", max: "2021-12-31" },
      })
    ).toThrow();
    // Missing required "max" field in value object
    expect(() =>
      DateRangeFilterSchema.parse({ operator: "between", value: { min: "2021-01-01" } })
    ).toThrow();
  });
});

// ############################################################################
// Money comparison filter
// ############################################################################

describe("MoneyComparisonFilter Schema", () => {
  const jsonSchemaId = "MoneyComparisonFilter.yaml";

  it("should validate a valid MoneyComparisonFilter", () => {
    const validFilter = { operator: "gt", value: { amount: "1000", currency: "USD" } };
    expect(MoneyComparisonFilterSchema.parse(validFilter)).toEqual(validFilter);
  });

  it("should match moneyComparisonFilter.yaml", () => {
    expectZodMatchesJsonSchema(MoneyComparisonFilterSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid MoneyComparisonFilter", () => {
    // "eq" is not a comparison operator (only gt, gte, lt, lte are allowed)
    expect(() =>
      MoneyComparisonFilterSchema.parse({
        operator: "eq",
        value: { amount: "1000", currency: "USD" },
      })
    ).toThrow();
    // amount must be a decimal string, not a number
    expect(() =>
      MoneyComparisonFilterSchema.parse({
        operator: "gt",
        value: { amount: 1000, currency: "USD" },
      })
    ).toThrow();
    // Missing required "currency" field in value object
    expect(() =>
      MoneyComparisonFilterSchema.parse({ operator: "gt", value: { amount: "1000" } })
    ).toThrow();
  });
});

// ############################################################################
// Money range filter
// ############################################################################

describe("MoneyRangeFilter Schema", () => {
  const jsonSchemaId = "MoneyRangeFilter.yaml";

  it("should validate a valid MoneyRangeFilter", () => {
    const validFilter = {
      operator: "between",
      value: {
        min: { amount: "100", currency: "USD" },
        max: { amount: "1000", currency: "USD" },
      },
    };
    expect(MoneyRangeFilterSchema.parse(validFilter)).toEqual(validFilter);
  });

  it("should match moneyRangeFilter.yaml", () => {
    expectZodMatchesJsonSchema(MoneyRangeFilterSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid MoneyRangeFilter", () => {
    // "eq" is not a range operator (only "between" and "outside" are allowed)
    expect(() =>
      MoneyRangeFilterSchema.parse({
        operator: "eq",
        value: {
          min: { amount: "100", currency: "USD" },
          max: { amount: "1000", currency: "USD" },
        },
      })
    ).toThrow();
    // min.amount must be a decimal string, not a number
    expect(() =>
      MoneyRangeFilterSchema.parse({
        operator: "between",
        value: {
          min: { amount: 100, currency: "USD" },
          max: { amount: "1000", currency: "USD" },
        },
      })
    ).toThrow();
    // Missing required "max" field in value object
    expect(() =>
      MoneyRangeFilterSchema.parse({
        operator: "between",
        value: { min: { amount: "100", currency: "USD" } },
      })
    ).toThrow();
  });
});
