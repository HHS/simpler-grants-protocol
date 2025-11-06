import { describe, it, expect } from "vitest";
import {
  OppStatusOptionsEnum,
  OppStatusSchema,
  OppFundingSchema,
  OppTimelineSchema,
  OpportunityBaseSchema,
  OppSortByEnum,
  OppSortingSchema,
  OppDefaultFiltersSchema,
  OppFiltersSchema,
} from "@/schemas";
import { expectZodMatchesJsonSchema } from "../../helper";

// ############################################################################
// OppStatusOptionsEnum
// ############################################################################

describe("OppStatusOptionsEnum", () => {
  const jsonSchemaId = "OppStatusOptions.yaml";

  it("should validate a valid OppStatusOptionsEnum", () => {
    expect(OppStatusOptionsEnum.parse("forecasted")).toBe("forecasted");
    expect(OppStatusOptionsEnum.parse("open")).toBe("open");
    expect(OppStatusOptionsEnum.parse("closed")).toBe("closed");
    expect(OppStatusOptionsEnum.parse("custom")).toBe("custom");
  });

  it("should match oppStatusOptionsEnum.yaml", () => {
    expectZodMatchesJsonSchema(OppStatusOptionsEnum, jsonSchemaId);
  });

  it("should raise an error for an invalid OppStatusOptionsEnum", () => {
    // Invalid enum value (not in the allowed list)
    expect(() => OppStatusOptionsEnum.parse("pending")).toThrow();
    // Wrong type (not a string)
    expect(() => OppStatusOptionsEnum.parse(123)).toThrow();
  });
});

// ############################################################################
// OppStatus Schema
// ############################################################################

describe("OppStatus Schema", () => {
  const jsonSchemaId = "OppStatus.yaml";

  it("should validate a valid OppStatus", () => {
    const validStatus = {
      value: "open",
      description: "This opportunity is currently accepting applications",
    };
    expect(OppStatusSchema.parse(validStatus)).toEqual(validStatus);
  });

  it("should match oppStatus.yaml", () => {
    expectZodMatchesJsonSchema(OppStatusSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid OppStatus", () => {
    // Missing required field 'value'
    expect(() => OppStatusSchema.parse({ description: "test" })).toThrow();
    // Invalid enum value for 'value'
    expect(() => OppStatusSchema.parse({ value: "invalid" })).toThrow();
    // Wrong type for 'description'
    expect(() => OppStatusSchema.parse({ value: "open", description: 123 })).toThrow();
  });
});

// ############################################################################
// OppFunding Schema
// ############################################################################

describe("OppFunding Schema", () => {
  const jsonSchemaId = "OppFunding.yaml";

  it("should validate a valid OppFunding", () => {
    const validFunding = {
      totalAmountAvailable: { amount: "1000000.00", currency: "USD" },
      minAwardAmount: { amount: "10000.00", currency: "USD" },
      maxAwardAmount: { amount: "100000.00", currency: "USD" },
      minAwardCount: 5,
      maxAwardCount: 20,
      estimatedAwardCount: 10,
    };
    expect(OppFundingSchema.parse(validFunding)).toEqual(validFunding);
  });

  it("should match oppFunding.yaml", () => {
    expectZodMatchesJsonSchema(OppFundingSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid OppFunding", () => {
    // Invalid Money schema (missing currency)
    expect(() => OppFundingSchema.parse({ totalAmountAvailable: { amount: "1000.00" } })).toThrow();
    // Wrong type for minAwardCount (must be integer)
    expect(() => OppFundingSchema.parse({ minAwardCount: 5.5 })).toThrow();
    // Wrong type for estimatedAwardCount (must be number)
    expect(() => OppFundingSchema.parse({ estimatedAwardCount: "10" })).toThrow();
  });
});

// ############################################################################
// OppTimeline Schema
// ############################################################################

describe("OppTimeline Schema", () => {
  const jsonSchemaId = "OppTimeline.yaml";

  it("should validate a valid OppTimeline", () => {
    const validTimeline = {
      postDate: {
        eventType: "singleDate",
        date: "2025-01-01",
        time: "09:00:00",
        name: "Application Posted",
      },
      closeDate: {
        eventType: "singleDate",
        date: "2025-12-31",
        time: "17:00:00",
        name: "Opportunity Close Date",
      },
      otherDates: {
        review: {
          eventType: "dateRange",
          startDate: "2026-01-01",
          endDate: "2026-02-01",
          name: "Review Period",
        },
      },
    };
    const parsed = OppTimelineSchema.parse(validTimeline);
    // Dates are transformed to Date objects by ISODateSchema
    expect(parsed.postDate?.eventType).toBe("singleDate");
    if (parsed.postDate?.eventType === "singleDate") {
      expect(parsed.postDate.date).toBeInstanceOf(Date);
    }
    expect(parsed.closeDate?.eventType).toBe("singleDate");
    if (parsed.closeDate?.eventType === "singleDate") {
      expect(parsed.closeDate.date).toBeInstanceOf(Date);
    }
    expect(parsed.otherDates?.review.eventType).toBe("dateRange");
    if (parsed.otherDates?.review.eventType === "dateRange") {
      expect(parsed.otherDates.review.startDate).toBeInstanceOf(Date);
      expect(parsed.otherDates.review.endDate).toBeInstanceOf(Date);
    }
  });

  it("should match oppTimeline.yaml", () => {
    expectZodMatchesJsonSchema(OppTimelineSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid OppTimeline", () => {
    // Invalid Event schema for postDate (missing required 'name' field)
    expect(() =>
      OppTimelineSchema.parse({
        postDate: { eventType: "singleDate", date: "2025-01-01" },
      })
    ).toThrow();
    // Wrong type for otherDates (must be record of Events)
    expect(() => OppTimelineSchema.parse({ otherDates: "not-a-record" })).toThrow();
    // Invalid Event in otherDates record
    expect(() =>
      OppTimelineSchema.parse({ otherDates: { invalid: { eventType: "invalid" } } })
    ).toThrow();
  });
});

// ############################################################################
// OpportunityBase Schema
// ############################################################################

describe("OpportunityBase Schema", () => {
  const jsonSchemaId = "OpportunityBase.yaml";

  it("should validate a valid OpportunityBase", () => {
    const validOpportunity = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Sample Grant Opportunity",
      status: { value: "open" },
      description: "A sample grant opportunity for testing",
      funding: {
        totalAmountAvailable: { amount: "1000000.00", currency: "USD" },
      },
      keyDates: {
        closeDate: {
          eventType: "singleDate",
          date: "2025-12-31",
          name: "Opportunity Close Date",
        },
      },
      acceptedApplicantTypes: [
        { value: "individual" },
        { value: "organization", description: "Any organization type" },
      ],
      source: "https://example.com/opportunity",
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-02T00:00:00Z",
    };
    expect(OpportunityBaseSchema.parse(validOpportunity)).toBeDefined();
  });

  it("should match opportunityBase.yaml", () => {
    expectZodMatchesJsonSchema(OpportunityBaseSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid OpportunityBase", () => {
    // Missing required field 'id'
    expect(() =>
      OpportunityBaseSchema.parse({
        title: "Test",
        status: { value: "open" },
        description: "Test",
        funding: {},
        keyDates: {},
        createdAt: "2025-01-01T00:00:00Z",
        lastModifiedAt: "2025-01-02T00:00:00Z",
      })
    ).toThrow();
    // Invalid UUID format for 'id'
    expect(() =>
      OpportunityBaseSchema.parse({
        id: "not-a-uuid",
        title: "Test",
        status: { value: "open" },
        description: "Test",
        funding: {},
        keyDates: {},
        createdAt: "2025-01-01T00:00:00Z",
        lastModifiedAt: "2025-01-02T00:00:00Z",
      })
    ).toThrow();
    // Invalid URL for 'source'
    expect(() =>
      OpportunityBaseSchema.parse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        title: "Test",
        status: { value: "open" },
        description: "Test",
        funding: {},
        keyDates: {},
        source: "not-a-url",
        createdAt: "2025-01-01T00:00:00Z",
        lastModifiedAt: "2025-01-02T00:00:00Z",
      })
    ).toThrow();
  });
});

// ############################################################################
// OppSortByEnum
// ############################################################################

describe("OppSortByEnum", () => {
  const jsonSchemaId = "OppSortBy.yaml";

  it("should validate a valid OppSortByEnum", () => {
    expect(OppSortByEnum.parse("lastModifiedAt")).toBe("lastModifiedAt");
    expect(OppSortByEnum.parse("createdAt")).toBe("createdAt");
    expect(OppSortByEnum.parse("title")).toBe("title");
    expect(OppSortByEnum.parse("status.value")).toBe("status.value");
    expect(OppSortByEnum.parse("keyDates.closeDate")).toBe("keyDates.closeDate");
  });

  it("should match oppSortByEnum.yaml", () => {
    expectZodMatchesJsonSchema(OppSortByEnum, jsonSchemaId);
  });

  it("should raise an error for an invalid OppSortByEnum", () => {
    // Invalid enum value (not in the allowed list)
    expect(() => OppSortByEnum.parse("invalidField")).toThrow();
    // Wrong type (not a string)
    expect(() => OppSortByEnum.parse(123)).toThrow();
  });
});

// ############################################################################
// OppSorting Schema
// ############################################################################

describe("OppSorting Schema", () => {
  const jsonSchemaId = "OppSorting.yaml";

  it("should validate a valid OppSorting", () => {
    const validSorting = {
      sortBy: "lastModifiedAt",
      sortOrder: "desc",
    };
    expect(OppSortingSchema.parse(validSorting)).toEqual(validSorting);
  });

  it("should match oppSorting.yaml", () => {
    expectZodMatchesJsonSchema(OppSortingSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid OppSorting", () => {
    // Missing required field 'sortBy'
    expect(() => OppSortingSchema.parse({ sortOrder: "asc" })).toThrow();
    // Invalid enum value for 'sortBy'
    expect(() => OppSortingSchema.parse({ sortBy: "invalidField" })).toThrow();
    // Invalid enum value for 'sortOrder'
    expect(() => OppSortingSchema.parse({ sortBy: "title", sortOrder: "invalid" })).toThrow();
  });
});

// ############################################################################
// OppDefaultFilters Schema
// ############################################################################

describe("OppDefaultFilters Schema", () => {
  const jsonSchemaId = "OppDefaultFilters.yaml";

  it("should validate a valid OppDefaultFilters", () => {
    const validFilters = {
      status: { operator: "in", value: ["open", "forecasted"] },
      closeDateRange: {
        operator: "between",
        value: {
          min: "2025-01-01",
          max: "2025-12-31",
        },
      },
      totalFundingAvailableRange: {
        operator: "between",
        value: {
          min: { amount: "10000.00", currency: "USD" },
          max: { amount: "1000000.00", currency: "USD" },
        },
      },
    };
    expect(OppDefaultFiltersSchema.parse(validFilters)).toEqual(validFilters);
  });

  it("should match oppDefaultFilters.yaml", () => {
    expectZodMatchesJsonSchema(OppDefaultFiltersSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid OppDefaultFilters", () => {
    // Invalid StringArrayFilter (wrong operator)
    expect(() =>
      OppDefaultFiltersSchema.parse({ status: { operator: "eq", value: "open" } })
    ).toThrow();
    // Invalid DateRangeFilter (wrong value type - should be object with min/max)
    expect(() =>
      OppDefaultFiltersSchema.parse({
        closeDateRange: { operator: "between", value: "not-an-object" },
      })
    ).toThrow();
    // Invalid MoneyRangeFilter (missing currency)
    expect(() =>
      OppDefaultFiltersSchema.parse({
        totalFundingAvailableRange: {
          operator: "between",
          value: [{ amount: "10000.00" }, { amount: "100000.00" }],
        },
      })
    ).toThrow();
  });
});

// ############################################################################
// OppFilters Schema
// ############################################################################

describe("OppFilters Schema", () => {
  const jsonSchemaId = "OppFilters.yaml";

  it("should validate a valid OppFilters", () => {
    const validFilters = {
      status: { operator: "in", value: ["open", "forecasted"] },
      customFilters: {
        customField: { operator: "eq", value: "customValue" },
      },
    };
    expect(OppFiltersSchema.parse(validFilters)).toEqual(validFilters);
  });

  it("should match oppFilters.yaml", () => {
    expectZodMatchesJsonSchema(OppFiltersSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid OppFilters", () => {
    // Invalid customFilters (must be record of DefaultFilter)
    expect(() => OppFiltersSchema.parse({ customFilters: "not-a-record" })).toThrow();
    // Invalid DefaultFilter in customFilters (missing operator)
    expect(() => OppFiltersSchema.parse({ customFilters: { field: { value: "test" } } })).toThrow();
  });
});
