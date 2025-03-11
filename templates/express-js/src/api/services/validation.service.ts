import { z } from 'zod';

const FundingAmountSchema = z.object({
  amount: z.number(),
  currency: z.string()
});

const AwardRangeSchema = z.object({
  min: FundingAmountSchema,
  max: FundingAmountSchema
});

const MatchRequirementSchema = z.object({
  required: z.boolean(),
  percentage: z.number().optional()
});

const ApplicationTimelineSchema = z.object({
  name: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(1)
});

const CustomFieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  format: z.string().min(1),
  value: z.unknown(),
  description: z.string().optional(),
  link: z.string().url().optional()
});

const FundingDetailsSchema = z.object({
  awardRange: AwardRangeSchema,
  matchRequirement: MatchRequirementSchema,
  fundingURL: z.string().url()
});

const OpportunitySchema = z.object({
  source: z.string().min(1),
  title: z.string().min(1),
  agencyDept: z.string().min(1),
  status: z.string().min(1),
  categories: z.array(z.string()),
  description: z.string().min(1),
  applicationTimeline: z.array(ApplicationTimelineSchema),
  fundingDetails: FundingDetailsSchema,
  geographicScope: z.string().min(1),
  applicantEligibility: z.array(z.string()),
  grantURL: z.string().url(),
  customFields: z.record(CustomFieldSchema)
});

export class ValidationService {
  static validateGrant(data: unknown) {
    return OpportunitySchema.parse(data);
  }

  static validatePartialGrant(data: unknown) {
    return OpportunitySchema.partial().parse(data);
  }
} 