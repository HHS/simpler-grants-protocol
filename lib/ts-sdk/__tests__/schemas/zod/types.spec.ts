import { describe, it, expect } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper";
import {
  UuidSchema,
  DecimalStringSchema,
  UTCDateTimeSchema,
  ISODateSchema,
  ISOTimeSchema,
  OffsetDateTimeSchema,
} from "@/schemas";

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
    // Zero cases
    expect(DecimalStringSchema.parse("0")).toBe("0");
    expect(DecimalStringSchema.parse("0.0")).toBe("0.0");
    expect(DecimalStringSchema.parse("-0")).toBe("-0");
    // Leading zeros
    expect(DecimalStringSchema.parse("001")).toBe("001");
    expect(DecimalStringSchema.parse("001.50")).toBe("001.50");
    // Decimal with no digits after (regex allows)
    expect(DecimalStringSchema.parse("5.")).toBe("5.");
    // Integer without decimal point
    expect(DecimalStringSchema.parse("123")).toBe("123");
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
    // Empty string (regex requires at least one digit)
    expect(() => DecimalStringSchema.parse("")).toThrow();
    // Decimal point only without digits before (regex requires at least one digit before optional decimal)
    expect(() => DecimalStringSchema.parse(".5")).toThrow();
    // Only decimal point
    expect(() => DecimalStringSchema.parse(".")).toThrow();
    // Contains spaces
    expect(() => DecimalStringSchema.parse("100 50")).toThrow();
  });
});

// ############################################################################
// UTCDateTime schema
// ############################################################################

describe("UTCDateTime Schema", () => {
  it("should validate a valid UTCDateTime from string", () => {
    const validDateTime = "2025-01-01T00:00:00Z";
    const parsed = UTCDateTimeSchema.parse(validDateTime);
    expect(parsed).toBeInstanceOf(Date);
    // Verify it's a UTC date
    expect(parsed.getUTCFullYear()).toBe(2025);
    expect(parsed.getUTCMonth()).toBe(0); // January is 0
    expect(parsed.getUTCDate()).toBe(1);
  });

  it("should handle different datetime formats", () => {
    // With milliseconds
    const dateWithMs = "2025-01-01T12:00:00.123Z";
    const parsedMs = UTCDateTimeSchema.parse(dateWithMs);
    expect(parsedMs).toBeInstanceOf(Date);
    // Verify UTC conversion
    expect(parsedMs.getUTCFullYear()).toBe(2025);
    expect(parsedMs.getUTCMonth()).toBe(0);
    expect(parsedMs.getUTCDate()).toBe(1);
  });

  it("should raise an error for an invalid UTCDateTime", () => {
    // Invalid datetime format
    expect(() => UTCDateTimeSchema.parse("not-a-date")).toThrow();
    // Must be coercible to a Date
    expect(() => UTCDateTimeSchema.parse("")).toThrow();
    // Invalid date values
    expect(() => UTCDateTimeSchema.parse("2025-13-01T00:00:00Z")).toThrow();
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
    // Verify it's converted to UTC at midnight
    expect(parsed.getUTCFullYear()).toBe(2025);
    expect(parsed.getUTCMonth()).toBe(0); // January is 0
    expect(parsed.getUTCDate()).toBe(1);
    expect(parsed.getUTCHours()).toBe(0);
    expect(parsed.getUTCMinutes()).toBe(0);
    expect(parsed.getUTCSeconds()).toBe(0);
  });

  it("should handle edge dates", () => {
    // Leap year date
    const leapYear = "2024-02-29";
    const parsedLeap = ISODateSchema.parse(leapYear);
    expect(parsedLeap).toBeInstanceOf(Date);
    expect(parsedLeap.getUTCFullYear()).toBe(2024);
    expect(parsedLeap.getUTCMonth()).toBe(1); // February is 1
    expect(parsedLeap.getUTCDate()).toBe(29);

    // Year boundaries
    const minYear = "0001-01-01";
    const parsedMin = ISODateSchema.parse(minYear);
    expect(parsedMin).toBeInstanceOf(Date);

    const maxYear = "9999-12-31";
    const parsedMax = ISODateSchema.parse(maxYear);
    expect(parsedMax).toBeInstanceOf(Date);
    expect(parsedMax.getUTCFullYear()).toBe(9999);
    expect(parsedMax.getUTCMonth()).toBe(11); // December is 11
    expect(parsedMax.getUTCDate()).toBe(31);
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
    // Missing parts
    expect(() => ISODateSchema.parse("2025-01")).toThrow();
    expect(() => ISODateSchema.parse("2025")).toThrow();
    // Note: Invalid dates like "2025-13-01" will pass the regex and create a Date object
    // (which will roll over), so they don't throw errors
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

  it("should handle various timezone offset formats", () => {
    // Positive offset
    expect(ISOTimeSchema.parse("12:00:00+05:30")).toBe("12:00:00");
    expect(ISOTimeSchema.parse("12:00:00+08:00")).toBe("12:00:00");
    // Negative offset
    expect(ISOTimeSchema.parse("12:00:00-05:00")).toBe("12:00:00");
    expect(ISOTimeSchema.parse("12:00:00-08:30")).toBe("12:00:00");
    // Zulu time
    expect(ISOTimeSchema.parse("12:00:00Z")).toBe("12:00:00");
  });

  it("should handle fractional seconds", () => {
    expect(ISOTimeSchema.parse("12:00:00.1")).toBe("12:00:00.1");
    expect(ISOTimeSchema.parse("12:00:00.12")).toBe("12:00:00.12");
    expect(ISOTimeSchema.parse("12:00:00.123")).toBe("12:00:00.123");
    expect(ISOTimeSchema.parse("12:00:00.123456")).toBe("12:00:00.123456");
    expect(ISOTimeSchema.parse("12:00:00.123Z")).toBe("12:00:00.123");
    expect(ISOTimeSchema.parse("12:00:00.123+05:00")).toBe("12:00:00.123");
  });

  it("should handle edge times", () => {
    // Midnight
    expect(ISOTimeSchema.parse("00:00:00.000")).toBe("00:00:00.000");
    // End of day
    expect(ISOTimeSchema.parse("23:59:59.999")).toBe("23:59:59.999");
  });

  it("should handle non-string input in preprocess", () => {
    // Test the else branch in preprocess (non-string input)
    // Note: This will fail at the z.string().time() validation, but we're testing the preprocess branch
    // The preprocess should return the value as-is if it's not a string
    expect(() => ISOTimeSchema.parse(123)).toThrow();
    expect(() => ISOTimeSchema.parse(null)).toThrow();
    expect(() => ISOTimeSchema.parse(undefined)).toThrow();
  });

  it("should match isoTime.yaml", () => {
    expectZodMatchesJsonSchema(ISOTimeSchema, jsonSchemaId);
  });

  it("should raise an error for an invalid ISOTime", () => {
    // Invalid characters
    expect(() => ISOTimeSchema.parse("not-a-time")).toThrow();
    // Invalid hour (must be 00-23)
    expect(() => ISOTimeSchema.parse("25:00:00")).toThrow();
    // Invalid minute (must be 00-59)
    expect(() => ISOTimeSchema.parse("12:60:00")).toThrow();
    // Invalid second (must be 00-59)
    expect(() => ISOTimeSchema.parse("12:00:60")).toThrow();
    // Missing seconds (Zod's time() accepts HH:MM, but we require HH:MM:SS)
    expect(() => ISOTimeSchema.parse("12")).toThrow();
    // Note: "12:00" is accepted by Zod's time() validator, so it won't throw
  });
});

// ############################################################################
// OffsetDateTime schema
// ############################################################################

describe("OffsetDateTime Schema", () => {
  it("should validate a valid OffsetDateTime", () => {
    const validDateTime = "2025-01-01T00:00:00Z";
    const parsed = OffsetDateTimeSchema.parse(validDateTime);
    expect(parsed).toBeInstanceOf(Date);
    // Verify it's parsed correctly
    expect(parsed.getUTCFullYear()).toBe(2025);
    expect(parsed.getUTCMonth()).toBe(0); // January is 0
    expect(parsed.getUTCDate()).toBe(1);
  });

  it("should handle various timezone offset formats", () => {
    // Zulu time
    const zulu = OffsetDateTimeSchema.parse("2025-01-01T12:00:00Z");
    expect(zulu).toBeInstanceOf(Date);
    expect(zulu.getUTCFullYear()).toBe(2025);
    expect(zulu.getUTCHours()).toBe(12);

    // Positive offset
    const positiveOffset = OffsetDateTimeSchema.parse("2025-01-01T12:00:00+05:30");
    expect(positiveOffset).toBeInstanceOf(Date);
    // The Date object stores UTC time, so +05:30 means the local time was 12:00
    // but UTC time is 06:30
    expect(positiveOffset.getUTCHours()).toBe(6);
    expect(positiveOffset.getUTCMinutes()).toBe(30);

    const positiveOffset2 = OffsetDateTimeSchema.parse("2025-01-01T12:00:00+08:00");
    expect(positiveOffset2).toBeInstanceOf(Date);
    expect(positiveOffset2.getUTCHours()).toBe(4);

    // Negative offset
    const negativeOffset = OffsetDateTimeSchema.parse("2025-01-01T12:00:00-05:00");
    expect(negativeOffset).toBeInstanceOf(Date);
    // -05:00 means UTC time is 17:00
    expect(negativeOffset.getUTCHours()).toBe(17);

    const negativeOffset2 = OffsetDateTimeSchema.parse("2025-01-01T12:00:00-08:30");
    expect(negativeOffset2).toBeInstanceOf(Date);
    expect(negativeOffset2.getUTCHours()).toBe(20);
    expect(negativeOffset2.getUTCMinutes()).toBe(30);
  });

  it("should handle datetime with fractional seconds", () => {
    const withMs = OffsetDateTimeSchema.parse("2025-01-01T12:00:00.123Z");
    expect(withMs).toBeInstanceOf(Date);
    expect(withMs.getUTCMilliseconds()).toBe(123);

    const withMs2 = OffsetDateTimeSchema.parse("2025-01-01T12:00:00.123456Z");
    expect(withMs2).toBeInstanceOf(Date);
    // JavaScript Date only stores milliseconds, not microseconds
    // So 123456 microseconds = 123 milliseconds
    expect(withMs2.getUTCMilliseconds()).toBe(123);

    // Fractional seconds with timezone offset
    const withMsOffset = OffsetDateTimeSchema.parse("2025-01-01T12:00:00.123+05:00");
    expect(withMsOffset).toBeInstanceOf(Date);
    expect(withMsOffset.getUTCMilliseconds()).toBe(123);
    expect(withMsOffset.getUTCHours()).toBe(7); // 12:00 - 5 hours = 07:00 UTC

    const withMsOffset2 = OffsetDateTimeSchema.parse("2025-01-01T12:00:00.123456-08:00");
    expect(withMsOffset2).toBeInstanceOf(Date);
    expect(withMsOffset2.getUTCMilliseconds()).toBe(123);
    expect(withMsOffset2.getUTCHours()).toBe(20); // 12:00 + 8 hours = 20:00 UTC
  });

  it("should raise an error for an invalid OffsetDateTime", () => {
    // Must be a valid ISO datetime string
    expect(() => OffsetDateTimeSchema.parse("not-a-datetime")).toThrow();
    // Must be a string, not a Date object
    expect(() => OffsetDateTimeSchema.parse(new Date())).toThrow();
    // Invalid datetime format (missing time)
    expect(() => OffsetDateTimeSchema.parse("2025-01-01")).toThrow();
    // Missing timezone
    expect(() => OffsetDateTimeSchema.parse("2025-01-01T12:00:00")).toThrow();
    // Invalid timezone format -- must be in the format ±HH:MM
    expect(() => OffsetDateTimeSchema.parse("2025-01-01T12:00:00+5:00")).toThrow();
  });
});
