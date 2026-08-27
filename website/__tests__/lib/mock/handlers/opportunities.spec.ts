/**
 * Handler suite ported from the 3A standalone Worker (#1078): imports, entry
 * point, and base path adjusted, assertions unchanged.
 * `golden-envelopes.spec.ts` verifies the port against the Worker's output.
 */
import { describe, it, expect } from "vitest";
import { handleMockRequest } from "@/lib/mock/router";
import {
  CANONICAL_OPPORTUNITY_ID,
  OPPORTUNITY_FIXTURES,
  RESERVED_MISSING_OPPORTUNITY_ID,
  type Version,
} from "@/lib/mock/data/fixtures";

const VERSIONS: Version[] = ["0.1.0", "0.2.0", "0.3.0", "0.4.0"];

/** Builds `https://docs.example/api/v{version}/common-grants/opportunities{suffix}`. */
function opportunitiesUrl(version: string, suffix = ""): string {
  return `https://docs.example/api/v${version}/common-grants/opportunities${suffix}`;
}

describe("opportunities routes", () => {
  describe("GET /v{version}/common-grants/opportunities (list)", () => {
    it("returns a 200 with all fixtures sorted by lastModifiedAt descending and default pagination", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0")),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        status: number;
        message: string;
        items: Array<{ lastModifiedAt: string }>;
        paginationInfo: {
          page: number;
          pageSize: number;
          totalItems: number;
          totalPages: number;
        };
      };

      expect(body.status).toBe(200);
      expect(typeof body.message).toBe("string");

      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items).toHaveLength(OPPORTUNITY_FIXTURES.length);

      for (let i = 1; i < body.items.length; i++) {
        expect(
          new Date(body.items[i - 1].lastModifiedAt).getTime(),
        ).toBeGreaterThanOrEqual(
          new Date(body.items[i].lastModifiedAt).getTime(),
        );
      }

      expect(body.paginationInfo).toEqual({
        page: 1,
        pageSize: 100,
        totalItems: OPPORTUNITY_FIXTURES.length,
        totalPages: 1,
      });
    });

    it("returns an empty items array with valid paginationInfo when page is past the end", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0", "?page=999")),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        items: unknown[];
        paginationInfo: {
          page: number;
          pageSize: number;
          totalItems: number;
          totalPages: number;
        };
      };

      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items).toHaveLength(0);

      expect(body.paginationInfo).toEqual({
        page: 999,
        pageSize: 100,
        totalItems: OPPORTUNITY_FIXTURES.length,
        totalPages: 1,
      });
    });

    it("honors a pageSize above the default, since the spec declares no maximum", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0", "?pageSize=9999")),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        paginationInfo: { pageSize: number; totalPages: number };
      };

      expect(body.paginationInfo.pageSize).toBe(9999);
      expect(body.paginationInfo.totalPages).toBe(1);
    });

    it.each([
      ["pageSize", "0"],
      ["pageSize", "-5"],
      ["page", "0"],
    ])(
      "returns 400 with the protocol Error shape when %s=%s falls below the spec minimum",
      async (param, value) => {
        const response = await handleMockRequest(
          new Request(opportunitiesUrl("0.3.0", `?${param}=${value}`)),
        );

        expect(response.status).toBe(400);

        const body = (await response.json()) as {
          status: number;
          message: string;
          errors: Array<{ field: string; message: string }>;
        };

        expect(body.status).toBe(400);
        expect(typeof body.message).toBe("string");
        expect(body.errors).toEqual([
          { field: param, message: "Must be at least 1" },
        ]);
      },
    );

    it("returns 400 when a pagination param is present but not an integer", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0", "?pageSize=abc")),
      );

      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        errors: Array<{ field: string; message: string }>;
      };

      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].field).toBe("pageSize");
      expect(body.errors[0].message).toContain("integer");
    });

    it("applies both spec defaults when the pagination params are omitted entirely", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0")),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        paginationInfo: { page: number; pageSize: number };
      };

      expect(body.paginationInfo.page).toBe(1);
      expect(body.paginationInfo.pageSize).toBe(100);
    });
  });

  describe("GET /v{version}/common-grants/opportunities/{oppId} (detail)", () => {
    // A fixture that carries `competitions` (detail-only field), so the
    // list/detail shape tests can't pass by accident.
    const STEM_ID = "573525f2-8e15-4405-83fb-e6523511d893";

    // Swagger UI pre-fills `oppId` with this id, so an untouched "Execute"
    // sends exactly this request. It must not 404.
    it.each(VERSIONS)(
      "answers 200 for the id Swagger UI pre-fills, for v%s",
      async (version) => {
        const response = await handleMockRequest(
          new Request(
            opportunitiesUrl(version, `/${CANONICAL_OPPORTUNITY_ID}`),
          ),
        );

        expect(response.status).toBe(200);

        const body = (await response.json()) as {
          data: { id: string; title: string };
        };

        expect(body.data.id).toBe(CANONICAL_OPPORTUNITY_ID);
        // The value the spec's own "Example Value" pane advertises.
        expect(body.data.title).toBe("Small business grant program");
      },
    );

    it("echoes the requested oppId and matches the list item's shared fields, while adding the detail-only competitions field", async () => {
      const listResponse = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0")),
      );

      const listBody = (await listResponse.json()) as {
        items: Array<Record<string, unknown> & { id: string }>;
      };
      const listItem = listBody.items.find((item) => item.id === STEM_ID);
      expect(listItem).toBeDefined();
      // The list projection never carries `competitions`.
      expect(listItem).not.toHaveProperty("competitions");

      const detailResponse = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0", `/${STEM_ID}`)),
      );

      expect(detailResponse.status).toBe(200);

      const detailBody = (await detailResponse.json()) as {
        status: number;
        message: string;
        data: Record<string, unknown> & { id: string; competitions: unknown };
      };

      expect(detailBody.status).toBe(200);
      expect(detailBody.data.id).toBe(STEM_ID);
      // Every field the list projection carries must match the detail record.
      for (const [field, value] of Object.entries(listItem!)) {
        expect(detailBody.data[field]).toEqual(value);
      }
      expect(detailBody.data.competitions).toBeDefined();
    });

    it.each(VERSIONS)(
      "returns 404 with the protocol Error shape for a well-formed but unknown UUID, for v%s",
      async (version) => {
        const response = await handleMockRequest(
          new Request(
            opportunitiesUrl(version, `/${RESERVED_MISSING_OPPORTUNITY_ID}`),
          ),
        );

        expect(response.status).toBe(404);

        const body = (await response.json()) as {
          status: number;
          message: string;
          errors: unknown[];
        };

        expect(body.status).toBe(404);
        expect(typeof body.message).toBe("string");
        expect(body.message.length).toBeGreaterThan(0);
        expect(Array.isArray(body.errors)).toBe(true);
        expect(body.errors.length).toBeGreaterThan(0);
      },
    );

    it.each(VERSIONS)(
      "returns 400 with a field-level validation error for a malformed (non-UUID) oppId, for v%s",
      async (version) => {
        const response = await handleMockRequest(
          new Request(opportunitiesUrl(version, "/not-a-uuid")),
        );

        expect(response.status).toBe(400);

        const body = (await response.json()) as {
          status: number;
          message: string;
          errors: Array<{ field: string; message: string }>;
        };

        expect(body.status).toBe(400);
        expect(typeof body.message).toBe("string");
        expect(body.message.length).toBeGreaterThan(0);
        expect(Array.isArray(body.errors)).toBe(true);
        expect(body.errors.length).toBeGreaterThan(0);

        const oppIdError = body.errors.find((error) => error.field === "oppId");
        expect(oppIdError).toBeDefined();
        expect(typeof oppIdError!.message).toBe("string");
        expect(oppIdError!.message.length).toBeGreaterThan(0);
      },
    );

    it("omits competitions and acceptedApplicantTypes from a v0.1 detail response", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.1.0", `/${STEM_ID}`)),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        status: number;
        message: string;
        data: Record<string, unknown> & { id: string };
      };

      expect(body.data).not.toHaveProperty("competitions");
      expect(body.data).not.toHaveProperty("acceptedApplicantTypes");
      expect(body.data.id).toBe(STEM_ID);
    });
  });

  describe("determinism", () => {
    it.each(VERSIONS)(
      "returns identical bodies across two calls to the list endpoint for v%s",
      async (version) => {
        const responseA = await handleMockRequest(
          new Request(opportunitiesUrl(version)),
        );
        const responseB = await handleMockRequest(
          new Request(opportunitiesUrl(version)),
        );

        const bodyA = await responseA.json();
        const bodyB = await responseB.json();

        expect(bodyA).toEqual(bodyB);
      },
    );

    it.each(VERSIONS)(
      "returns identical bodies across two calls to the detail endpoint for the same oppId for v%s",
      async (version) => {
        const STEM_ID = "573525f2-8e15-4405-83fb-e6523511d893";

        const responseA = await handleMockRequest(
          new Request(opportunitiesUrl(version, `/${STEM_ID}`)),
        );
        const responseB = await handleMockRequest(
          new Request(opportunitiesUrl(version, `/${STEM_ID}`)),
        );

        const bodyA = await responseA.json();
        const bodyB = await responseB.json();

        expect(bodyA).toEqual(bodyB);
      },
    );

    it.each(VERSIONS)(
      "list→detail: every field on the list item deep-equals the corresponding detail field, and the detail echoes the requested id, for v%s",
      async (version) => {
        const STEM_ID = "573525f2-8e15-4405-83fb-e6523511d893";

        const listResponse = await handleMockRequest(
          new Request(opportunitiesUrl(version)),
        );

        const listBody = (await listResponse.json()) as {
          items: Array<Record<string, unknown> & { id: string }>;
        };
        const listItem = listBody.items.find((item) => item.id === STEM_ID);
        expect(listItem).toBeDefined();

        const detailResponse = await handleMockRequest(
          new Request(opportunitiesUrl(version, `/${STEM_ID}`)),
        );

        expect(detailResponse.status).toBe(200);

        const detailBody = (await detailResponse.json()) as {
          status: number;
          message: string;
          data: Record<string, unknown> & { id: string };
        };

        expect(detailBody.status).toBe(200);
        expect(detailBody.data.id).toBe(STEM_ID);
        // Every field the list projection carries must match the detail record.
        for (const [field, value] of Object.entries(listItem!)) {
          expect(detailBody.data[field]).toEqual(value);
        }
      },
    );
  });

  describe("POST /v{version}/common-grants/opportunities/search", () => {
    async function runSearch(version: string, body: unknown) {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl(version, "/search"), {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }),
      );

      expect(response.status).toBe(200);

      return (await response.json()) as {
        status: number;
        message: string;
        items: Array<{ id: string; status: { value: string } }>;
        paginationInfo: unknown;
        sortInfo: unknown;
        filterInfo: {
          filters: Record<string, unknown> & {
            status?: { operator: string; value: string[] };
            customFilters?: Record<string, unknown>;
          };
          errors?: unknown[];
        };
      };
    }

    it.each(VERSIONS)(
      "filters to a proper subset matching the status filter, relative to the unfiltered result set, for v%s",
      async (version) => {
        const unfilteredBody = await runSearch(version, {});
        expect(Array.isArray(unfilteredBody.items)).toBe(true);
        expect(unfilteredBody.items.length).toBe(OPPORTUNITY_FIXTURES.length);

        const inBody = await runSearch(version, {
          filters: { status: { operator: "in", value: ["open"] } },
        });

        expect(inBody.items.length).toBeLessThan(OPPORTUNITY_FIXTURES.length);
        for (const item of inBody.items) {
          expect(item.status.value).toBe("open");
        }

        const notInBody = await runSearch(version, {
          filters: { status: { operator: "notIn", value: ["open"] } },
        });

        for (const item of notInBody.items) {
          expect(item.status.value).not.toBe("open");
        }
      },
    );

    it.each(VERSIONS)(
      "reorders items in reverse when sortOrder flips from asc to desc, for the same sortBy field, for v%s",
      async (version) => {
        // `funding.maxAwardAmount` is present and distinct on every fixture,
        // so this sort key has no ties.
        const ascBody = await runSearch(version, {
          sorting: { sortBy: "funding.maxAwardAmount", sortOrder: "asc" },
        });
        const descBody = await runSearch(version, {
          sorting: { sortBy: "funding.maxAwardAmount", sortOrder: "desc" },
        });

        const ascIds = ascBody.items.map((item) => item.id);
        const descIds = descBody.items.map((item) => item.id);

        // Guard against a no-op sort passing with two identical orderings.
        expect(ascIds).not.toEqual(descIds);
        expect(ascIds).toEqual([...descIds].reverse());
      },
    );

    it.each(VERSIONS)(
      "returns 400 with the protocol Error shape for an unknown sortBy value, for v%s",
      async (version) => {
        const response = await handleMockRequest(
          new Request(opportunitiesUrl(version, "/search"), {
            method: "POST",
            body: JSON.stringify({
              sorting: { sortBy: "not_a_real_sort_field" },
            }),
            headers: { "Content-Type": "application/json" },
          }),
        );

        expect(response.status).toBe(400);

        const body = (await response.json()) as {
          status: number;
          message: string;
          errors: Array<{ field: string; message: string }>;
        };

        expect(body.status).toBe(400);
        expect(typeof body.message).toBe("string");
        expect(body.message.length).toBeGreaterThan(0);
        expect(Array.isArray(body.errors)).toBe(true);
        expect(body.errors.length).toBeGreaterThan(0);

        const sortByError = body.errors.find((error) => "field" in error);
        expect(sortByError).toBeDefined();
      },
    );

    it("echoes customFilters in filterInfo.filters without letting them narrow results beyond the applied status filter", async () => {
      const requestFilters = {
        status: { operator: "in" as const, value: ["open"] },
        customFilters: { legacyId: { operator: "eq", value: 12345 } },
      };

      const body = await runSearch("0.3.0", { filters: requestFilters });

      expect(body.filterInfo.filters).toEqual(requestFilters);
      expect(body.filterInfo.filters.customFilters).toEqual({
        legacyId: { operator: "eq", value: 12345 },
      });
      expect(body.filterInfo.filters.status).toEqual({
        operator: "in",
        value: ["open"],
      });

      // customFilters is echoed only; results are narrowed by `status` alone.
      expect(body.items.length).toBeGreaterThan(0);
      for (const item of body.items) {
        expect(item.status.value).toBe("open");
      }
    });

    it("returns 400 with the protocol Error shape for a malformed JSON body", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: "{not valid json",
          headers: { "Content-Type": "application/json" },
        }),
      );

      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        status: number;
        message: string;
        errors: unknown[];
      };

      expect(body.status).toBe(400);
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });

    // Valid JSON values that are not objects clear `request.json()` but must
    // still get a 400, not a crash that escapes the handler.
    it.each(["null", "[]", '"a string"', "42", "true"])(
      "returns 400 with the protocol Error shape for the valid-JSON-but-not-an-object body %s",
      async (rawBody) => {
        const response = await handleMockRequest(
          new Request(opportunitiesUrl("0.3.0", "/search"), {
            method: "POST",
            body: rawBody,
            headers: { "Content-Type": "application/json" },
          }),
        );

        expect(response.status).toBe(400);

        const body = (await response.json()) as {
          status: number;
          message: string;
          errors: unknown[];
        };

        expect(body.status).toBe(400);
        expect(typeof body.message).toBe("string");
        expect(Array.isArray(body.errors)).toBe(true);
        expect(body.errors.length).toBeGreaterThan(0);
      },
    );

    // The router sends GET /search to the detail handler, which rejects
    // "search" as a non-UUID oppId — same as the #1049 spike.
    it("answers GET on the search path with the detail handler's 400, as the spike's :oppId pattern did", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0", "/search")),
      );

      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        status: number;
        message: string;
        errors: Array<{ field: string; message: string }>;
      };

      expect(body.status).toBe(400);
      expect(body.errors[0]).toEqual({
        field: "oppId",
        message: "Must be a valid UUID",
      });
    });

    it("partitions the fixture set into disjoint, complementary halves when the same maxAwardAmountRange bound is queried with `between` vs `outside`", async () => {
      // Splits the fixtures' `funding.maxAwardAmount` values across
      // [50000, 250000], so neither half is degenerate.
      const bound = {
        min: { amount: "50000.00", currency: "USD" },
        max: { amount: "250000.00", currency: "USD" },
      };

      const recordsWithMaxAward = OPPORTUNITY_FIXTURES.filter(
        (opp) => opp.funding?.maxAwardAmount !== undefined,
      );

      const betweenBody = await runSearch("0.3.0", {
        filters: {
          maxAwardAmountRange: { operator: "between", value: bound },
        },
      });
      const outsideBody = await runSearch("0.3.0", {
        filters: {
          maxAwardAmountRange: { operator: "outside", value: bound },
        },
      });

      const betweenIds = new Set(betweenBody.items.map((item) => item.id));
      const outsideIds = new Set(outsideBody.items.map((item) => item.id));

      expect(betweenIds.size).toBeGreaterThan(0);
      expect(outsideIds.size).toBeGreaterThan(0);

      // Disjoint: no id appears in both results.
      for (const id of betweenIds) {
        expect(outsideIds.has(id)).toBe(false);
      }

      // Complementary: together they cover every record with a maxAwardAmount.
      const unionIds = new Set([...betweenIds, ...outsideIds]);
      expect(unionIds.size).toBe(recordsWithMaxAward.length);
      for (const opp of recordsWithMaxAward) {
        expect(unionIds.has(opp.id)).toBe(true);
      }
    });

    it("returns an empty items array with a well-formed envelope when a maxAwardAmountRange bound matches no fixture record", async () => {
      // A bound above every fixture's `funding.maxAwardAmount`.
      const body = await runSearch("0.3.0", {
        filters: {
          maxAwardAmountRange: {
            operator: "between",
            value: {
              min: { amount: "999999999.00", currency: "USD" },
              max: { amount: "1000000000.00", currency: "USD" },
            },
          },
        },
      });

      expect(body.status).toBe(200);
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items).toHaveLength(0);

      expect(body.paginationInfo).toEqual({
        page: 1,
        pageSize: 100,
        totalItems: 0,
        // An empty result set reports zero pages, not one.
        totalPages: 0,
      });

      expect(body.sortInfo).toBeTypeOf("object");
      expect(body.sortInfo).not.toBeNull();
      expect(body.filterInfo).toBeTypeOf("object");
      expect(body.filterInfo).not.toBeNull();
      expect(body.filterInfo.filters).toBeDefined();
    });

    it("excludes every fixture record from a maxAwardAmountRange bound denominated in a different currency, regardless of operator", async () => {
      // All fixture money is USD. Per the protocol, a currency mismatch
      // excludes the record regardless of operator.
      const bound = {
        min: { amount: "0.00", currency: "EUR" },
        max: { amount: "999999999.00", currency: "EUR" },
      };

      const betweenBody = await runSearch("0.3.0", {
        filters: {
          maxAwardAmountRange: { operator: "between", value: bound },
        },
      });

      expect(betweenBody.status).toBe(200);
      expect(Array.isArray(betweenBody.items)).toBe(true);
      expect(betweenBody.items).toHaveLength(0);
      expect(betweenBody.paginationInfo).toBeTypeOf("object");
      expect(betweenBody.sortInfo).toBeTypeOf("object");
      expect(betweenBody.filterInfo).toBeTypeOf("object");
      expect(betweenBody.filterInfo.filters).toBeDefined();

      const outsideBody = await runSearch("0.3.0", {
        filters: {
          maxAwardAmountRange: { operator: "outside", value: bound },
        },
      });

      // So `outside` also returns zero items, not the whole fixture set.
      expect(outsideBody.items).toHaveLength(0);
    });

    it("returns 400 with the protocol Error shape for an unknown filter operator", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: JSON.stringify({
            filters: { status: { operator: "contains", value: ["open"] } },
          }),
          headers: { "Content-Type": "application/json" },
        }),
      );

      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        status: number;
        message: string;
        errors: unknown[];
      };

      expect(body.status).toBe(400);
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it("returns 400 with the protocol Error shape for a status filter whose value is not an array", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: JSON.stringify({
            filters: { status: { operator: "in", value: 5 } },
          }),
          headers: { "Content-Type": "application/json" },
        }),
      );

      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        status: number;
        message: string;
        errors: unknown[];
      };

      expect(body.status).toBe(400);
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it("returns 400 with the protocol Error shape for a range filter with no value", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: JSON.stringify({
            filters: { closeDateRange: { operator: "between" } },
          }),
          headers: { "Content-Type": "application/json" },
        }),
      );

      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        status: number;
        message: string;
        errors: unknown[];
      };

      expect(body.status).toBe(400);
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it("filters using only the given bound when a maxAwardAmountRange filter omits max", async () => {
      // 50000 splits the fixtures' `funding.maxAwardAmount` values into a
      // proper, non-degenerate subset.
      const body = await runSearch("0.3.0", {
        filters: {
          maxAwardAmountRange: {
            operator: "between",
            value: { min: { amount: "50000.00", currency: "USD" } },
          },
        },
      });

      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items.length).toBeLessThan(OPPORTUNITY_FIXTURES.length);

      const fullBody = await runSearch("0.3.0", {});
      const itemsById = new Map(
        fullBody.items.map((item) => [
          item.id,
          item as unknown as {
            funding?: { maxAwardAmount?: { amount: string } };
          },
        ]),
      );

      for (const item of body.items) {
        const fullItem = itemsById.get(item.id);
        expect(fullItem?.funding?.maxAwardAmount?.amount).toBeDefined();
        expect(
          Number(fullItem!.funding!.maxAwardAmount!.amount),
        ).toBeGreaterThanOrEqual(50000);
      }
    });

    // A malformed bound was once dropped silently, answering a filtered
    // request with the entire unfiltered set.
    it.each([
      [
        "closeDateRange",
        { operator: "between", value: { min: "not-a-date" } },
        "filters.closeDateRange.value.min",
      ],
      [
        "maxAwardAmountRange",
        {
          operator: "between",
          value: { max: { amount: "lots", currency: "USD" } },
        },
        "filters.maxAwardAmountRange.value.max",
      ],
      [
        "totalFundingAvailableRange",
        { operator: "between", value: { min: "50000.00" } },
        "filters.totalFundingAvailableRange.value.min",
      ],
    ])(
      "returns 400 rather than silently dropping a malformed %s bound",
      async (field, filter, expectedErrorField) => {
        const response = await handleMockRequest(
          new Request(opportunitiesUrl("0.3.0", "/search"), {
            method: "POST",
            body: JSON.stringify({ filters: { [field]: filter } }),
            headers: { "Content-Type": "application/json" },
          }),
        );

        expect(response.status).toBe(400);

        const body = (await response.json()) as {
          status: number;
          message: string;
          errors: Array<{ field: string; message: string }>;
        };

        expect(body.status).toBe(400);
        expect(body.errors.map((error) => error.field)).toContain(
          expectedErrorField,
        );
      },
    );

    it("reports unapplied customFilters via filterInfo.errors", async () => {
      const body = await runSearch("0.3.0", {
        filters: {
          customFilters: {
            agency: { operator: "in", value: ["NSF"] },
            region: { operator: "in", value: ["Northeast"] },
          },
        },
      });

      // Echoed but not applied, so the result set stays unfiltered.
      expect(body.items).toHaveLength(OPPORTUNITY_FIXTURES.length);
      expect(body.filterInfo.filters.customFilters).toEqual({
        agency: { operator: "in", value: ["NSF"] },
        region: { operator: "in", value: ["Northeast"] },
      });
      expect(body.filterInfo.errors).toHaveLength(1);
      expect(body.filterInfo.errors![0]).toContain("agency");
      expect(body.filterInfo.errors![0]).toContain("region");
    });

    it("omits filterInfo.errors when every filter sent was applied", async () => {
      const body = await runSearch("0.3.0", {
        filters: { status: { operator: "in", value: ["open"] } },
      });

      expect(body.filterInfo.errors).toBeUndefined();
    });

    it("returns 400 for a body pagination value below the spec minimum", async () => {
      const response = await handleMockRequest(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: JSON.stringify({ pagination: { page: 0, pageSize: -1 } }),
          headers: { "Content-Type": "application/json" },
        }),
      );

      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        errors: Array<{ field: string; message: string }>;
      };

      expect(body.errors.map((error) => error.field)).toEqual([
        "pagination.page",
        "pagination.pageSize",
      ]);
    });
  });
});

describe("version path prefix", () => {
  it.each(VERSIONS)(
    "resolves the list, detail, and search routes for v%s",
    async (version) => {
      const listResponse = await handleMockRequest(
        new Request(opportunitiesUrl(version)),
      );
      expect(listResponse.status).toBe(200);

      const detailResponse = await handleMockRequest(
        new Request(opportunitiesUrl(version, `/${CANONICAL_OPPORTUNITY_ID}`)),
      );
      expect(detailResponse.status).toBe(200);

      const searchResponse = await handleMockRequest(
        new Request(opportunitiesUrl(version, "/search"), {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(searchResponse.status).toBe(200);
    },
  );

  it("returns 404 with the protocol error envelope for an unsupported version prefix", async () => {
    const response = await handleMockRequest(
      new Request(
        "https://docs.example/api/v9.9.9/common-grants/opportunities",
      ),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      status: number;
      message: string;
      errors: unknown[];
    };

    expect(body.status).toBe(404);
    expect(typeof body.message).toBe("string");
    expect(Array.isArray(body.errors)).toBe(true);
  });

  it("returns 404 with the protocol error envelope when the version prefix is missing entirely", async () => {
    const response = await handleMockRequest(
      new Request("https://docs.example/api/common-grants/opportunities"),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      status: number;
      message: string;
      errors: unknown[];
    };

    expect(body.status).toBe(404);
    expect(typeof body.message).toBe("string");
    expect(Array.isArray(body.errors)).toBe(true);
  });

  it("returns 404 with the protocol error envelope for a malformed version prefix", async () => {
    const response = await handleMockRequest(
      new Request("https://docs.example/api/vabc/common-grants/opportunities"),
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      status: number;
      message: string;
      errors: unknown[];
    };

    expect(body.status).toBe(404);
    expect(typeof body.message).toBe("string");
    expect(Array.isArray(body.errors)).toBe(true);
  });
});
