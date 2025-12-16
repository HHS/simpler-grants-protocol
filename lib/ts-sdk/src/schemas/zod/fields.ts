/**
 * Zod schemas for the CommonGrants.Fields namespace in the @common-grants/core library
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { UTCDateTimeSchema, ISODateSchema, ISOTimeSchema, DecimalStringSchema } from "./types";

// ############################################################################
// Event schemas
// ############################################################################

// Event type enum
export const EventTypeEnum = z.enum(["singleDate", "dateRange", "other"]);

// Base event schema (common fields)
const EventBaseSchema = z.object({
  /** Human-readable name of the event (e.g., 'Application posted', 'Question deadline') */
  name: z.string(),

  /** Type of event */
  eventType: EventTypeEnum,

  /** Description of what this event represents */
  description: z.string().nullish(),
});

// Single date event schema
export const SingleDateEventSchema = EventBaseSchema.extend({
  /** Type of event */
  eventType: z.literal("singleDate"),

  /** Date of the event in ISO 8601 format: YYYY-MM-DD */
  date: ISODateSchema,

  /** Time of the event in ISO 8601 format: HH:MM:SS */
  time: ISOTimeSchema.nullish(),
});

// Date range event schema
export const DateRangeEventSchema = EventBaseSchema.extend({
  /** Type of event */
  eventType: z.literal("dateRange"),

  /** Start date of the event in ISO 8601 format: YYYY-MM-DD */
  startDate: ISODateSchema,

  /** Start time of the event in ISO 8601 format: HH:MM:SS */
  startTime: ISOTimeSchema.nullish(),

  /** End date of the event in ISO 8601 format: YYYY-MM-DD */
  endDate: ISODateSchema,

  /** End time of the event in ISO 8601 format: HH:MM:SS */
  endTime: ISOTimeSchema.nullish(),
});

// Other event schema
export const OtherEventSchema = EventBaseSchema.extend({
  /** Type of event */
  eventType: z.literal("other"),

  /** Details of the event's timeline (e.g. "Every other Tuesday") */
  details: z.string().nullish(),

  /** Description of the event */
  description: z.string().nullish(),
});

// Discriminated union for all event types
export const EventSchema = z.discriminatedUnion("eventType", [
  SingleDateEventSchema,
  DateRangeEventSchema,
  OtherEventSchema,
]);

// ############################################################################
// Money schema
// ############################################################################

export const MoneySchema = z.object({
  /** The amount of money */
  amount: DecimalStringSchema,

  /** The ISO 4217 currency code */
  currency: z.string(),
});

// ############################################################################
// CustomField schema
// ############################################################################

export const CustomFieldTypeEnum = z.enum([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
]);

export const CustomFieldSchema = z.object({
  /** Name of the custom field */
  name: z.string(),

  /** The JSON schema type */
  fieldType: CustomFieldTypeEnum,

  /** Link to the full JSON schema */
  schema: z.string().url().nullish(),

  /** Value of the custom field */
  value: z.unknown(),

  /** Description of the custom field's purpose */
  description: z.string().nullish(),
});

// ############################################################################
// SystemMetadata schema
// ############################################################################

export const SystemMetadataSchema = z.object({
  /** The timestamp (in UTC) at which the record was created */
  createdAt: UTCDateTimeSchema,

  /** The timestamp (in UTC) at which the record was last modified */
  lastModifiedAt: UTCDateTimeSchema,
});
