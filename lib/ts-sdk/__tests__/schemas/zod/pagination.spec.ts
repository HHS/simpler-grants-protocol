import { describe, it, expect } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper";
import {
  PaginatedQueryParamsSchema,
  PaginatedBodyParamsSchema,
  PaginatedResultsInfoSchema,
} from "@/schemas";

// ############################################################################
// PaginatedQueryParams Schema
// ############################################################################

describe("PaginatedQueryParams Schema", () => {
  const jsonSchemaId = "PaginatedQueryParams.yaml";

  it("should validate a valid PaginatedQueryParams with all fields", () => {
    const validParams = {
      page: 2,
      pageSize: 50,
    };
    expect(PaginatedQueryParamsSchema.parse(validParams)).toEqual(validParams);
  });

  it("should validate a valid PaginatedQueryParams with defaults", () => {
    const paramsWithDefaults = PaginatedQueryParamsSchema.parse({});
    expect(paramsWithDefaults.page).toBe(1);
    expect(paramsWithDefaults.pageSize).toBe(100);
  });

  it("should validate a valid PaginatedQueryParams with partial fields", () => {
    const paramsWithPage = PaginatedQueryParamsSchema.parse({ page: 3 });
    expect(paramsWithPage.page).toBe(3);
    expect(paramsWithPage.pageSize).toBe(100);

    const paramsWithPageSize = PaginatedQueryParamsSchema.parse({ pageSize: 25 });
    expect(paramsWithPageSize.page).toBe(1);
    expect(paramsWithPageSize.pageSize).toBe(25);
  });

  it("should match PaginatedQueryParams.yaml", () => {
    expectZodMatchesJsonSchema(PaginatedQueryParamsSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid PaginatedQueryParams", () => {
    // Page must be at least 1
    expect(() => PaginatedQueryParamsSchema.parse({ page: 0 })).toThrow();
    expect(() => PaginatedQueryParamsSchema.parse({ page: -1 })).toThrow();
    // Page must be an integer
    expect(() => PaginatedQueryParamsSchema.parse({ page: 1.5 })).toThrow();
    // PageSize must be at least 1
    expect(() => PaginatedQueryParamsSchema.parse({ pageSize: 0 })).toThrow();
    expect(() => PaginatedQueryParamsSchema.parse({ pageSize: -1 })).toThrow();
    // PageSize must be an integer
    expect(() => PaginatedQueryParamsSchema.parse({ pageSize: 50.5 })).toThrow();
    // Wrong types
    expect(() => PaginatedQueryParamsSchema.parse({ page: "1" })).toThrow();
    expect(() => PaginatedQueryParamsSchema.parse({ pageSize: "50" })).toThrow();
  });
});

// ############################################################################
// PaginatedBodyParams Schema
// ############################################################################

describe("PaginatedBodyParams Schema", () => {
  const jsonSchemaId = "PaginatedBodyParams.yaml";

  it("should validate a valid PaginatedBodyParams with all fields", () => {
    const validParams = {
      page: 2,
      pageSize: 50,
    };
    expect(PaginatedBodyParamsSchema.parse(validParams)).toEqual(validParams);
  });

  it("should validate a valid PaginatedBodyParams with defaults", () => {
    const paramsWithDefaults = PaginatedBodyParamsSchema.parse({});
    expect(paramsWithDefaults.page).toBe(1);
    expect(paramsWithDefaults.pageSize).toBe(100);
  });

  it("should validate a valid PaginatedBodyParams with partial fields", () => {
    const paramsWithPage = PaginatedBodyParamsSchema.parse({ page: 3 });
    expect(paramsWithPage.page).toBe(3);
    expect(paramsWithPage.pageSize).toBe(100);

    const paramsWithPageSize = PaginatedBodyParamsSchema.parse({ pageSize: 25 });
    expect(paramsWithPageSize.page).toBe(1);
    expect(paramsWithPageSize.pageSize).toBe(25);
  });

  it("should match PaginatedBodyParams.yaml", () => {
    expectZodMatchesJsonSchema(PaginatedBodyParamsSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid PaginatedBodyParams", () => {
    // Page must be at least 1
    expect(() => PaginatedBodyParamsSchema.parse({ page: 0 })).toThrow();
    expect(() => PaginatedBodyParamsSchema.parse({ page: -1 })).toThrow();
    // Page must be an integer
    expect(() => PaginatedBodyParamsSchema.parse({ page: 1.5 })).toThrow();
    // PageSize must be at least 1
    expect(() => PaginatedBodyParamsSchema.parse({ pageSize: 0 })).toThrow();
    expect(() => PaginatedBodyParamsSchema.parse({ pageSize: -1 })).toThrow();
    // PageSize must be an integer
    expect(() => PaginatedBodyParamsSchema.parse({ pageSize: 50.5 })).toThrow();
    // Wrong types
    expect(() => PaginatedBodyParamsSchema.parse({ page: "1" })).toThrow();
    expect(() => PaginatedBodyParamsSchema.parse({ pageSize: "50" })).toThrow();
  });
});

// ############################################################################
// PaginatedResultsInfo Schema
// ############################################################################

describe("PaginatedResultsInfo Schema", () => {
  const jsonSchemaId = "PaginatedResultsInfo.yaml";

  it("should validate a valid PaginatedResultsInfo with all fields", () => {
    const validInfo = {
      page: 2,
      pageSize: 50,
      totalItems: 150,
      totalPages: 3,
    };
    expect(PaginatedResultsInfoSchema.parse(validInfo)).toEqual(validInfo);
  });

  it("should validate a valid PaginatedResultsInfo with required fields only", () => {
    const validInfo = {
      page: 1,
      pageSize: 20,
    };
    expect(PaginatedResultsInfoSchema.parse(validInfo)).toEqual(validInfo);
  });

  it("should validate a valid PaginatedResultsInfo with optional fields", () => {
    const validInfo = {
      page: 1,
      pageSize: 20,
      totalItems: 100,
    };
    expect(PaginatedResultsInfoSchema.parse(validInfo)).toEqual(validInfo);

    const validInfo2 = {
      page: 1,
      pageSize: 20,
      totalPages: 5,
    };
    expect(PaginatedResultsInfoSchema.parse(validInfo2)).toEqual(validInfo2);
  });

  it("should match PaginatedResultsInfo.yaml", () => {
    expectZodMatchesJsonSchema(PaginatedResultsInfoSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid PaginatedResultsInfo", () => {
    // Missing required field 'page'
    expect(() => PaginatedResultsInfoSchema.parse({ pageSize: 20 })).toThrow();
    // Missing required field 'pageSize'
    expect(() => PaginatedResultsInfoSchema.parse({ page: 1 })).toThrow();
    // Page must be at least 1
    expect(() => PaginatedResultsInfoSchema.parse({ page: 0, pageSize: 20 })).toThrow();
    expect(() => PaginatedResultsInfoSchema.parse({ page: -1, pageSize: 20 })).toThrow();
    // Page must be an integer
    expect(() => PaginatedResultsInfoSchema.parse({ page: 1.5, pageSize: 20 })).toThrow();
    // PageSize must be at least 1
    expect(() => PaginatedResultsInfoSchema.parse({ page: 1, pageSize: 0 })).toThrow();
    expect(() => PaginatedResultsInfoSchema.parse({ page: 1, pageSize: -1 })).toThrow();
    // PageSize must be an integer
    expect(() => PaginatedResultsInfoSchema.parse({ page: 1, pageSize: 20.5 })).toThrow();
    // TotalItems must be an integer if provided
    expect(() =>
      PaginatedResultsInfoSchema.parse({ page: 1, pageSize: 20, totalItems: 100.5 })
    ).toThrow();
    // TotalPages must be an integer if provided
    expect(() =>
      PaginatedResultsInfoSchema.parse({ page: 1, pageSize: 20, totalPages: 5.5 })
    ).toThrow();
    // Wrong types
    expect(() => PaginatedResultsInfoSchema.parse({ page: "1", pageSize: 20 })).toThrow();
    expect(() => PaginatedResultsInfoSchema.parse({ page: 1, pageSize: "20" })).toThrow();
  });
});
