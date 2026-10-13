import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import * as AwardRouteSchemas from "@common-grants/sdk/schemas";
import { NotFoundSchema } from "@common-grants/sdk/schemas";
import type * as AwardTypes from "@common-grants/sdk/types";
import { ajv, validate } from "../../utils/ajv-validator.js";

const AWARD_ID = "123e4567-e89b-42d3-a456-426614174000";

const award = {
  id: AWARD_ID,
  title: "Community Health Center Grant",
  description: "Supports community health center improvements.",
  status: { value: "awarded" },
  createdAt: "2026-03-01T00:00:00Z",
  lastModifiedAt: "2026-06-01T00:00:00Z",
};

describe("award route schemas", () => {
  it("exports validators for award requests, success responses, and the shared read error", () => {
    const runtimeExports = [
      ["AwardsListRequestSchema", AwardRouteSchemas.AwardsListRequestSchema],
      ["AwardGetRequestSchema", AwardRouteSchemas.AwardGetRequestSchema],
      ["AwdSearchRequestSchema", AwardRouteSchemas.AwdSearchRequestSchema],
      ["AwardResponseSchema", AwardRouteSchemas.AwardResponseSchema],
      ["AwardsListResponseSchema", AwardRouteSchemas.AwardsListResponseSchema],
      ["AwardsSortedResponseSchema", AwardRouteSchemas.AwardsSortedResponseSchema],
      ["AwardsFilteredResponseSchema", AwardRouteSchemas.AwardsFilteredResponseSchema],
    ] as const;

    for (const [name, schema] of runtimeExports) {
      expect(schema, `${name} should be exported from @common-grants/sdk/schemas`).toBeDefined();
    }

    expect(
      AwardRouteSchemas.AwardsListRequestSchema.safeParse({ page: 1, pageSize: 20 }).success
    ).toBe(true);
    expect(AwardRouteSchemas.AwardGetRequestSchema.safeParse({ awdId: AWARD_ID }).success).toBe(
      true
    );
    expect(AwardRouteSchemas.AwdSearchRequestSchema.safeParse({}).success).toBe(true);

    const paginatedResponse = {
      status: 200,
      message: "Success",
      items: [award],
      paginationInfo: { page: 1, pageSize: 1 },
    };
    const sortedResponse = {
      ...paginatedResponse,
      sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
    };

    expect(
      AwardRouteSchemas.AwardResponseSchema.safeParse({
        status: 200,
        message: "Success",
        data: award,
      }).success
    ).toBe(true);
    expect(AwardRouteSchemas.AwardsListResponseSchema.safeParse(paginatedResponse).success).toBe(
      true
    );
    expect(AwardRouteSchemas.AwardsSortedResponseSchema.safeParse(sortedResponse).success).toBe(
      true
    );
    expect(
      AwardRouteSchemas.AwardsFilteredResponseSchema.safeParse({
        ...sortedResponse,
        filterInfo: { filters: {} },
      }).success
    ).toBe(true);

    expect(
      NotFoundSchema.safeParse({
        status: 404,
        message: "Award not found",
        errors: [],
      }).success
    ).toBe(true);
  });

  it("exports route types that exactly match their runtime validators", () => {
    expectTypeOf<AwardTypes.AwardResponse>().toEqualTypeOf<
      z.infer<typeof AwardRouteSchemas.AwardResponseSchema>
    >();
    expectTypeOf<AwardTypes.AwardsListResponse>().toEqualTypeOf<
      z.infer<typeof AwardRouteSchemas.AwardsListResponseSchema>
    >();
    expectTypeOf<AwardTypes.AwardsSortedResponse>().toEqualTypeOf<
      z.infer<typeof AwardRouteSchemas.AwardsSortedResponseSchema>
    >();
    expectTypeOf<AwardTypes.AwardsFilteredResponse>().toEqualTypeOf<
      z.infer<typeof AwardRouteSchemas.AwardsFilteredResponseSchema>
    >();
    expectTypeOf<AwardTypes.AwdSearchRequest>().toEqualTypeOf<
      z.input<typeof AwardRouteSchemas.AwdSearchRequestSchema>
    >();

    const emptyRequest: AwardTypes.AwdSearchRequest = {};
    const nestedDefaultsRequest: AwardTypes.AwdSearchRequest = { pagination: {} };

    expect(AwardRouteSchemas.AwardsListRequestSchema.parse({})).toEqual({
      page: 1,
      pageSize: 100,
    });
    expect(AwardRouteSchemas.AwdSearchRequestSchema.parse(emptyRequest)).toEqual({});
    expect(AwardRouteSchemas.AwdSearchRequestSchema.parse(nestedDefaultsRequest)).toEqual({
      pagination: { page: 1, pageSize: 100 },
    });
  });

  it("matches concrete award route fixtures against generated Core references", () => {
    const nestedAward = {
      ...award,
      funding: {
        awardedAmount: { amount: "450000.00", currency: "USD" },
      },
    };
    const filters = {
      status: { operator: "in", value: ["awarded"] },
    };
    const paginationInfo = {
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    };
    const sortInfo = {
      sortBy: "funding.awardedAmount",
      sortOrder: "desc",
    };
    const responseBase = {
      status: 200,
      message: "Success",
      items: [nestedAward],
      paginationInfo,
    };
    const sortedResponse = { ...responseBase, sortInfo };

    const fixtures = [
      {
        name: "awards list request",
        schema: AwardRouteSchemas.AwardsListRequestSchema,
        jsonSchemaId: "AwardsListRequest.yaml",
        value: { page: 1, pageSize: 20 },
      },
      {
        name: "award get request",
        schema: AwardRouteSchemas.AwardGetRequestSchema,
        jsonSchemaId: "AwardGetRequest.yaml",
        value: { awdId: AWARD_ID },
      },
      {
        name: "award search request",
        schema: AwardRouteSchemas.AwdSearchRequestSchema,
        jsonSchemaId: "AwdSearchRequest.yaml",
        value: {
          search: "community health",
          filters,
          sorting: { sortBy: "funding.awardedAmount", sortOrder: "desc" },
          pagination: { page: 1, pageSize: 20 },
        },
      },
      {
        name: "award response",
        schema: AwardRouteSchemas.AwardResponseSchema,
        jsonSchemaId: "AwardResponse.yaml",
        value: { status: 200, message: "Success", data: nestedAward },
      },
      {
        name: "awards list response",
        schema: AwardRouteSchemas.AwardsListResponseSchema,
        jsonSchemaId: "AwardsListResponse.yaml",
        value: responseBase,
      },
      {
        name: "awards sorted response",
        schema: AwardRouteSchemas.AwardsSortedResponseSchema,
        jsonSchemaId: "AwardsSortedResponse.yaml",
        value: sortedResponse,
      },
      {
        name: "awards filtered response",
        schema: AwardRouteSchemas.AwardsFilteredResponseSchema,
        jsonSchemaId: "AwardsFilteredResponse.yaml",
        value: { ...sortedResponse, filterInfo: { filters } },
      },
    ];
    const responses = fixtures.slice(3);

    for (const { name, schema, value } of fixtures) {
      expect(schema.safeParse(value).success, `${name} should satisfy its runtime schema`).toBe(
        true
      );
    }
    for (const { name, schema, value } of responses) {
      expect(
        schema.safeParse({ ...value, status: 201 }).success,
        `${name} should require status 200`
      ).toBe(false);
    }

    for (const { name, jsonSchemaId, value } of fixtures) {
      expect(validate(ajv, jsonSchemaId, value).isValid, `${name} should match Core`).toBe(true);
    }
    for (const { name, jsonSchemaId, value } of responses) {
      expect(
        validate(ajv, jsonSchemaId, { ...value, status: 201 }).isValid,
        `${name} Core reference should require status 200`
      ).toBe(false);
    }
  });

  it("rejects malformed responses and preserves protocol-valid serialized output", () => {
    const nestedAward = {
      ...award,
      funding: {
        requestedAmount: { amount: "500000.00", currency: "USD" },
        awardedAmount: { amount: "450000.00", currency: "USD" },
      },
      opportunity: {
        id: "018f2e77-3a4b-4c1d-9e2f-abcdef123456",
        title: "Health Center Capital Improvement Program",
      },
    };
    const paginationInfo = {
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    };
    const sortInfo = {
      sortBy: "funding.awardedAmount",
      sortOrder: "desc",
      errors: [],
    };
    const filters = {
      status: { operator: "in", value: ["awarded"] },
      customFilters: {
        serviceArea: { operator: "eq", value: "rural" },
      },
    };
    const awardResponse = {
      status: 200,
      message: "Success",
      data: nestedAward,
    };
    const listResponse = {
      status: 200,
      message: "Success",
      items: [nestedAward],
      paginationInfo,
    };
    const sortedResponse = { ...listResponse, sortInfo };
    const filteredResponse = {
      ...sortedResponse,
      filterInfo: { filters, errors: [] },
    };
    const validResponses: Array<{
      name: string;
      schema: z.ZodType;
      jsonSchemaId: string;
      value: unknown;
      preserved: object;
    }> = [
      {
        name: "award response",
        schema: AwardRouteSchemas.AwardResponseSchema,
        jsonSchemaId: "AwardResponse.yaml",
        value: awardResponse,
        preserved: {
          data: {
            title: nestedAward.title,
            funding: nestedAward.funding,
            opportunity: nestedAward.opportunity,
          },
        },
      },
      {
        name: "awards list response",
        schema: AwardRouteSchemas.AwardsListResponseSchema,
        jsonSchemaId: "AwardsListResponse.yaml",
        value: listResponse,
        preserved: {
          items: [{ title: nestedAward.title, funding: nestedAward.funding }],
          paginationInfo,
        },
      },
      {
        name: "awards sorted response",
        schema: AwardRouteSchemas.AwardsSortedResponseSchema,
        jsonSchemaId: "AwardsSortedResponse.yaml",
        value: sortedResponse,
        preserved: {
          items: [{ title: nestedAward.title }],
          paginationInfo,
          sortInfo,
        },
      },
      {
        name: "awards filtered response",
        schema: AwardRouteSchemas.AwardsFilteredResponseSchema,
        jsonSchemaId: "AwardsFilteredResponse.yaml",
        value: filteredResponse,
        preserved: {
          items: [{ title: nestedAward.title }],
          paginationInfo,
          sortInfo,
          filterInfo: { filters, errors: [] },
        },
      },
    ];

    for (const { name, schema, jsonSchemaId, value, preserved } of validResponses) {
      const parsed = schema.parse(value);
      const serialized = JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;

      expect(serialized, `${name} should preserve nested response fields`).toMatchObject(preserved);
      expect(
        validate(ajv, jsonSchemaId, serialized).isValid,
        `${name} should serialize to Core`
      ).toBe(true);
    }

    const emptyList = {
      ...listResponse,
      items: [],
      paginationInfo: { page: 1, pageSize: 1, totalItems: 0, totalPages: 0 },
    };
    expect(AwardRouteSchemas.AwardsListResponseSchema.safeParse(emptyList).success).toBe(true);
    expect(validate(ajv, "AwardsListResponse.yaml", emptyList).isValid).toBe(true);

    const invalidCases: Array<{
      name: string;
      schema: z.ZodType;
      jsonSchemaId: string;
      value: unknown;
    }> = [
      {
        name: "missing award data",
        schema: AwardRouteSchemas.AwardResponseSchema,
        jsonSchemaId: "AwardResponse.yaml",
        value: { status: 200, message: "Success" },
      },
      {
        name: "missing list items",
        schema: AwardRouteSchemas.AwardsListResponseSchema,
        jsonSchemaId: "AwardsListResponse.yaml",
        value: { status: 200, message: "Success", paginationInfo },
      },
      {
        name: "missing pagination metadata",
        schema: AwardRouteSchemas.AwardsListResponseSchema,
        jsonSchemaId: "AwardsListResponse.yaml",
        value: { status: 200, message: "Success", items: [nestedAward] },
      },
      {
        name: "missing sort metadata",
        schema: AwardRouteSchemas.AwardsSortedResponseSchema,
        jsonSchemaId: "AwardsSortedResponse.yaml",
        value: listResponse,
      },
      {
        name: "missing filter metadata",
        schema: AwardRouteSchemas.AwardsFilteredResponseSchema,
        jsonSchemaId: "AwardsFilteredResponse.yaml",
        value: sortedResponse,
      },
      {
        name: "malformed read award",
        schema: AwardRouteSchemas.AwardResponseSchema,
        jsonSchemaId: "AwardResponse.yaml",
        value: { ...awardResponse, data: { ...nestedAward, description: undefined } },
      },
      {
        name: "malformed listed award",
        schema: AwardRouteSchemas.AwardsListResponseSchema,
        jsonSchemaId: "AwardsListResponse.yaml",
        value: {
          ...listResponse,
          items: [{ ...nestedAward, status: { value: "pending" } }],
        },
      },
      {
        name: "null pagination metadata",
        schema: AwardRouteSchemas.AwardsListResponseSchema,
        jsonSchemaId: "AwardsListResponse.yaml",
        value: { ...listResponse, paginationInfo: null },
      },
      {
        name: "null sort metadata",
        schema: AwardRouteSchemas.AwardsSortedResponseSchema,
        jsonSchemaId: "AwardsSortedResponse.yaml",
        value: { ...sortedResponse, sortInfo: null },
      },
      {
        name: "null filter metadata",
        schema: AwardRouteSchemas.AwardsFilteredResponseSchema,
        jsonSchemaId: "AwardsFilteredResponse.yaml",
        value: { ...filteredResponse, filterInfo: null },
      },
      {
        name: "malformed custom filter",
        schema: AwardRouteSchemas.AwardsFilteredResponseSchema,
        jsonSchemaId: "AwardsFilteredResponse.yaml",
        value: {
          ...filteredResponse,
          filterInfo: {
            filters: { customFilters: { serviceArea: { value: "rural" } } },
          },
        },
      },
      ...validResponses.map(({ name, schema, jsonSchemaId, value }) => ({
        name: `${name} with invalid success status`,
        schema,
        jsonSchemaId,
        value: { ...(value as object), status: 201 },
      })),
    ];

    for (const { name, schema, jsonSchemaId, value } of invalidCases) {
      expect(schema.safeParse(value).success, `${name} should fail its runtime schema`).toBe(false);
      expect(validate(ajv, jsonSchemaId, value).isValid, `${name} should fail Core`).toBe(false);
    }
  });
});
