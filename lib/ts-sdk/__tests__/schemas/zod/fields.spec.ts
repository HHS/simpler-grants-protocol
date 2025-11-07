import { describe, it, expect } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper";
import {
  EventTypeEnum,
  SingleDateEventSchema,
  DateRangeEventSchema,
  OtherEventSchema,
  EventSchema,
  MoneySchema,
  CustomFieldTypeEnum,
  CustomFieldSchema,
  SystemMetadataSchema,
} from "@/schemas";

// ############################################################################
// Event type enum
// ############################################################################

describe("EventTypeEnum", () => {
  const jsonSchemaId = "EventType.yaml";

  it("should validate a valid EventTypeEnum", () => {
    expect(EventTypeEnum.parse("singleDate")).toBe("singleDate");
    expect(EventTypeEnum.parse("dateRange")).toBe("dateRange");
    expect(EventTypeEnum.parse("other")).toBe("other");
  });

  it("should match eventTypeEnum.yaml", () => {
    expectZodMatchesJsonSchema(EventTypeEnum, jsonSchemaId);
  });

  it("should raise an error for an invalid EventTypeEnum", () => {
    // "invalid" is not a valid event type
    expect(() => EventTypeEnum.parse("invalid")).toThrow();
    // "single" is not a valid event type (should be "singleDate")
    expect(() => EventTypeEnum.parse("single")).toThrow();
  });
});

// ############################################################################
// Single date event schema
// ############################################################################

describe("SingleDateEvent Schema", () => {
  const jsonSchemaId = "SingleDateEvent.yaml";

  it("should validate a valid SingleDateEvent", () => {
    const validEvent = {
      name: "Test Event",
      eventType: "singleDate",
      date: "2025-01-01",
    };
    const parsed = SingleDateEventSchema.parse(validEvent);
    expect(parsed.name).toBe("Test Event");
    expect(parsed.eventType).toBe("singleDate");
  });

  it("should match singleDateEvent.yaml", () => {
    expectZodMatchesJsonSchema(SingleDateEventSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid SingleDateEvent", () => {
    // Missing required "date" field
    expect(() => SingleDateEventSchema.parse({ name: "Test", eventType: "singleDate" })).toThrow();
    // eventType must be "singleDate", not "dateRange"
    expect(() =>
      SingleDateEventSchema.parse({ name: "Test", eventType: "dateRange", date: "2025-01-01" })
    ).toThrow();
    // date must be a valid ISO date string (YYYY-MM-DD)
    expect(() =>
      SingleDateEventSchema.parse({ name: "Test", eventType: "singleDate", date: "invalid-date" })
    ).toThrow();
  });
});

// ############################################################################
// Date range event schema
// ############################################################################

describe("DateRangeEvent Schema", () => {
  const jsonSchemaId = "DateRangeEvent.yaml";

  it("should validate a valid DateRangeEvent", () => {
    const validEvent = {
      name: "Test Event",
      eventType: "dateRange",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    };
    const parsed = DateRangeEventSchema.parse(validEvent);
    expect(parsed.name).toBe("Test Event");
    expect(parsed.eventType).toBe("dateRange");
  });

  it("should match dateRangeEvent.yaml", () => {
    expectZodMatchesJsonSchema(DateRangeEventSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid DateRangeEvent", () => {
    // Missing required "startDate" and "endDate" fields
    expect(() => DateRangeEventSchema.parse({ name: "Test", eventType: "dateRange" })).toThrow();
    // eventType must be "dateRange", not "singleDate"
    expect(() =>
      DateRangeEventSchema.parse({
        name: "Test",
        eventType: "singleDate",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      })
    ).toThrow();
    // startDate must be a valid ISO date string (YYYY-MM-DD)
    expect(() =>
      DateRangeEventSchema.parse({
        name: "Test",
        eventType: "dateRange",
        startDate: "invalid",
        endDate: "2025-12-31",
      })
    ).toThrow();
  });
});

// ############################################################################
// Other event schema
// ############################################################################

describe("OtherEvent Schema", () => {
  const jsonSchemaId = "OtherEvent.yaml";

  it("should validate a valid OtherEvent", () => {
    const validEvent = {
      name: "Test Event",
      eventType: "other",
    };
    const parsed = OtherEventSchema.parse(validEvent);
    expect(parsed.name).toBe("Test Event");
    expect(parsed.eventType).toBe("other");
  });

  it("should match otherEvent.yaml", () => {
    expectZodMatchesJsonSchema(OtherEventSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid OtherEvent", () => {
    // Missing required "eventType" field
    expect(() => OtherEventSchema.parse({ name: "Test" })).toThrow();
    // eventType must be "other", not "singleDate"
    expect(() => OtherEventSchema.parse({ name: "Test", eventType: "singleDate" })).toThrow();
    // Missing required "name" field
    expect(() => OtherEventSchema.parse({ eventType: "other" })).toThrow();
  });
});

// ############################################################################
// Event schema
// ############################################################################

describe("Event Schema", () => {
  const jsonSchemaId = "Event.yaml";

  it("should validate a valid Event", () => {
    const singleDateEvent = { name: "Test", eventType: "singleDate", date: "2025-01-01" };
    expect(EventSchema.parse(singleDateEvent)).toBeDefined();

    const dateRangeEvent = {
      name: "Test",
      eventType: "dateRange",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    };
    expect(EventSchema.parse(dateRangeEvent)).toBeDefined();

    const otherEvent = { name: "Test", eventType: "other" };
    expect(EventSchema.parse(otherEvent)).toBeDefined();
  });

  it("should match event.yaml", () => {
    expectZodMatchesJsonSchema(EventSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid Event", () => {
    // Missing required "eventType" field
    expect(() => EventSchema.parse({ name: "Test" })).toThrow();
    // "invalid" is not a valid eventType
    expect(() => EventSchema.parse({ name: "Test", eventType: "invalid" })).toThrow();
    // singleDate events require a "date" field
    expect(() => EventSchema.parse({ name: "Test", eventType: "singleDate" })).toThrow();
  });
});

// ############################################################################
// Money schema
// ############################################################################

describe("Money Schema", () => {
  const jsonSchemaId = "Money.yaml";

  it("should validate a valid Money", () => {
    const validMoney = { amount: "100.50", currency: "USD" };
    expect(MoneySchema.parse(validMoney)).toEqual(validMoney);
  });

  it("should match money.yaml", () => {
    expectZodMatchesJsonSchema(MoneySchema, jsonSchemaId);
  });

  it("should raise an error for an invalid Money", () => {
    // amount must be a decimal string, not a number
    expect(() => MoneySchema.parse({ amount: 100, currency: "USD" })).toThrow();
    // Missing required "currency" field
    expect(() => MoneySchema.parse({ amount: "100.50" })).toThrow();
    // Missing required "amount" field
    expect(() => MoneySchema.parse({ currency: "USD" })).toThrow();
    // amount must be a valid decimal string
    expect(() => MoneySchema.parse({ amount: "invalid", currency: "USD" })).toThrow();
  });
});

// ############################################################################
// Custom field type enum
// ############################################################################

describe("CustomFieldTypeEnum", () => {
  const jsonSchemaId = "CustomFieldType.yaml";

  it("should validate a valid CustomFieldTypeEnum", () => {
    expect(CustomFieldTypeEnum.parse("string")).toBe("string");
    expect(CustomFieldTypeEnum.parse("number")).toBe("number");
    expect(CustomFieldTypeEnum.parse("boolean")).toBe("boolean");
    expect(CustomFieldTypeEnum.parse("object")).toBe("object");
    expect(CustomFieldTypeEnum.parse("array")).toBe("array");
  });

  it("should match customFieldTypeEnum.yaml", () => {
    expectZodMatchesJsonSchema(CustomFieldTypeEnum, jsonSchemaId);
  });

  it("should raise an error for an invalid CustomFieldTypeEnum", () => {
    // "invalid" is not a valid custom field type
    expect(() => CustomFieldTypeEnum.parse("invalid")).toThrow();
    // "fakeType" is not a valid custom field type
    expect(() => CustomFieldTypeEnum.parse("fakeType")).toThrow();
  });
});

// ############################################################################
// Custom field schema
// ############################################################################

describe("CustomField Schema", () => {
  const jsonSchemaId = "CustomField.yaml";

  it("should validate a valid CustomField", () => {
    const validField = {
      name: "testField",
      fieldType: "string",
      value: "test value",
    };
    expect(CustomFieldSchema.parse(validField)).toEqual(validField);
  });

  it("should match customField.yaml", () => {
    expectZodMatchesJsonSchema(CustomFieldSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid CustomField", () => {
    // Missing required "fieldType" field
    expect(() => CustomFieldSchema.parse({ name: "test", value: "test" })).toThrow();
    // Missing required "name" field
    expect(() => CustomFieldSchema.parse({ fieldType: "string", value: "test" })).toThrow();
    // "invalid" is not a valid custom field type
    expect(() =>
      CustomFieldSchema.parse({ name: "test", fieldType: "invalid", value: "test" })
    ).toThrow();
  });
});

// ############################################################################
// System metadata schema
// ############################################################################

describe("SystemMetadata Schema", () => {
  const jsonSchemaId = "SystemMetadata.yaml";

  it("should validate a valid SystemMetadata", () => {
    const validMetadata = {
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-02T00:00:00Z",
    };
    const parsed = SystemMetadataSchema.parse(validMetadata);
    expect(parsed.createdAt).toBeInstanceOf(Date);
    expect(parsed.lastModifiedAt).toBeInstanceOf(Date);
  });

  it("should match systemMetadata.yaml", () => {
    expectZodMatchesJsonSchema(SystemMetadataSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid SystemMetadata", () => {
    // Missing required "lastModifiedAt" field
    expect(() => SystemMetadataSchema.parse({ createdAt: "2025-01-01T00:00:00Z" })).toThrow();
    // Missing required "createdAt" field
    expect(() => SystemMetadataSchema.parse({ lastModifiedAt: "2025-01-02T00:00:00Z" })).toThrow();
    // createdAt must be a valid datetime string
    expect(() =>
      SystemMetadataSchema.parse({ createdAt: "invalid", lastModifiedAt: "2025-01-02T00:00:00Z" })
    ).toThrow();
    // createdAt must be a string, not a number
    expect(() =>
      SystemMetadataSchema.parse({ createdAt: 123, lastModifiedAt: "2025-01-02T00:00:00Z" })
    ).toThrow();
  });
});
