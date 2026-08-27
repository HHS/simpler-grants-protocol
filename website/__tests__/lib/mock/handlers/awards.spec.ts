/**
 * Handler + fixture suite for the awards endpoints (#3C-2-T1), the first
 * resource added past opportunities. `Models.AwardBase` and the `Awards`
 * router interface were both added in protocol v0.4
 * (`lib/core/lib/core/models/award.tsp`, `lib/core/lib/core/routes/awards.tsp`),
 * so every call here targets version "0.4.0" directly against the handler
 * functions rather than through `handleMockRequest` — the router doesn't yet
 * know the `/awards` path exists, and wiring it (plus the pre-v0.4 404) is a
 * separate ticket's router spec, not this one.
 */
import { describe, it, expect } from "vitest";
import {
  AWARD_FIXTURES,
  CANONICAL_AWARD_ID,
  getAwardById,
  allAwards,
} from "@/lib/mock/data/awards";
import { listAwards, getAward, searchAwards } from "@/lib/mock/handlers/awards";
import { CANONICAL_RECORD_ID, RESERVED_MISSING_ID } from "@/lib/mock/data/ids";

const VERSION = "0.4.0";
const STATUS_VALUES = ["awarded", "completed", "cancelled", "custom"];

/** Builds a request URL carrying the given query/path suffix. Only used to
 * construct valid `Request` objects for the handlers below — since they are
 * called directly rather than through the router, the host/base path are
 * placeholders. */
function awardsUrl(suffix = ""): string {
  return `https://docs.example/api/v${VERSION}/common-grants/awards${suffix}`;
}

describe("AWARD_FIXTURES", () => {
  it("CANONICAL_AWARD_ID matches the shared canonical id every resource's path parameter resolves to", () => {
    expect(CANONICAL_AWARD_ID).toBe(CANONICAL_RECORD_ID);
  });

  it("gives every record the AwardBase-required fields", () => {
    for (const award of AWARD_FIXTURES) {
      expect(typeof award.id).toBe("string");
      expect(typeof award.title).toBe("string");
      expect(typeof award.description).toBe("string");
      expect(typeof award.createdAt).toBe("string");
      expect(typeof award.lastModifiedAt).toBe("string");

      expect(typeof award.status).toBe("object");
      expect(STATUS_VALUES).toContain(award.status.value);
    }
  });

  it("includes all four status values, and every 'custom' record carries a customValue", () => {
    const values = AWARD_FIXTURES.map((award) => award.status.value);
    for (const status of STATUS_VALUES) {
      expect(values).toContain(status);
    }

    const customRecords = AWARD_FIXTURES.filter(
      (award) => award.status.value === "custom",
    );
    expect(customRecords.length).toBeGreaterThan(0);
    for (const award of customRecords) {
      expect(typeof award.status.customValue).toBe("string");
    }
  });

  // Enough records, with every status represented, so status filtering (see
  // the searchAwards suite below) visibly narrows the result set rather than
  // collapsing to zero or to the whole set.
  it("contains at least 8 records, with every status value represented", () => {
    expect(AWARD_FIXTURES.length).toBeGreaterThanOrEqual(8);

    const values = AWARD_FIXTURES.map((award) => award.status.value);
    for (const status of STATUS_VALUES) {
      expect(values).toContain(status);
    }
  });

  it("has unique ids across the fixture set, with the reserved 404 id absent", () => {
    const ids = AWARD_FIXTURES.map((award) => award.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getAwardById(RESERVED_MISSING_ID)).toBeUndefined();
  });

  it("allAwards() returns every fixture record", () => {
    expect(allAwards()).toHaveLength(AWARD_FIXTURES.length);
  });
});

describe("getAwardById", () => {
  it("resolves CANONICAL_AWARD_ID to a record whose id matches", () => {
    const award = getAwardById(CANONICAL_AWARD_ID);

    expect(award).toBeDefined();
    expect(award!.id).toBe(CANONICAL_AWARD_ID);
  });

  it("returns undefined for an unknown id", () => {
    expect(getAwardById("does-not-exist")).toBeUndefined();
  });
});

describe("GET /v{version}/common-grants/awards (list)", () => {
  it("returns a 200 with the protocol paginated envelope, ordered by lastModifiedAt descending by default", async () => {
    const response = listAwards(new Request(awardsUrl()), VERSION);

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
    expect(body.message).toBe("Success");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(AWARD_FIXTURES.length);

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
      totalItems: AWARD_FIXTURES.length,
      totalPages: 1,
    });
  });

  it("returns 400 with the protocol Error shape for page=0", async () => {
    const response = listAwards(new Request(awardsUrl("?page=0")), VERSION);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      message: string;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(400);
    expect(body.message).toBe("Invalid pagination parameters");
    expect(body.errors).toEqual([
      { field: "page", message: "Must be at least 1" },
    ]);
  });
});

describe("GET /v{version}/common-grants/awards/{awdId} (detail)", () => {
  // Swagger UI pre-fills every path parameter box with the specs' single
  // `CommonGrants.Types.uuid` example (see `data/ids.ts`'s docstring), so this
  // is the id an untouched "Try it out" sends for this route. It must not 404.
  it("returns 200 for the id Swagger UI pre-fills into every path parameter box", async () => {
    const response = getAward(CANONICAL_AWARD_ID, VERSION);

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: number;
      data: { id: string };
    };

    expect(body.status).toBe(200);
    expect(body.data.id).toBe(CANONICAL_AWARD_ID);
  });

  it("returns 400 with a field-level validation error for a malformed (non-UUID) awdId", async () => {
    const response = getAward("not-a-uuid", VERSION);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(400);
    expect(body.errors).toEqual([
      { field: "awdId", message: "Must be a valid UUID" },
    ]);
  });

  it("returns 404 with an awdId field error for a well-formed but unknown UUID", async () => {
    const response = getAward(RESERVED_MISSING_ID, VERSION);

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      status: number;
      message: string;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(404);
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.some((error) => error.field === "awdId")).toBe(true);
  });
});

describe("POST /v{version}/common-grants/awards/search", () => {
  async function runSearch(body: unknown) {
    const response = await searchAwards(
      new Request(awardsUrl("/search"), {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
      VERSION,
    );

    expect(response.status).toBe(200);

    return (await response.json()) as {
      status: number;
      message: string;
      items: Array<
        Record<string, unknown> & {
          id: string;
          status: { value: string };
          opportunity?: { id: string };
          funding?: { awardedAmount?: { amount: string; currency: string } };
        }
      >;
      paginationInfo: unknown;
      sortInfo: unknown;
      filterInfo: unknown;
    };
  }

  it("returns 200 with items, paginationInfo, sortInfo, and filterInfo for an empty body", async () => {
    const body = await runSearch({});

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.paginationInfo).toBeDefined();
    expect(body.sortInfo).toBeDefined();
    expect(body.filterInfo).toBeDefined();
  });

  it("filters to a proper subset matching status = awarded, relative to the unfiltered result set", async () => {
    const unfilteredBody = await runSearch({});
    expect(unfilteredBody.items.length).toBe(AWARD_FIXTURES.length);

    const filteredBody = await runSearch({
      filters: { status: { operator: "in", value: ["awarded"] } },
    });

    expect(filteredBody.items.length).toBeGreaterThan(0);
    expect(filteredBody.items.length).toBeLessThan(AWARD_FIXTURES.length);
    for (const item of filteredBody.items) {
      expect(item.status.value).toBe("awarded");
    }
  });

  // The id is drawn from a real fixture record's `opportunity.id` rather than
  // hardcoded, so the test doesn't assume a specific fixture layout — only
  // that at least one award references an opportunity.
  it("narrows results when filtering on opportunityId", async () => {
    const withOpportunity = AWARD_FIXTURES.find(
      (award) => award.opportunity?.id !== undefined,
    );
    expect(withOpportunity).toBeDefined();
    const opportunityId = withOpportunity!.opportunity!.id;

    const body = await runSearch({
      filters: {
        opportunityId: { operator: "in", value: [opportunityId] },
      },
    });

    expect(body.items.length).toBeGreaterThan(0);
    for (const item of body.items) {
      expect(item.opportunity?.id).toBe(opportunityId);
    }
  });

  it("narrows results on funding.awardedAmount when filtering with awardedAmountRange", async () => {
    const amounts = AWARD_FIXTURES.filter(
      (award) => award.funding?.awardedAmount !== undefined,
    ).map((award) => Number(award.funding!.awardedAmount!.amount));

    expect(amounts.length).toBeGreaterThan(1);

    const sorted = [...amounts].sort((a, b) => a - b);
    // A bound covering only the lower half of the observed amounts, so the
    // filtered result set is a proper, non-empty subset of the fixtures.
    const midpoint = sorted[Math.floor(sorted.length / 2)];

    const body = await runSearch({
      filters: {
        awardedAmountRange: {
          operator: "between",
          value: {
            min: { amount: String(sorted[0]), currency: "USD" },
            max: { amount: String(midpoint), currency: "USD" },
          },
        },
      },
    });

    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.length).toBeLessThan(AWARD_FIXTURES.length);
    for (const item of body.items) {
      const amount = item.funding?.awardedAmount?.amount;
      expect(amount).toBeDefined();
      expect(Number(amount)).toBeLessThanOrEqual(midpoint);
    }
  });

  // Valid `AwdSortBy` wire values (`lib/core/lib/core/models/award.tsp`):
  // lastModifiedAt, createdAt, title, status.value, keyDates.awardDate,
  // funding.awardedAmount, custom. Anything else must be rejected rather than
  // silently ignored.
  it("returns 400 with a sorting.sortBy field error for an unknown sortBy value", async () => {
    const response = await searchAwards(
      new Request(awardsUrl("/search"), {
        method: "POST",
        body: JSON.stringify({
          sorting: { sortBy: "not_a_real_sort_field" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(400);
    expect(body.errors.some((error) => error.field === "sorting.sortBy")).toBe(
      true,
    );
  });

  it("returns 400 'Malformed JSON body' for a malformed JSON body", async () => {
    const response = await searchAwards(
      new Request(awardsUrl("/search"), {
        method: "POST",
        body: "{not valid json",
        headers: { "Content-Type": "application/json" },
      }),
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      message: string;
    };

    expect(body.status).toBe(400);
    expect(body.message).toBe("Malformed JSON body");
  });
});
