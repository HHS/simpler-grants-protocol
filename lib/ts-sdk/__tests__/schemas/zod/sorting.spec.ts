import { describe, it, expect } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper";
import {
  SortOrderEnum,
  SortQueryParamsSchema,
  SortBodyParamsSchema,
  SortedResultsInfoSchema,
} from "@/schemas";

// ############################################################################
// SortOrder Enum
// ############################################################################

describe("SortOrder Enum", () => {
  it("should validate a valid SortOrder", () => {
    expect(SortOrderEnum.parse("asc")).toBe("asc");
    expect(SortOrderEnum.parse("desc")).toBe("desc");
  });

  it("should raise an error for an invalid SortOrder", () => {
    // Invalid enum value
    expect(() => SortOrderEnum.parse("ascending")).toThrow();
    expect(() => SortOrderEnum.parse("descending")).toThrow();
    expect(() => SortOrderEnum.parse("invalid")).toThrow();
    // Wrong type (not a string)
    expect(() => SortOrderEnum.parse(123)).toThrow();
    expect(() => SortOrderEnum.parse(null)).toThrow();
  });
});

// ############################################################################
// SortQueryParams Schema
// ############################################################################

describe("SortQueryParams Schema", () => {
  it("should validate a valid SortQueryParams with all fields", () => {
    const validParams = {
      sortBy: "lastModifiedAt",
      customSortBy: "customField",
      sortOrder: "asc" as const,
    };
    expect(SortQueryParamsSchema.parse(validParams)).toEqual(validParams);
  });

  it("should validate a valid SortQueryParams with required field only", () => {
    const validParams = {
      sortBy: "createdAt",
    };
    expect(SortQueryParamsSchema.parse(validParams)).toEqual(validParams);
  });

  it("should validate a valid SortQueryParams with optional fields", () => {
    const validParamsWithCustom = {
      sortBy: "lastModifiedAt",
      customSortBy: "customField",
    };
    expect(SortQueryParamsSchema.parse(validParamsWithCustom)).toEqual(validParamsWithCustom);

    const validParamsWithOrder = {
      sortBy: "createdAt",
      sortOrder: "desc" as const,
    };
    expect(SortQueryParamsSchema.parse(validParamsWithOrder)).toEqual(validParamsWithOrder);
  });

  it("should accept any type for sortBy", () => {
    // String
    expect(SortQueryParamsSchema.parse({ sortBy: "field" })).toBeDefined();
    // Number
    expect(SortQueryParamsSchema.parse({ sortBy: 123 })).toBeDefined();
    // Object
    expect(SortQueryParamsSchema.parse({ sortBy: { nested: "field" } })).toBeDefined();
    // Array
    expect(SortQueryParamsSchema.parse({ sortBy: ["field1", "field2"] })).toBeDefined();
  });

  it("should raise an error for an invalid SortQueryParams", () => {
    // Invalid sortOrder enum value
    expect(() => SortQueryParamsSchema.parse({ sortBy: "field", sortOrder: "invalid" })).toThrow();
    // Wrong type for customSortBy (must be string if provided)
    expect(() => SortQueryParamsSchema.parse({ sortBy: "field", customSortBy: 123 })).toThrow();
  });
});

// ############################################################################
// SortBodyParams Schema
// ############################################################################

describe("SortBodyParams Schema", () => {
  it("should validate a valid SortBodyParams with all fields", () => {
    const validParams = {
      sortBy: "lastModifiedAt",
      customSortBy: "customField",
      sortOrder: "asc" as const,
    };
    expect(SortBodyParamsSchema.parse(validParams)).toEqual(validParams);
  });

  it("should validate a valid SortBodyParams with required field only", () => {
    const validParams = {
      sortBy: "createdAt",
    };
    expect(SortBodyParamsSchema.parse(validParams)).toEqual(validParams);
  });

  it("should validate a valid SortBodyParams with optional fields", () => {
    const validParamsWithCustom = {
      sortBy: "lastModifiedAt",
      customSortBy: "customField",
    };
    expect(SortBodyParamsSchema.parse(validParamsWithCustom)).toEqual(validParamsWithCustom);

    const validParamsWithOrder = {
      sortBy: "createdAt",
      sortOrder: "desc" as const,
    };
    expect(SortBodyParamsSchema.parse(validParamsWithOrder)).toEqual(validParamsWithOrder);
  });

  it("should accept any type for sortBy", () => {
    // String
    expect(SortBodyParamsSchema.parse({ sortBy: "field" })).toBeDefined();
    // Number
    expect(SortBodyParamsSchema.parse({ sortBy: 123 })).toBeDefined();
    // Object
    expect(SortBodyParamsSchema.parse({ sortBy: { nested: "field" } })).toBeDefined();
    // Array
    expect(SortBodyParamsSchema.parse({ sortBy: ["field1", "field2"] })).toBeDefined();
  });

  it("should raise an error for an invalid SortBodyParams", () => {
    // Invalid sortOrder enum value
    expect(() => SortBodyParamsSchema.parse({ sortBy: "field", sortOrder: "invalid" })).toThrow();
    // Wrong type for customSortBy (must be string if provided)
    expect(() => SortBodyParamsSchema.parse({ sortBy: "field", customSortBy: 123 })).toThrow();
  });
});

// ############################################################################
// SortedResultsInfo Schema
// ############################################################################

describe("SortedResultsInfo Schema", () => {
  const jsonSchemaId = "SortedResultsInfo.yaml";

  it("should validate a valid SortedResultsInfo with all fields", () => {
    const validInfo = {
      sortBy: "lastModifiedAt",
      customSortBy: "customField",
      sortOrder: "asc" as const,
      errors: ["Warning: Some items could not be sorted"],
    };
    expect(SortedResultsInfoSchema.parse(validInfo)).toEqual(validInfo);
  });

  it("should validate a valid SortedResultsInfo with required fields only", () => {
    const validInfo = {
      sortBy: "createdAt",
      sortOrder: "desc" as const,
    };
    expect(SortedResultsInfoSchema.parse(validInfo)).toEqual(validInfo);
  });

  it("should validate a valid SortedResultsInfo with optional fields", () => {
    const validInfoWithCustom = {
      sortBy: "lastModifiedAt",
      sortOrder: "asc" as const,
      customSortBy: "customField",
    };
    expect(SortedResultsInfoSchema.parse(validInfoWithCustom)).toEqual(validInfoWithCustom);

    const validInfoWithErrors = {
      sortBy: "createdAt",
      sortOrder: "desc" as const,
      errors: ["Error message"],
    };
    expect(SortedResultsInfoSchema.parse(validInfoWithErrors)).toEqual(validInfoWithErrors);
  });

  it("should match SortedResultsInfo.yaml", () => {
    expectZodMatchesJsonSchema(SortedResultsInfoSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid SortedResultsInfo", () => {
    // Missing required field 'sortBy'
    expect(() => SortedResultsInfoSchema.parse({ sortOrder: "asc" })).toThrow();
    // Missing required field 'sortOrder'
    expect(() => SortedResultsInfoSchema.parse({ sortBy: "field" })).toThrow();
    // Invalid sortOrder enum value
    expect(() =>
      SortedResultsInfoSchema.parse({ sortBy: "field", sortOrder: "invalid" })
    ).toThrow();
    // Wrong type for sortBy (must be string)
    expect(() => SortedResultsInfoSchema.parse({ sortBy: 123, sortOrder: "asc" })).toThrow();
    // Wrong type for customSortBy (must be string if provided)
    expect(() =>
      SortedResultsInfoSchema.parse({ sortBy: "field", sortOrder: "asc", customSortBy: 123 })
    ).toThrow();
    // Wrong type for errors (must be array of strings if provided)
    expect(() =>
      SortedResultsInfoSchema.parse({ sortBy: "field", sortOrder: "asc", errors: "error" })
    ).toThrow();
    expect(() =>
      SortedResultsInfoSchema.parse({ sortBy: "field", sortOrder: "asc", errors: [123] })
    ).toThrow();
  });
});
