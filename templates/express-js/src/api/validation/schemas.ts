import { z } from "zod";

export type CustomFieldType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

export const CustomFieldSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  format: z.string(),
  value: z.unknown(),
  description: z.string().optional(),
});

export const FundingAmountSchema = z.object({
  amount: z.number(),
  currency: z.string(),
});

export const AwardRangeSchema = z.object({
  min: FundingAmountSchema,
  max: FundingAmountSchema,
});

export const MatchRequirementSchema = z.object({
  required: z.boolean(),
  percentage: z.number().optional(),
});

export const FundingDetailsSchema = z.object({
  awardRange: AwardRangeSchema,
  matchRequirement: MatchRequirementSchema,
  fundingURL: z.string().url(),
});

export const ApplicationTimelineSchema = z.object({
  name: z.string(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  description: z.string(),
});

export const OpportunitySchema = z.object({
  source: z.string(),
  title: z.string(),
  agencyDept: z.string(),
  status: z.string(),
  categories: z.array(z.string()),
  description: z.string(),
  applicationTimeline: z.array(ApplicationTimelineSchema),
  fundingDetails: FundingDetailsSchema,
  geographicScope: z.string(),
  applicantEligibility: z.array(z.string()),
  grantURL: z.string().url(),
  customFields: z.record(CustomFieldSchema),
});

export type Opportunity = z.infer<typeof OpportunitySchema>;
