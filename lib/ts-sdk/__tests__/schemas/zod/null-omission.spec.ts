/**
 * Optional properties the protocol describes as absent-or-value accept `null`
 * on read, but a parsed value never carries `null`: the key is omitted from
 * serialized output, which then satisfies the protocol schema.
 */

import { describe, it, expect } from "vitest";
import type { z } from "zod";
import { ajv, validate } from "../../utils/ajv-validator.js";
import * as S from "@/schemas";

const event = { name: "Posted", eventType: "singleDate", date: "2026-01-01" };

/** [name, schema, protocol schema id, protocol-valid baseline] */
const cases: Array<[string, z.ZodObject, string, Record<string, unknown>]> = [
  ["OppStatusSchema", S.OppStatusSchema, "OppStatus.yaml", { value: "open" }],
  ["ApplicantTypeSchema", S.ApplicantTypeSchema, "ApplicantType.yaml", { value: "individual" }],
  ["OppFundingSchema", S.OppFundingSchema, "OppFunding.yaml", {}],
  ["OppTimelineSchema", S.OppTimelineSchema, "OppTimeline.yaml", {}],
  [
    "OpportunityBaseSchema",
    S.OpportunityBaseSchema,
    "OpportunityBase.yaml",
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "t",
      status: { value: "open" },
      description: "d",
      createdAt: "2026-01-01T00:00:00Z",
      lastModifiedAt: "2026-01-01T00:00:00Z",
    },
  ],
  ["OppSortingSchema", S.OppSortingSchema, "OppSorting.yaml", { sortBy: "title" }],
  ["OppDefaultFiltersSchema", S.OppDefaultFiltersSchema, "OppDefaultFilters.yaml", {}],
  ["OppFiltersSchema", S.OppFiltersSchema, "OppFilters.yaml", {}],
  ["SingleDateEventSchema", S.SingleDateEventSchema, "SingleDateEvent.yaml", event],
  [
    "DateRangeEventSchema",
    S.DateRangeEventSchema,
    "DateRangeEvent.yaml",
    { name: "r", eventType: "dateRange", startDate: "2026-01-01", endDate: "2026-02-01" },
  ],
  ["OtherEventSchema", S.OtherEventSchema, "OtherEvent.yaml", { name: "o", eventType: "other" }],
  [
    "CustomFieldSchema",
    S.CustomFieldSchema,
    "CustomField.yaml",
    { name: "k", fieldType: "string", value: "v" },
  ],
  ["PaginatedQueryParamsSchema", S.PaginatedQueryParamsSchema, "PaginatedQueryParams.yaml", {}],
  ["PaginatedBodyParamsSchema", S.PaginatedBodyParamsSchema, "PaginatedBodyParams.yaml", {}],
  [
    "PaginatedResultsInfoSchema",
    S.PaginatedResultsInfoSchema,
    "PaginatedResultsInfo.yaml",
    { page: 1, pageSize: 10 },
  ],
  ["SortBodyParamsSchema", S.SortBodyParamsSchema, "SortBodyParams.yaml", { sortBy: "title" }],
  [
    "SortedResultsInfoSchema",
    S.SortedResultsInfoSchema,
    "SortedResultsInfo.yaml",
    { sortBy: "title", sortOrder: "asc" },
  ],
];

const wire = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

describe.each(cases)("%s", (_name, schema, jsonSchemaId, baseline) => {
  // Typed fields that accept null; `z.unknown()` fields (CustomField.value,
  // sort params' sortBy) accept anything and are out of scope.
  const nullable = Object.entries(schema.shape)
    .filter(([, field]) => (field as z.ZodType).safeParse(null).success)
    .filter(([, field]) => !(field as z.ZodType).safeParse(true).success)
    .map(([key]) => key);

  it("has fields that accept null on read", () => {
    expect(nullable.length).toBeGreaterThan(0);
  });

  it.each(nullable)("omits an explicit null %s from serialized output", key => {
    const parsed = schema.parse({ ...baseline, [key]: null }) as Record<string, unknown>;
    expect(parsed[key]).not.toBeNull();
    const serialized = wire(parsed);
    expect(serialized[key] ?? undefined).not.toBeNull();
    expect(validate(ajv, jsonSchemaId, serialized).errors).toBeNull();
  });

  it.each(nullable)("accepts an omitted %s", key => {
    const rest = { ...baseline };
    delete rest[key];
    expect(validate(ajv, jsonSchemaId, wire(schema.parse(rest))).errors).toBeNull();
  });

  it.each(nullable)("rejects a wrong non-null type for %s", key => {
    expect(schema.safeParse({ ...baseline, [key]: true }).success).toBe(false);
  });
});
