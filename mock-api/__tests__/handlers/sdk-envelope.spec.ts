/**
 * Pins the envelope details the TS SDK's zod schemas depend on (#1077-T3,
 * PLAN.md): the search response's `sortInfo` + strict-parsed `filterInfo`
 * (no extra keys), and `paginationInfo.totalPages: 0` for empty result sets
 * on both the search and list endpoints.
 *
 * These aren't asserted against `@common-grants/sdk` directly — this package
 * doesn't depend on it — but the key sets below are transcribed from the
 * actual zod schemas so a drift here is a drift the SDK would choke on:
 *
 *  - `lib/ts-sdk/src/schemas/zod/responses.ts:132-139` — `filterInfo` is a
 *    `.strict()` zod object with exactly `filters` and an optional `errors`.
 *    `.strict()` means any *other* key inside `filterInfo` makes the SDK's
 *    `client.opportunities.search()` throw rather than ignore it.
 *  - `lib/ts-sdk/src/schemas/zod/sorting.ts:55-67` — `SortedResultsInfoSchema`
 *    (the `sortInfo` value) requires `sortBy` (string) and `sortOrder`
 *    (`"asc" | "desc"`), with optional `customSortBy` and `errors`. Not
 *    `.strict()`, but missing either required field fails SDK parsing.
 */

import { describe, it, expect } from "vitest";
import worker from "../../src/index";
import { OPPORTUNITY_FIXTURES } from "../../src/data/fixtures";

/** Builds `https://mock.example/v{version}/common-grants/opportunities{suffix}`. */
function opportunitiesUrl(version: string, suffix = ""): string {
  return `https://mock.example/v${version}/common-grants/opportunities${suffix}`;
}

/** Runs a search POST and returns the parsed envelope, asserting a 200 first. */
async function runSearch(body: unknown) {
  const response = await worker.fetch(
    new Request(opportunitiesUrl("0.3.0", "/search"), {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  );

  expect(response.status).toBe(200);

  return (await response.json()) as {
    status: number;
    message: string;
    items: unknown[];
    paginationInfo: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
    sortInfo: Record<string, unknown> & {
      sortBy: string;
      sortOrder: string;
    };
    filterInfo: Record<string, unknown> & {
      filters: Record<string, unknown>;
      errors?: string[];
    };
  };
}

describe("search/list envelope shapes the TS SDK's strict zod schemas depend on", () => {
  describe("filterInfo carries no keys beyond filters and errors", () => {
    // lib/ts-sdk/src/schemas/zod/responses.ts:132-139 — `.strict()` object.
    // These three requests never populate filterInfo.errors, so the allowed
    // key set is exactly `["filters"]`.
    it.each([
      ["a bare {} body with no filters at all", {}],
      [
        "a body with a status filter only",
        { filters: { status: { operator: "in", value: ["open"] } } },
      ],
      [
        // "archived" is a `customValue`, never a `status.value` on any
        // fixture record (see src/data/fixtures.ts), so this matches zero.
        "a body whose filters match zero records",
        { filters: { status: { operator: "in", value: ["archived"] } } },
      ],
    ])("holds for %s", async (_label, requestBody) => {
      const body = await runSearch(requestBody);

      expect(Object.keys(body.filterInfo).sort()).toEqual(["filters"]);
    });

    it("holds on the customFilters path too, where filterInfo.errors is also present", async () => {
      // customFilters is the path that populates filterInfo.errors (see
      // "reports unapplied customFilters via filterInfo.errors" in
      // opportunities.spec.ts), so here the allowed set is exactly the two
      // fields — this is the path most likely to accidentally grow a third.
      const body = await runSearch({
        filters: { customFilters: { agency: { operator: "in", value: ["NSF"] } } },
      });

      expect(Object.keys(body.filterInfo).sort()).toEqual(["errors", "filters"]);
    });
  });

  describe("sortInfo is present on every search response with the SDK's required fields", () => {
    // lib/ts-sdk/src/schemas/zod/sorting.ts:55-67 — sortBy/sortOrder required.
    it("defaults to lastModifiedAt/desc when the request body omits sorting entirely", async () => {
      const body = await runSearch({});

      expect(typeof body.sortInfo.sortBy).toBe("string");
      expect(["asc", "desc"]).toContain(body.sortInfo.sortOrder);
      expect(body.sortInfo.sortBy).toBe("lastModifiedAt");
      expect(body.sortInfo.sortOrder).toBe("desc");

      expect(Object.keys(body.sortInfo).sort()).toEqual(["sortBy", "sortOrder"]);
    });

    it("carries only sortBy/customSortBy/sortOrder/errors when sorting is given explicitly", async () => {
      const body = await runSearch({
        sorting: { sortBy: "funding.maxAwardAmount", sortOrder: "asc" },
      });

      expect(typeof body.sortInfo.sortBy).toBe("string");
      expect(["asc", "desc"]).toContain(body.sortInfo.sortOrder);

      for (const key of Object.keys(body.sortInfo)) {
        expect(["sortBy", "customSortBy", "sortOrder", "errors"]).toContain(key);
      }
    });
  });

  describe("paginationInfo.totalPages is 0, not 1, for an empty result set", () => {
    it("reports totalPages: 0 when a search's filters match zero fixture records", async () => {
      // Math.ceil(0 / pageSize) === 0. An SDK that auto-paginates on
      // `page < totalPages` would loop forever against a `1` here.
      const body = await runSearch({
        filters: { status: { operator: "in", value: ["archived"] } },
      });

      expect(body.items).toHaveLength(0);
      expect(body.paginationInfo).toEqual({
        page: 1,
        pageSize: 100,
        totalItems: 0,
        totalPages: 0,
      });
    });
  });

  describe("the list endpoint's paginationInfo uses the identical derivation", () => {
    // The fixture list is non-empty, so the list route itself can never
    // produce a `totalPages: 0` case — that's pinned above via search, which
    // shares the same `paginationInfo()` helper (src/handlers/opportunities.ts).
    it.each([100, 4])(
      "derives totalPages via Math.ceil(totalItems / pageSize) for pageSize=%i",
      async pageSize => {
        const response = await worker.fetch(
          new Request(opportunitiesUrl("0.3.0", `?pageSize=${pageSize}`))
        );

        expect(response.status).toBe(200);

        const body = (await response.json()) as {
          paginationInfo: {
            page: number;
            pageSize: number;
            totalItems: number;
            totalPages: number;
          };
        };

        expect(Object.keys(body.paginationInfo).sort()).toEqual([
          "page",
          "pageSize",
          "totalItems",
          "totalPages",
        ]);
        expect(body.paginationInfo.totalPages).toBe(
          Math.ceil(OPPORTUNITY_FIXTURES.length / pageSize)
        );
      }
    );
  });

  describe("top-level envelope key sets", () => {
    it("search envelope carries exactly status/message/items/paginationInfo/sortInfo/filterInfo", async () => {
      const response = await worker.fetch(
        new Request(opportunitiesUrl("0.3.0", "/search"), {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        })
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as Record<string, unknown>;

      expect(Object.keys(body).sort()).toEqual(
        ["status", "message", "items", "paginationInfo", "sortInfo", "filterInfo"].sort()
      );
    });

    it("list envelope carries exactly status/message/items/paginationInfo", async () => {
      const response = await worker.fetch(new Request(opportunitiesUrl("0.3.0")));

      expect(response.status).toBe(200);

      const body = (await response.json()) as Record<string, unknown>;

      expect(Object.keys(body).sort()).toEqual(
        ["status", "message", "items", "paginationInfo"].sort()
      );
    });
  });
});
