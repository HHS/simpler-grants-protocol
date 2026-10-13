import { describe, expect, it } from "vitest";
import * as AwardConstants from "@/constants";
import * as AwardSchemas from "@/schemas";
import {
  AwardBaseSchema,
  AwdFundingSchema,
  AwdIdFainSchema,
  AwdIdsSchema,
  AwdRecipientIndividualSchema,
  AwdRefSchema,
  AwdStatusOptionsEnum,
  AwdStatusSchema,
  AwdTimelineSchema,
} from "@/schemas";
import type * as AwardTypes from "@/types";
import { expectZodMatchesJsonSchema } from "../../helper";
import { ajv, validate } from "../../utils/ajv-validator";
import { checkZodMatchesJsonSchema, type BoundaryCase } from "../../utils/fuzz-test";

const AWARD_ID = "123e4567-e89b-42d3-a456-426614174000";
const RELATED_ID = "018f2e77-3a4b-4c1d-9e2f-abcdef123456";

const requiredAward = {
  id: AWARD_ID,
  title: "Community Health Center Grant",
  description: "Supports community health center improvements.",
  status: { value: "awarded" },
  createdAt: "2026-03-01T00:00:00Z",
  lastModifiedAt: "2026-06-01T00:00:00Z",
};

const completeAward = {
  ...requiredAward,
  identifiers: {
    systemId: { id: AWARD_ID },
    "awd:us:fain": {
      registry: { code: "awd:us:fain" },
      id: "FAIN-001",
      allIds: [{ id: "FAIN-000", status: "archived" }],
    },
  },
  funding: {
    details: "Facility modernization",
    requestedAmount: { amount: "500000.00", currency: "USD" },
    awardedAmount: { amount: "450000.00", currency: "USD" },
    disbursedAmount: { amount: "150000.00", currency: "USD" },
  },
  keyDates: {
    awardDate: {
      name: "Award date",
      eventType: "singleDate",
      date: "2026-03-01",
    },
    periodOfPerformance: {
      name: "Period of performance",
      eventType: "dateRange",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
    },
    otherDates: {
      closeout: {
        name: "Closeout",
        eventType: "other",
        details: "Within 90 days of completion",
      },
    },
  },
  opportunity: {
    id: RELATED_ID,
    title: "Health Center Capital Improvement Program",
    identifiers: { "opp:us:fon": { id: "HRSA-26-001" } },
  },
  application: { id: RELATED_ID, title: "Riverside modernization application" },
  funders: {
    primary: {
      id: RELATED_ID,
      name: "Health Resources and Services Administration",
      identifiers: { "org:us:uei": { id: "AB0123456789" } },
    },
  },
  recipientOrganizations: {
    primary: {
      id: RELATED_ID,
      name: "Riverside Community Health Center",
      identifiers: { "org:us:ein": { id: "123456789" } },
    },
  },
  recipientIndividual: {
    name: { firstName: "Taylor", lastName: "Grant" },
    identifiers: { otherIds: { local: { id: "PERSON-001" } } },
    customFields: {
      programArea: {
        name: "programArea",
        fieldType: "string",
        value: "Healthcare Innovation",
      },
    },
  },
  parent: {
    id: RELATED_ID,
    title: "Parent award",
    identifiers: { "awd:us:fain": { id: "FAIN-PARENT" } },
  },
  source: "https://www.usaspending.gov/award/FAIN-001",
};

describe("award model schemas", () => {
  it("matches emitted contracts and validates nested award data", async () => {
    const comparisons: Array<{
      name: string;
      schema: Parameters<typeof expectZodMatchesJsonSchema>[0];
      jsonSchemaId: string;
      cases: BoundaryCase[];
    }> = [
      {
        name: "AwdStatusOptionsEnum",
        schema: AwdStatusOptionsEnum,
        jsonSchemaId: "AwdStatusOptions.yaml",
        cases: [
          { label: "custom status option is accepted", value: "custom" },
          { label: "unknown status option is rejected", value: "pending" },
        ],
      },
      {
        name: "AwdStatusSchema",
        schema: AwdStatusSchema,
        jsonSchemaId: "AwdStatus.yaml",
        cases: [
          {
            label: "custom status does not invent a customValue requirement",
            value: { value: "custom" },
          },
          { label: "status value is required", value: { description: "Issued" } },
          {
            label: "null optional status metadata is rejected",
            value: { value: "awarded", description: null },
          },
          { label: "status object is sealed", value: { value: "awarded", unexpected: true } },
        ],
      },
      {
        name: "AwdFundingSchema",
        schema: AwdFundingSchema,
        jsonSchemaId: "AwdFunding.yaml",
        cases: [
          { label: "empty funding details are accepted", value: {} },
          {
            label: "valid money is accepted",
            value: { awardedAmount: { amount: "450000.00", currency: "USD" } },
          },
          {
            label: "malformed nested money is rejected",
            value: { awardedAmount: { amount: "450000.00" } },
          },
          {
            label: "nested money is sealed",
            value: {
              awardedAmount: { amount: "450000.00", currency: "USD", unexpected: true },
            },
          },
          { label: "null optional funding is rejected", value: { details: null } },
        ],
      },
      {
        name: "AwdTimelineSchema",
        schema: AwdTimelineSchema,
        jsonSchemaId: "AwdTimeline.yaml",
        cases: [
          { label: "empty timeline is accepted", value: {} },
          {
            label: "valid event record is accepted",
            value: {
              otherDates: {
                closeout: {
                  name: "Closeout",
                  eventType: "singleDate",
                  date: "2027-06-30",
                },
              },
            },
          },
          {
            label: "malformed nested event is rejected",
            value: { awardDate: { eventType: "singleDate", date: "2026-03-01" } },
          },
          {
            label: "invalid Date instance is rejected",
            value: {
              awardDate: {
                name: "Award date",
                eventType: "singleDate",
                date: new Date("invalid"),
              },
            },
          },
          { label: "null optional event is rejected", value: { awardDate: null } },
        ],
      },
      {
        name: "AwdIdFainSchema",
        schema: AwdIdFainSchema,
        jsonSchemaId: "AwdIdFain.yaml",
        cases: [
          { label: "omitted registry code remains valid", value: { registry: {}, id: "FAIN-001" } },
          {
            label: "wrong FAIN registry code is rejected",
            value: { registry: { code: "opp:us:fon" }, id: "FAIN-001" },
          },
          {
            label: "FAIN history is validated",
            value: { allIds: [{ id: "FAIN-000", status: "archived" }] },
          },
          {
            label: "malformed FAIN history is rejected",
            value: { allIds: [{ id: "FAIN-000" }] },
          },
        ],
      },
      {
        name: "AwdIdsSchema",
        schema: AwdIdsSchema,
        jsonSchemaId: "AwdIds.yaml",
        cases: [
          {
            label: "inherited and specialized identifiers are accepted together",
            value: {
              systemId: { id: AWARD_ID },
              otherIds: { local: { id: "LOCAL-001" } },
              "awd:us:fain": { registry: { code: "awd:us:fain" }, id: "FAIN-001" },
            },
          },
          {
            label: "malformed nested system identifier is rejected",
            value: { systemId: { id: "not-a-uuid" } },
          },
          {
            label: "unknown award identifier key is rejected",
            value: { "awd:made:up": { id: "unknown" } },
          },
        ],
      },
      {
        name: "AwdRefSchema",
        schema: AwdRefSchema,
        jsonSchemaId: "AwdRef.yaml",
        cases: [
          {
            label: "reference with nested FAIN is accepted",
            value: {
              id: AWARD_ID,
              title: "Parent award",
              identifiers: { "awd:us:fain": { id: "FAIN-001" } },
            },
          },
          { label: "reference title is required", value: { id: AWARD_ID } },
          {
            label: "malformed nested reference identifiers are rejected",
            value: {
              id: AWARD_ID,
              title: "Parent award",
              identifiers: {
                "awd:us:fain": { registry: { code: "opp:us:fon" }, id: "FAIN-001" },
              },
            },
          },
        ],
      },
      {
        name: "AwdRecipientIndividualSchema",
        schema: AwdRecipientIndividualSchema,
        jsonSchemaId: "AwdRecipientIndividual.yaml",
        cases: [
          { label: "empty individual recipient is accepted", value: {} },
          {
            label: "individual recipient extensions are retained",
            value: {
              name: { firstName: "Taylor", lastName: "Grant" },
              identifiers: { otherIds: { local: { id: "PERSON-001" } } },
              customFields: {
                programArea: {
                  name: "programArea",
                  fieldType: "string",
                  value: "Healthcare Innovation",
                },
              },
            },
          },
          {
            label: "malformed nested individual name is rejected",
            value: { name: { firstName: "Taylor" } },
          },
          {
            label: "individual recipient is sealed",
            value: { unexpected: true },
          },
        ],
      },
      {
        name: "AwardBaseSchema",
        schema: AwardBaseSchema,
        jsonSchemaId: "AwardBase.yaml",
        cases: [
          { label: "all six required award properties are accepted", value: requiredAward },
          {
            label: "custom status does not require customValue",
            value: { ...requiredAward, status: { value: "custom" } },
          },
          {
            label: "organization recipient alone is accepted",
            value: {
              ...requiredAward,
              recipientOrganizations: {
                primary: { id: RELATED_ID, name: "Community Health Center" },
              },
            },
          },
          {
            label: "individual recipient alone is accepted",
            value: {
              ...requiredAward,
              recipientIndividual: { name: { firstName: "Taylor", lastName: "Grant" } },
            },
          },
          {
            label: "both recipient forms are accepted",
            value: {
              ...requiredAward,
              recipientOrganizations: {
                primary: { id: RELATED_ID, name: "Community Health Center" },
              },
              recipientIndividual: { name: { firstName: "Taylor", lastName: "Grant" } },
            },
          },
          {
            label: "malformed parent reference is rejected",
            value: { ...requiredAward, parent: { id: RELATED_ID } },
          },
          {
            label: "custom fields are rejected at the award root",
            value: { ...requiredAward, customFields: {} },
          },
          {
            label: "invalid metadata Date instance is rejected",
            value: { ...requiredAward, createdAt: new Date("invalid") },
          },
        ],
      },
    ];

    for (const { name, schema, jsonSchemaId, cases } of comparisons) {
      expect(schema, `${name} should be exported from @/schemas`).toBeDefined();
      if (jsonSchemaId === "AwardBase.yaml") {
        // json-schema-faker emits empty strings for some UUID-constrained
        // allIds[].id values after resolving AwardBase's deep references. Use
        // a protocol-valid root sample while the explicit cases exercise the
        // invalid boundaries above.
        const result = await checkZodMatchesJsonSchema(schema, jsonSchemaId, {
          cases,
          preserveObjectPolicy: true,
          generateSample: async () => requiredAward,
        });
        expect(result.passed).toBe(true);
        continue;
      }

      await expectZodMatchesJsonSchema(schema, jsonSchemaId, cases, 0, true);
    }
  });

  it("validates minimal and complete awards without dropping nested fields", () => {
    for (const fixture of [requiredAward, completeAward]) {
      expect(validate(ajv, "AwardBase.yaml", fixture).isValid).toBe(true);
      expect(AwardBaseSchema.safeParse(fixture).success).toBe(true);
    }

    const parsed = AwardBaseSchema.parse(completeAward);
    expect(parsed).toMatchObject({
      identifiers: completeAward.identifiers,
      funding: completeAward.funding,
      opportunity: completeAward.opportunity,
      application: completeAward.application,
      funders: completeAward.funders,
      recipientOrganizations: completeAward.recipientOrganizations,
      recipientIndividual: completeAward.recipientIndividual,
      parent: completeAward.parent,
    });
    expect(parsed.keyDates?.awardDate).toMatchObject({
      name: "Award date",
      eventType: "singleDate",
    });
    expect(parsed.keyDates?.otherDates?.closeout).toEqual(
      completeAward.keyDates.otherDates.closeout
    );
  });

  it("enforces award field presence and preserves protocol date wire formats", () => {
    for (const field of [
      "id",
      "title",
      "description",
      "status",
      "createdAt",
      "lastModifiedAt",
    ] as const) {
      const incomplete: Record<string, unknown> = { ...requiredAward };
      delete incomplete[field];
      expect(AwardBaseSchema.safeParse(incomplete).success, `${field} should be required`).toBe(
        false
      );
      expect(validate(ajv, "AwardBase.yaml", incomplete).isValid).toBe(false);
    }

    expect(AwardBaseSchema.safeParse(requiredAward).success).toBe(true);
    for (const field of ["funding", "application", "recipientIndividual", "source"] as const) {
      const withNull = { ...requiredAward, [field]: null };
      expect(AwardBaseSchema.safeParse(withNull).success, `${field} should reject null`).toBe(
        false
      );
      expect(validate(ajv, "AwardBase.yaml", withNull).isValid).toBe(false);
    }

    expect(() =>
      AwardBaseSchema.safeParse({ ...requiredAward, createdAt: new Date("invalid") })
    ).not.toThrow();
    expect(
      AwardBaseSchema.safeParse({ ...requiredAward, createdAt: new Date("invalid") }).success
    ).toBe(false);

    const parsed = AwardBaseSchema.parse(completeAward);
    const serialized = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
    expect(serialized.createdAt).toBe("2026-03-01T00:00:00.000Z");
    expect(serialized.lastModifiedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(serialized).toMatchObject({
      keyDates: {
        awardDate: { date: "2026-03-01" },
        periodOfPerformance: { startDate: "2026-04-01", endDate: "2027-03-31" },
      },
    });
    expect(validate(ajv, "AwardBase.yaml", serialized).isValid).toBe(true);
  });

  it("matches award sorting and filter contracts with public types and constants", async () => {
    const comparisons: Array<{
      name: string;
      schema: Parameters<typeof expectZodMatchesJsonSchema>[0];
      jsonSchemaId: string;
    }> = [
      {
        name: "AwdSortByEnum",
        schema: AwardSchemas.AwdSortByEnum,
        jsonSchemaId: "AwdSortBy.yaml",
      },
      {
        name: "AwdSortingSchema",
        schema: AwardSchemas.AwdSortingSchema,
        jsonSchemaId: "AwdSorting.yaml",
      },
      {
        name: "AwdDefaultFiltersSchema",
        schema: AwardSchemas.AwdDefaultFiltersSchema,
        jsonSchemaId: "AwdDefaultFilters.yaml",
      },
      {
        name: "AwdFiltersSchema",
        schema: AwardSchemas.AwdFiltersSchema,
        jsonSchemaId: "AwdFilters.yaml",
      },
    ];

    for (const { name, schema, jsonSchemaId } of comparisons) {
      expect(schema, `${name} should be exported from @/schemas`).toBeDefined();
      await expectZodMatchesJsonSchema(schema, jsonSchemaId, [], 0, true);
    }

    expect(AwardConstants.AwdSortBy, "AwdSortBy should be exported from @/constants").toEqual({
      lastModifiedAt: "lastModifiedAt",
      createdAt: "createdAt",
      title: "title",
      "status.value": "status.value",
      "keyDates.awardDate": "keyDates.awardDate",
      "funding.awardedAmount": "funding.awardedAmount",
      custom: "custom",
    });

    const publicTypes: [
      AwardTypes.AwdSortBy,
      AwardTypes.AwdSorting,
      AwardTypes.AwdDefaultFilters,
      AwardTypes.AwdFilters,
    ] = [
      AwardConstants.AwdSortBy.custom,
      { sortBy: AwardConstants.AwdSortBy["status.value"] },
      {},
      {},
    ];
    expect(publicTypes).toEqual(["custom", { sortBy: "status.value" }, {}, {}]);
  });

  it("validates open default filters and sealed custom filters", () => {
    const agency = { operator: "in", value: ["HHS", "NSF"] };
    const openFilters = { agency };

    expect(validate(ajv, "AwdDefaultFilters.yaml", openFilters).isValid).toBe(true);
    expect(AwardSchemas.AwdDefaultFiltersSchema.parse(openFilters)).toEqual(openFilters);

    for (const invalidAgency of [
      { operator: "invalid", value: ["HHS"] },
      { operator: "in" },
      "HHS",
    ]) {
      const invalid = { agency: invalidAgency };
      expect(validate(ajv, "AwdDefaultFilters.yaml", invalid).isValid).toBe(false);
      expect(AwardSchemas.AwdDefaultFiltersSchema.safeParse(invalid).success).toBe(false);
    }

    expect(validate(ajv, "AwdFilters.yaml", openFilters).isValid).toBe(false);
    expect(AwardSchemas.AwdFiltersSchema.safeParse(openFilters).success).toBe(false);

    const nestedFilters = { customFilters: { agency } };
    expect(validate(ajv, "AwdFilters.yaml", nestedFilters).isValid).toBe(true);
    expect(AwardSchemas.AwdFiltersSchema.parse(nestedFilters)).toEqual(nestedFilters);
  });

  it("retains named filter constraints and applies only emitted sorting rules", () => {
    const validFilters = {
      status: { operator: "in", value: ["awarded", "completed"] },
      opportunityId: { operator: "notIn", value: [RELATED_ID] },
      awardDateRange: {
        operator: "between",
        value: { min: "2026-01-01", max: "2026-12-31T23:59:59-05:00" },
      },
      awardedAmountRange: {
        operator: "outside",
        value: {
          min: { amount: "100000.00", currency: "USD" },
          max: { amount: "500000", currency: "USD" },
        },
      },
    };

    for (const [schema, jsonSchemaId] of [
      [AwardSchemas.AwdDefaultFiltersSchema, "AwdDefaultFilters.yaml"],
      [AwardSchemas.AwdFiltersSchema, "AwdFilters.yaml"],
    ] as const) {
      expect(validate(ajv, jsonSchemaId, validFilters).isValid).toBe(true);
      expect(schema.parse(validFilters)).toEqual(validFilters);

      for (const invalid of [
        { ...validFilters, status: { operator: "eq", value: ["awarded"] } },
        { ...validFilters, opportunityId: { operator: "in", value: RELATED_ID } },
        {
          ...validFilters,
          awardDateRange: {
            operator: "between",
            value: { min: "2026-01-01", max: "not-a-date" },
          },
        },
        {
          ...validFilters,
          awardedAmountRange: {
            operator: "between",
            value: {
              min: { amount: "100,000.00", currency: "USD" },
              max: { amount: "500000", currency: "USD" },
            },
          },
        },
        {
          ...validFilters,
          awardedAmountRange: {
            operator: "between",
            value: {
              min: { amount: "100000.00" },
              max: { amount: "500000", currency: "USD" },
            },
          },
        },
        {
          ...validFilters,
          awardDateRange: {
            operator: "between",
            value: { min: "2026-01-01", max: "2026-12-31", unexpected: true },
          },
        },
        {
          ...validFilters,
          awardedAmountRange: {
            operator: "between",
            value: {
              min: { amount: "100000", currency: "USD", unexpected: true },
              max: { amount: "500000", currency: "USD" },
            },
          },
        },
        { ...validFilters, status: null },
      ]) {
        expect(schema.safeParse(invalid).success).toBe(false);
      }
    }

    expect(AwardSchemas.AwdFiltersSchema.parse({})).toEqual({});

    for (const sorting of [
      { sortBy: "title" },
      { sortBy: "createdAt", sortOrder: "asc" },
      { sortBy: "lastModifiedAt", sortOrder: "desc" },
      { sortBy: "custom" },
      { sortBy: "title", customSortBy: "implementationRank" },
    ]) {
      expect(validate(ajv, "AwdSorting.yaml", sorting).isValid).toBe(true);
      expect(AwardSchemas.AwdSortingSchema.parse(sorting)).toEqual(sorting);
    }

    for (const invalid of [
      {},
      { sortBy: "title", sortOrder: "ascending" },
      { sortBy: "title", customSortBy: 1 },
      { sortBy: "title", sortOrder: null },
      { sortBy: "title", customSortBy: null },
    ]) {
      expect(AwardSchemas.AwdSortingSchema.safeParse(invalid).success).toBe(false);
    }
  });
});
