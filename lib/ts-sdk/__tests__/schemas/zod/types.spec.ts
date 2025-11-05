import { describe, it, expect } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper";
import {
  UuidSchema,
  DecimalStringSchema,
  UTCDateTimeSchema,
  ISODateSchema,
  ISOTimeSchema,
  OffsetDateTimeSchema,
} from "@/schemas/zod/types";

// ############################################################################
// UUID schema
// ############################################################################

describe("UUID Schema", () => {
  const jsonSchemaId = "uuid.yaml";

  it("should validate a valid UUID", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(UuidSchema.parse(validUuid)).toBe(validUuid);
  });

  it("should match uuid.yaml", () => {
    expectZodMatchesJsonSchema(UuidSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid UUID", () => {
    // Not a valid UUID format
    expect(() => UuidSchema.parse("invalid-uuid")).toThrow();
    // Missing hyphens
    expect(() => UuidSchema.parse("123e4567e89b12d3a456426614174000")).toThrow();
    // Too short
    expect(() => UuidSchema.parse("123e4567-e89b")).toThrow();
  });
});

// ############################################################################
// DecimalString schema
// ############################################################################

describe("DecimalString Schema", () => {
  const jsonSchemaId = "decimalString.yaml";

  it("should validate a valid DecimalString", () => {
    expect(DecimalStringSchema.parse("100")).toBe("100");
    expect(DecimalStringSchema.parse("100.50")).toBe("100.50");
    expect(DecimalStringSchema.parse("-100.50")).toBe("-100.50");
  });

  it("should match decimalString.yaml", () => {
    expectZodMatchesJsonSchema(DecimalStringSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid DecimalString", () => {
    // Must be a string, not a number
    expect(() => DecimalStringSchema.parse(100)).toThrow();
    // Cannot contain non-numeric characters
    expect(() => DecimalStringSchema.parse("100.50.50")).toThrow();
    // Cannot contain letters
    expect(() => DecimalStringSchema.parse("abc")).toThrow();
  });
});

// ############################################################################
// UTCDateTime schema
// ############################################################################

describe("UTCDateTime Schema", () => {
  it("should validate a valid UTCDateTime", () => {
    const validDateTime = "2025-01-01T00:00:00Z";
    const parsed = UTCDateTimeSchema.parse(validDateTime);
    expect(parsed).toBeInstanceOf(Date);
  });

  it("should raise an error for an invalid UTCDateTime", () => {
    // Invalid datetime format
    expect(() => UTCDateTimeSchema.parse("not-a-date")).toThrow();
    // Must be coercible to a Date
    expect(() => UTCDateTimeSchema.parse("")).toThrow();
  });
});

// ############################################################################
// ISODate schema
// ############################################################################

describe("ISODate Schema", () => {
  const jsonSchemaId = "isoDate.yaml";

  it("should validate a valid ISODate", () => {
    const validDate = "2025-01-01";
    const parsed = ISODateSchema.parse(validDate);
    expect(parsed).toBeInstanceOf(Date);
  });

  it("should match isoDate.yaml", () => {
    expectZodMatchesJsonSchema(ISODateSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid ISODate", () => {
    // Must be in YYYY-MM-DD format
    expect(() => ISODateSchema.parse("01-01-2025")).toThrow();
    // Must be a string, not a Date object
    expect(() => ISODateSchema.parse(new Date())).toThrow();
    // Invalid date format
    expect(() => ISODateSchema.parse("not-a-date")).toThrow();
  });
});

// ############################################################################
// ISOTime schema
// ############################################################################

describe("ISOTime Schema", () => {
  const jsonSchemaId = "isoTime.yaml";

  it("should validate a valid ISOTime", () => {
    expect(ISOTimeSchema.parse("17:00:00")).toBe("17:00:00");
    expect(ISOTimeSchema.parse("00:00:00")).toBe("00:00:00");
    expect(ISOTimeSchema.parse("23:59:59")).toBe("23:59:59");
    // RFC 3339 time format also supports fractional seconds and timezone
    expect(ISOTimeSchema.parse("17:00:00.123Z")).toBe("17:00:00.123");
    expect(ISOTimeSchema.parse("17:00:00+05:00")).toBe("17:00:00");
  });

  it("should match isoTime.yaml", () => {
    expectZodMatchesJsonSchema(ISOTimeSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid ISOTime", () => {
    // Invalid characters
    expect(() => ISOTimeSchema.parse("not-a-time")).toThrow();
    // Invalid hour (must be 00-23)
    expect(() => ISOTimeSchema.parse("25:00:00")).toThrow();
  });
});

// ############################################################################
// OffsetDateTime schema
// ############################################################################

describe("OffsetDateTime Schema", () => {
  it("should validate a valid OffsetDateTime", () => {
    const validDateTime = "2025-01-01T00:00:00Z";
    expect(OffsetDateTimeSchema.parse(validDateTime)).toBe(validDateTime);
  });

  it("should raise an error for an invalid OffsetDateTime", () => {
    // Must be a valid ISO datetime string
    expect(() => OffsetDateTimeSchema.parse("not-a-datetime")).toThrow();
    // Must be a string, not a Date object
    expect(() => OffsetDateTimeSchema.parse(new Date())).toThrow();
    // Invalid datetime format
    expect(() => OffsetDateTimeSchema.parse("2025-01-01")).toThrow();
  });
});
