import { describe, it, expect } from "vitest";
import type { HttpHandler } from "msw";
import { buildOpportunityHandlers } from "@/lib/mock/opportunities/handlers";
import { OPPORTUNITY_FIXTURES } from "@/lib/mock/opportunities/fixtures";

const OPPORTUNITIES_URL = "http://localhost/common-grants/opportunities";

describe("buildOpportunityHandlers", () => {
  describe("GET /common-grants/opportunities (list)", () => {
    it("returns a 200 with all fixtures sorted by lastModifiedAt descending and default pagination", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(OPPORTUNITIES_URL),
        requestId: "test-list",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(200);

      const body = (await result!.response!.json()) as {
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
        totalItems: 10,
        totalPages: 1,
      });
    });

    it("returns an empty items array with valid paginationInfo when page is past the end", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(`${OPPORTUNITIES_URL}?page=999`),
        requestId: "test-list-page-past-end",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(200);

      const body = (await result!.response!.json()) as {
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
        totalItems: 10,
        totalPages: 1,
      });
    });

    it("clamps pageSize to 100 when a larger value is requested", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(`${OPPORTUNITIES_URL}?pageSize=9999`),
        requestId: "test-list-pagesize-too-large",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(200);

      const body = (await result!.response!.json()) as {
        paginationInfo: { pageSize: number };
      };

      expect(body.paginationInfo.pageSize).toBe(100);
    });

    it.each([0, -5])(
      "clamps pageSize to at least 1 when pageSize=%i is requested",
      async (pageSizeValue) => {
        const handlers = buildOpportunityHandlers("0.3.0");

        const handler = handlers.find(
          (h) => String(h.info.path) === "/common-grants/opportunities",
        );
        expect(handler).toBeDefined();

        const result = await handler!.run({
          request: new Request(
            `${OPPORTUNITIES_URL}?pageSize=${pageSizeValue}`,
          ),
          requestId: `test-list-pagesize-${pageSizeValue}`,
          resolutionContext: { baseUrl: "http://localhost/" },
        });

        expect(result).not.toBeNull();
        expect(result!.response?.status).toBe(200);

        const body = (await result!.response!.json()) as {
          paginationInfo: { pageSize: number };
        };

        expect(body.paginationInfo.pageSize).toBeGreaterThanOrEqual(1);
      },
    );

    it("falls back to the default pageSize when a non-numeric value is requested", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(`${OPPORTUNITIES_URL}?pageSize=abc`),
        requestId: "test-list-pagesize-non-numeric",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(200);

      const body = (await result!.response!.json()) as {
        paginationInfo: { pageSize: number };
      };

      expect(body.paginationInfo.pageSize).toBe(100);
    });
  });

  describe("GET /common-grants/opportunities/:oppId (detail)", () => {
    // Picks a fixture that carries `competitions` (present on the
    // OpportunityDetails shape, stripped from the OpportunityBase/list
    // projection) so this test can't pass by accident on a record where the
    // two shapes happen to coincide.
    const STEM_ID = "573525f2-8e15-4405-83fb-e6523511d893";

    it("echoes the requested oppId and matches the list item's shared fields, while adding the detail-only competitions field", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const listHandler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities",
      );
      expect(listHandler).toBeDefined();

      const detailHandler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/:oppId",
      );
      expect(detailHandler).toBeDefined();

      const listResult = await listHandler!.run({
        request: new Request(OPPORTUNITIES_URL),
        requestId: "test-list-for-detail",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      const listBody = (await listResult!.response!.json()) as {
        items: Array<Record<string, unknown> & { id: string }>;
      };
      const listItem = listBody.items.find((item) => item.id === STEM_ID);
      expect(listItem).toBeDefined();
      // The list (OpportunityBase) projection never carries `competitions`.
      expect(listItem).not.toHaveProperty("competitions");

      const detailResult = await detailHandler!.run({
        request: new Request(
          `http://localhost/common-grants/opportunities/${STEM_ID}`,
        ),
        requestId: "test-detail",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(detailResult).not.toBeNull();
      expect(detailResult!.response?.status).toBe(200);

      const detailBody = (await detailResult!.response!.json()) as {
        status: number;
        message: string;
        data: Record<string, unknown> & { id: string; competitions: unknown };
      };

      expect(detailBody.status).toBe(200);
      // id echo: the returned record's id matches the requested :oppId.
      expect(detailBody.data.id).toBe(STEM_ID);
      // consistency: every field the list projection carries matches the
      // detail record's value for that same field (same underlying record).
      for (const [field, value] of Object.entries(listItem!)) {
        expect(detailBody.data[field]).toEqual(value);
      }
      // detail-only field: OpportunityDetails adds `competitions`.
      expect(detailBody.data.competitions).toBeDefined();
    });

    it("returns 404 with the protocol Error shape for a well-formed but unknown UUID", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const detailHandler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/:oppId",
      );
      expect(detailHandler).toBeDefined();

      const UNKNOWN_ID = "00000000-0000-0000-0000-000000000000";

      const result = await detailHandler!.run({
        request: new Request(
          `http://localhost/common-grants/opportunities/${UNKNOWN_ID}`,
        ),
        requestId: "test-detail-unknown",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(404);

      const body = (await result!.response!.json()) as {
        status: number;
        message: string;
        errors: unknown[];
      };

      expect(body.status).toBe(404);
      expect(typeof body.message).toBe("string");
      expect(body.message.length).toBeGreaterThan(0);
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it("returns 400 with a field-level validation error for a malformed (non-UUID) oppId", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const detailHandler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/:oppId",
      );
      expect(detailHandler).toBeDefined();

      const result = await detailHandler!.run({
        request: new Request(
          "http://localhost/common-grants/opportunities/not-a-uuid",
        ),
        requestId: "test-detail-malformed",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(400);

      const body = (await result!.response!.json()) as {
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
    });

    it("omits competitions and acceptedApplicantTypes from a v0.1 detail response", async () => {
      const handlers = buildOpportunityHandlers("0.1.0");

      const detailHandler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/:oppId",
      );
      expect(detailHandler).toBeDefined();

      const result = await detailHandler!.run({
        request: new Request(
          `http://localhost/common-grants/opportunities/${STEM_ID}`,
        ),
        requestId: "test-detail-v0.1",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(200);

      const body = (await result!.response!.json()) as {
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
    it("returns identical bodies across two calls to the list endpoint", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const listHandler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities",
      );
      expect(listHandler).toBeDefined();

      const resultA = await listHandler!.run({
        request: new Request(OPPORTUNITIES_URL),
        requestId: "test-determinism-list-a",
        resolutionContext: { baseUrl: "http://localhost/" },
      });
      const resultB = await listHandler!.run({
        request: new Request(OPPORTUNITIES_URL),
        requestId: "test-determinism-list-b",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      const bodyA = await resultA!.response!.json();
      const bodyB = await resultB!.response!.json();

      expect(bodyA).toEqual(bodyB);
    });

    it("returns identical bodies across two calls to the detail endpoint for the same oppId", async () => {
      const STEM_ID = "573525f2-8e15-4405-83fb-e6523511d893";
      const handlers = buildOpportunityHandlers("0.3.0");

      const detailHandler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/:oppId",
      );
      expect(detailHandler).toBeDefined();

      const resultA = await detailHandler!.run({
        request: new Request(
          `http://localhost/common-grants/opportunities/${STEM_ID}`,
        ),
        requestId: "test-determinism-detail-a",
        resolutionContext: { baseUrl: "http://localhost/" },
      });
      const resultB = await detailHandler!.run({
        request: new Request(
          `http://localhost/common-grants/opportunities/${STEM_ID}`,
        ),
        requestId: "test-determinism-detail-b",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      const bodyA = await resultA!.response!.json();
      const bodyB = await resultB!.response!.json();

      expect(bodyA).toEqual(bodyB);
    });
  });

  describe("POST /common-grants/opportunities/search", () => {
    const SEARCH_URL = "http://localhost/common-grants/opportunities/search";

    async function runSearch(handlers: HttpHandler[], body: unknown) {
      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/search",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(SEARCH_URL, {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }),
        requestId: "test-search",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(200);

      return (await result!.response!.json()) as {
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

    it("filters to a proper subset matching the status filter, relative to the unfiltered result set", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const unfilteredBody = await runSearch(handlers, {});
      expect(Array.isArray(unfilteredBody.items)).toBe(true);
      expect(unfilteredBody.items.length).toBe(OPPORTUNITY_FIXTURES.length);

      const inBody = await runSearch(handlers, {
        filters: { status: { operator: "in", value: ["open"] } },
      });

      expect(inBody.items.length).toBeLessThan(OPPORTUNITY_FIXTURES.length);
      for (const item of inBody.items) {
        expect(item.status.value).toBe("open");
      }

      const notInBody = await runSearch(handlers, {
        filters: { status: { operator: "notIn", value: ["open"] } },
      });

      for (const item of notInBody.items) {
        expect(item.status.value).not.toBe("open");
      }
    });

    it("reorders items in reverse when sortOrder flips from asc to desc, for the same sortBy field", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      // `funding.maxAwardAmount` is present (and distinct) on every fixture
      // record, so this sort key has no ties/undefined-handling ambiguity.
      const ascBody = await runSearch(handlers, {
        sorting: { sortBy: "funding.maxAwardAmount", sortOrder: "asc" },
      });
      const descBody = await runSearch(handlers, {
        sorting: { sortBy: "funding.maxAwardAmount", sortOrder: "desc" },
      });

      const ascIds = ascBody.items.map((item) => item.id);
      const descIds = descBody.items.map((item) => item.id);

      // Guard against a no-op sort implementation trivially "passing" by both
      // orderings being identical (e.g. both left in fixture/insertion order).
      expect(ascIds).not.toEqual(descIds);
      expect(ascIds).toEqual([...descIds].reverse());
    });

    it("returns 400 with the protocol Error shape for an unknown sortBy value", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/search",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(SEARCH_URL, {
          method: "POST",
          body: JSON.stringify({
            sorting: { sortBy: "not_a_real_sort_field" },
          }),
          headers: { "Content-Type": "application/json" },
        }),
        requestId: "test-search-invalid-sortby",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(400);

      const body = (await result!.response!.json()) as {
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
    });

    it("echoes customFilters in filterInfo.filters without letting them narrow results beyond the applied status filter", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const requestFilters = {
        status: { operator: "in" as const, value: ["open"] },
        customFilters: { legacyId: { operator: "eq", value: 12345 } },
      };

      const body = await runSearch(handlers, { filters: requestFilters });

      expect(body.filterInfo.filters).toEqual(requestFilters);
      expect(body.filterInfo.filters.customFilters).toEqual({
        legacyId: { operator: "eq", value: 12345 },
      });
      expect(body.filterInfo.filters.status).toEqual({
        operator: "in",
        value: ["open"],
      });

      // customFilters is echoed only, so results are still narrowed purely by
      // the applied `status` filter.
      expect(body.items.length).toBeGreaterThan(0);
      for (const item of body.items) {
        expect(item.status.value).toBe("open");
      }
    });

    it("returns 400 with the protocol Error shape for a malformed JSON body", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/search",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(SEARCH_URL, {
          method: "POST",
          body: "{not valid json",
          headers: { "Content-Type": "application/json" },
        }),
        requestId: "test-search-malformed",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(400);

      const body = (await result!.response!.json()) as {
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

    it("partitions the fixture set into disjoint, complementary halves when the same maxAwardAmountRange bound is queried with `between` vs `outside`", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      // Bound chosen against the real fixture data (see fixtures.ts): splits
      // the 10 records' `funding.maxAwardAmount` values (25k, 30k, 50k, 60k,
      // 75k, 100k, 120k, 250k, 500k, 2M) into 6 inside [50000, 250000] and 4
      // outside it, so neither half is degenerate.
      const bound = {
        min: { amount: "50000.00", currency: "USD" },
        max: { amount: "250000.00", currency: "USD" },
      };

      const recordsWithMaxAward = OPPORTUNITY_FIXTURES.filter(
        (opp) => opp.funding?.maxAwardAmount !== undefined,
      );

      const betweenBody = await runSearch(handlers, {
        filters: {
          maxAwardAmountRange: { operator: "between", value: bound },
        },
      });
      const outsideBody = await runSearch(handlers, {
        filters: {
          maxAwardAmountRange: { operator: "outside", value: bound },
        },
      });

      const betweenIds = new Set(betweenBody.items.map((item) => item.id));
      const outsideIds = new Set(outsideBody.items.map((item) => item.id));

      expect(betweenIds.size).toBeGreaterThan(0);
      expect(outsideIds.size).toBeGreaterThan(0);

      // Disjoint: no id appears in both the "between" and "outside" results.
      for (const id of betweenIds) {
        expect(outsideIds.has(id)).toBe(false);
      }

      // Complementary: together they cover every fixture record that has a
      // `funding.maxAwardAmount` value at all.
      const unionIds = new Set([...betweenIds, ...outsideIds]);
      expect(unionIds.size).toBe(recordsWithMaxAward.length);
      for (const opp of recordsWithMaxAward) {
        expect(unionIds.has(opp.id)).toBe(true);
      }
    });

    it("returns an empty items array with a well-formed envelope when a maxAwardAmountRange bound matches no fixture record", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      // Every fixture's `funding.maxAwardAmount` tops out at 2,000,000.00, so
      // this bound is clearly outside all of them.
      const body = await runSearch(handlers, {
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
        // The handler falls back to `totalPages: 1` (via `|| 1`) rather than
        // 0 when there are no matching items, even though
        // Math.ceil(0 / pageSize) is 0.
        totalPages: 1,
      });

      expect(body.sortInfo).toBeTypeOf("object");
      expect(body.sortInfo).not.toBeNull();
      expect(body.filterInfo).toBeTypeOf("object");
      expect(body.filterInfo).not.toBeNull();
      expect(body.filterInfo.filters).toBeDefined();
    });

    it("excludes every fixture record from a maxAwardAmountRange bound denominated in a different currency, regardless of operator", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      // Every fixture's `funding.maxAwardAmount` is USD-denominated (see
      // fixtures.ts's `usd()` helper), and this EUR-denominated bound is wide
      // enough to numerically contain every fixture's amount if currency were
      // ignored. Per the protocol (`lib/core/lib/core/models/opportunity/search.tsp`),
      // a currency mismatch excludes the record regardless of `operator`.
      const bound = {
        min: { amount: "0.00", currency: "EUR" },
        max: { amount: "999999999.00", currency: "EUR" },
      };

      const betweenBody = await runSearch(handlers, {
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

      const outsideBody = await runSearch(handlers, {
        filters: {
          maxAwardAmountRange: { operator: "outside", value: bound },
        },
      });

      // The currency mismatch excludes the record unconditionally, before the
      // operator is even considered, so `outside` also returns zero items
      // rather than inverting to all 10.
      expect(outsideBody.items).toHaveLength(0);
    });

    it("returns 400 with the protocol Error shape for an unknown filter operator", async () => {
      const handlers = buildOpportunityHandlers("0.3.0");

      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/search",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(SEARCH_URL, {
          method: "POST",
          body: JSON.stringify({
            filters: { status: { operator: "contains", value: ["open"] } },
          }),
          headers: { "Content-Type": "application/json" },
        }),
        requestId: "test-search-invalid-operator",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(400);

      const body = (await result!.response!.json()) as {
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
      const handlers = buildOpportunityHandlers("0.3.0");

      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/search",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(SEARCH_URL, {
          method: "POST",
          body: JSON.stringify({
            filters: { status: { operator: "in", value: 5 } },
          }),
          headers: { "Content-Type": "application/json" },
        }),
        requestId: "test-search-malformed-status-value",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(400);

      const body = (await result!.response!.json()) as {
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
      const handlers = buildOpportunityHandlers("0.3.0");

      const handler = handlers.find(
        (h) => String(h.info.path) === "/common-grants/opportunities/search",
      );
      expect(handler).toBeDefined();

      const result = await handler!.run({
        request: new Request(SEARCH_URL, {
          method: "POST",
          body: JSON.stringify({
            filters: { closeDateRange: { operator: "between" } },
          }),
          headers: { "Content-Type": "application/json" },
        }),
        requestId: "test-search-range-filter-missing-value",
        resolutionContext: { baseUrl: "http://localhost/" },
      });

      expect(result).not.toBeNull();
      expect(result!.response?.status).toBe(400);

      const body = (await result!.response!.json()) as {
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
      const handlers = buildOpportunityHandlers("0.3.0");

      // Bound chosen against the real fixture data (see fixtures.ts): the 10
      // records' `funding.maxAwardAmount` values (25k, 30k, 50k, 60k, 75k,
      // 100k, 120k, 250k, 500k, 2M) split into 8 at-or-above 50000 and 2
      // below it, so this is a proper, non-degenerate subset.
      const body = await runSearch(handlers, {
        filters: {
          maxAwardAmountRange: {
            operator: "between",
            value: { min: { amount: "50000.00", currency: "USD" } },
          },
        },
      });

      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items.length).toBeLessThan(OPPORTUNITY_FIXTURES.length);

      const fullBody = await runSearch(handlers, {});
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
  });
});
