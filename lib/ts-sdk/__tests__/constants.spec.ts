import { describe, it, expect } from "vitest";
import * as Constants from "@/constants";
import * as Types from "@/types";

// Helper to check that all values in a constants object match the expected type
function checkAllValuesMatchType<T>(constants: Record<string, T>): void {
  const values = Object.values(constants);
  expect(values.length).toBeGreaterThan(0);
  // TypeScript will catch type mismatches at compile time
  // This runtime check ensures all values are defined
  values.forEach(value => {
    expect(value).toBeDefined();
    // Assign to typed variable to ensure type compatibility
    const typedValue: T = value;
    expect(typedValue).toBe(value);
  });
}

// ############################################################################
// Model enum constants
// ############################################################################

describe("Model enum constants", () => {
  it("should have OppStatusOptions values that match OppStatusOptions type", () => {
    checkAllValuesMatchType<Types.OppStatusOptions>(Constants.OppStatusOptions);
  });

  it("should have ApplicantTypeOptions values that match ApplicantTypeOptions type", () => {
    checkAllValuesMatchType<Types.ApplicantTypeOptions>(Constants.ApplicantTypeOptions);
  });

  it("should have OppSortBy values that match OppSortBy type", () => {
    checkAllValuesMatchType<Types.OppSortBy>(Constants.OppSortBy);
  });
});

// ############################################################################
// Filter operator enum constants
// ############################################################################

describe("Filter operator enum constants", () => {
  it("should have EquivalenceOperator values that match EquivalenceOperator type", () => {
    checkAllValuesMatchType<Types.EquivalenceOperator>(Constants.EquivalenceOperator);
  });

  it("should have ComparisonOperator values that match ComparisonOperator type", () => {
    checkAllValuesMatchType<Types.ComparisonOperator>(Constants.ComparisonOperator);
  });

  it("should have ArrayOperator values that match ArrayOperator type", () => {
    checkAllValuesMatchType<Types.ArrayOperator>(Constants.ArrayOperator);
  });

  it("should have StringOperator values that match StringOperator type", () => {
    checkAllValuesMatchType<Types.StringOperator>(Constants.StringOperator);
  });

  it("should have RangeOperator values that match RangeOperator type", () => {
    checkAllValuesMatchType<Types.RangeOperator>(Constants.RangeOperator);
  });
});

// ############################################################################
// Field enum constants
// ############################################################################

describe("Field enum constants", () => {
  it("should have EventType values that match EventType type", () => {
    checkAllValuesMatchType<Types.EventType>(Constants.EventType);
  });

  it("should have CustomFieldType values that match CustomFieldType type", () => {
    checkAllValuesMatchType<Types.CustomFieldType>(Constants.CustomFieldType);
  });
});
