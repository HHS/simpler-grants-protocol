import { describe, it, expect } from "vitest";
import * as Types from "@/types";
import * as Constants from "@/constants";

// ############################################################################
// Model types
// ############################################################################

describe("Model types", () => {
  it("should instantiate OppStatus correctly", () => {
    const oppStatus: Types.OppStatus = {
      value: Constants.OppStatusOptions.open,
      description: "This opportunity is currently accepting applications",
    };
    expect(oppStatus).toBeDefined();
    expect(oppStatus.value).toBe("open");
  });

  it("should instantiate ApplicantType correctly", () => {
    const applicantType: Types.ApplicantType = {
      value: Constants.ApplicantTypeOptions.individual,
      description: "Individual applicants only",
    };
    expect(applicantType).toBeDefined();
    expect(applicantType.value).toBe("individual");
  });

  it("should instantiate OppFunding correctly", () => {
    const funding: Types.OppFunding = {
      totalAmountAvailable: {
        amount: "1000000.00",
        currency: "USD",
      },
      minAwardAmount: {
        amount: "10000.00",
        currency: "USD",
      },
      maxAwardAmount: {
        amount: "100000.00",
        currency: "USD",
      },
      minAwardCount: 5,
      maxAwardCount: 20,
      estimatedAwardCount: 10,
    };
    expect(funding).toBeDefined();
    expect(funding.totalAmountAvailable?.amount).toBe("1000000.00");
  });

  it("should instantiate OppTimeline correctly", () => {
    const timeline: Types.OppTimeline = {
      postDate: {
        eventType: Constants.EventType.singleDate,
        name: "Application Posted",
        date: new Date("2025-01-01"),
      },
      closeDate: {
        eventType: Constants.EventType.singleDate,
        name: "Opportunity Close Date",
        date: new Date("2025-12-31"),
      },
    };
    expect(timeline).toBeDefined();
    expect(timeline.postDate?.eventType).toBe("singleDate");
  });

  it("should instantiate OpportunityBase correctly", () => {
    const opportunity: Types.OpportunityBase = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Test Opportunity",
      status: {
        value: Constants.OppStatusOptions.open,
      },
      description: "A test opportunity",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      lastModifiedAt: new Date("2025-01-01T00:00:00Z"),
    };
    expect(opportunity).toBeDefined();
    expect(opportunity.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(opportunity.status.value).toBe("open");
  });

  it("should instantiate OppSorting correctly", () => {
    const sorting: Types.OppSorting = {
      sortBy: Constants.OppSortBy.title,
      sortOrder: "asc",
    };
    expect(sorting).toBeDefined();
    expect(sorting.sortBy).toBe("title");
  });

  it("should instantiate OppDefaultFilters correctly", () => {
    const filters: Types.OppDefaultFilters = {
      status: {
        operator: Constants.ArrayOperator.in,
        value: [Constants.OppStatusOptions.open, Constants.OppStatusOptions.forecasted],
      },
    };
    expect(filters).toBeDefined();
    expect(filters.status?.operator).toBe("in");
  });

  it("should instantiate OppFilters correctly", () => {
    const filters: Types.OppFilters = {
      status: {
        operator: Constants.ArrayOperator.in,
        value: [Constants.OppStatusOptions.open],
      },
      customFilters: {
        customField: {
          operator: Constants.EquivalenceOperator.eq,
          value: "test",
        },
      },
    };
    expect(filters).toBeDefined();
    expect(filters.customFilters?.customField.operator).toBe("eq");
  });
});

// ############################################################################
// Filter types
// ############################################################################

describe("Filter types", () => {
  it("should instantiate DefaultFilter correctly", () => {
    const filter: Types.DefaultFilter = {
      operator: Constants.EquivalenceOperator.eq,
      value: "test",
    };
    expect(filter).toBeDefined();
    expect(filter.operator).toBe("eq");
  });

  it("should instantiate StringComparisonFilter correctly", () => {
    const filter: Types.StringComparisonFilter = {
      operator: Constants.StringOperator.like,
      value: "test%",
    };
    expect(filter).toBeDefined();
    expect(filter.operator).toBe("like");
  });

  it("should instantiate StringArrayFilter correctly", () => {
    const filter: Types.StringArrayFilter = {
      operator: Constants.ArrayOperator.in,
      value: ["value1", "value2"],
    };
    expect(filter).toBeDefined();
    expect(filter.value).toEqual(["value1", "value2"]);
  });

  it("should instantiate NumberComparisonFilter correctly", () => {
    const filter: Types.NumberComparisonFilter = {
      operator: Constants.ComparisonOperator.gt,
      value: 100,
    };
    expect(filter).toBeDefined();
    expect(filter.value).toBe(100);
  });

  it("should instantiate NumberRangeFilter correctly", () => {
    const filter: Types.NumberRangeFilter = {
      operator: Constants.RangeOperator.between,
      value: {
        min: 10,
        max: 100,
      },
    };
    expect(filter).toBeDefined();
    expect(filter.value.min).toBe(10);
    expect(filter.value.max).toBe(100);
  });

  it("should instantiate DateRangeFilter correctly", () => {
    const filter: Types.DateRangeFilter = {
      operator: Constants.RangeOperator.between,
      value: {
        min: "2025-01-01",
        max: "2025-12-31",
      },
    };
    expect(filter).toBeDefined();
    expect(filter.value.min).toBe("2025-01-01");
  });

  it("should instantiate MoneyComparisonFilter correctly", () => {
    const filter: Types.MoneyComparisonFilter = {
      operator: Constants.ComparisonOperator.gte,
      value: {
        amount: "1000.00",
        currency: "USD",
      },
    };
    expect(filter).toBeDefined();
    expect(filter.value.amount).toBe("1000.00");
  });

  it("should instantiate MoneyRangeFilter correctly", () => {
    const filter: Types.MoneyRangeFilter = {
      operator: Constants.RangeOperator.between,
      value: {
        min: {
          amount: "1000.00",
          currency: "USD",
        },
        max: {
          amount: "10000.00",
          currency: "USD",
        },
      },
    };
    expect(filter).toBeDefined();
    expect(filter.value.min.amount).toBe("1000.00");
  });
});

// ############################################################################
// Field types
// ############################################################################

describe("Field types", () => {
  it("should instantiate Event (SingleDateEvent) correctly", () => {
    const event: Types.SingleDateEvent = {
      eventType: Constants.EventType.singleDate,
      name: "Test Event",
      date: new Date("2025-01-01"),
      time: "09:00:00",
    };
    expect(event).toBeDefined();
    expect(event.eventType).toBe("singleDate");
  });

  it("should instantiate Event (DateRangeEvent) correctly", () => {
    const event: Types.DateRangeEvent = {
      eventType: Constants.EventType.dateRange,
      name: "Test Range",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
    };
    expect(event).toBeDefined();
    expect(event.eventType).toBe("dateRange");
  });

  it("should instantiate Event (OtherEvent) correctly", () => {
    const event: Types.OtherEvent = {
      eventType: Constants.EventType.other,
      name: "Other Event",
      details: "Every other Tuesday",
    };
    expect(event).toBeDefined();
    expect(event.eventType).toBe("other");
  });

  it("should instantiate Money correctly", () => {
    const money: Types.Money = {
      amount: "1000.50",
      currency: "USD",
    };
    expect(money).toBeDefined();
    expect(money.amount).toBe("1000.50");
    expect(money.currency).toBe("USD");
  });

  it("should instantiate CustomField correctly", () => {
    const customField: Types.CustomField = {
      name: "customField1",
      fieldType: Constants.CustomFieldType.string,
      value: "test value",
      description: "A custom field",
    };
    expect(customField).toBeDefined();
    expect(customField.fieldType).toBe("string");
  });

  it("should instantiate SystemMetadata correctly", () => {
    const metadata: Types.SystemMetadata = {
      createdAt: new Date("2025-01-01T00:00:00Z"),
      lastModifiedAt: new Date("2025-01-02T00:00:00Z"),
    };
    expect(metadata).toBeDefined();
    expect(metadata.createdAt).toBeInstanceOf(Date);
    expect(metadata.lastModifiedAt).toBeInstanceOf(Date);
  });
});
