import { z } from "zod";

// ############################################################################
// Event schema
// ############################################################################

export const eventSchema = z.object({
  /** Human-readable name of the event */
  name: z.string(),

  /** Date of the event */
  date: z.coerce.date(),

  /** Time of the event in ISO 8601 format: HH:MM:SS */
  time: z
    .string()
    .regex(/^\d{2}:\d{2}:\d{2}$/)
    .optional(),

  /** Description of what this event represents */
  description: z.string().optional(),
});

export type Event = z.infer<typeof eventSchema>;

// ############################################################################
// Money schema
// ############################################################################

export const moneySchema = z.object({
  /** The amount of money */
  amount: z.string().regex(/^-?\d+(\.\d+)?$/),

  /** The ISO 4217 currency code */
  currency: z.string().length(3),
});

export type Money = z.infer<typeof moneySchema>;

// ############################################################################
// CustomField schema
// ############################################################################

export const customFieldTypeEnum = z.enum([
  "string",
  "number",
  "boolean",
  "object",
  "array",
]);

export type CustomFieldType = z.infer<typeof customFieldTypeEnum>;

export const customFieldSchema = z.object({
  /** Name of the custom field */
  name: z.string(),

  /** The JSON schema type */
  type: customFieldTypeEnum,

  /** Link to the full JSON schema */
  schema: z.string().url().optional(),

  /** Value of the custom field */
  value: z.unknown(),

  /** Description of the custom field's purpose */
  description: z.string().optional(),
});

export type CustomField = z.infer<typeof customFieldSchema>;

// ############################################################################
// SystemMetadata schema
// ############################################################################

/** Transform a date to ensure it's in UTC */
const ensureUTC = (date: Date | string) => {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds()
    )
  );
};

/** Schema for UTC datetime fields */
const utcDateTimeSchema = z.coerce.date().transform(ensureUTC);

export const systemMetadataSchema = z.object({
  /** The timestamp (in UTC) at which the record was created */
  createdAt: utcDateTimeSchema,

  /** The timestamp (in UTC) at which the record was last modified */
  lastModifiedAt: utcDateTimeSchema,
});

export type SystemMetadata = z.infer<typeof systemMetadataSchema>;
