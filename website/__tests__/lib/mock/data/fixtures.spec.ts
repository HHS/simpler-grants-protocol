/**
 * Fixture suite ported verbatim from the 3A standalone Worker (#1078):
 * `mock-api/__tests__/data/fixtures.spec.ts` on branch
 * `karina/1077-cloudflareworkermock`. The only edit is the import path — the
 * records under test are byte-identical to the Worker's.
 */
import { describe, it, expect } from "vitest";
import {
  CANONICAL_OPPORTUNITY_ID,
  OPPORTUNITY_FIXTURES,
  RESERVED_MISSING_OPPORTUNITY_ID,
  SUPPORTED_VERSIONS,
  isSupportedVersion,
  shapeOpportunityForVersion,
  getById,
  allForVersion,
  type Opportunity,
} from "@/lib/mock/data/fixtures";

const STATUS_VALUES = ["forecasted", "open", "closed", "custom"];

describe("OPPORTUNITY_FIXTURES", () => {
  // Pin raised deliberately from 8–12 when #1101 grew the set to 25 so
  // pagination/sorting/filtering visibly bite; see the pageSize=20 test below.
  it("contains between 24 and 30 detail-shaped records", () => {
    expect(OPPORTUNITY_FIXTURES.length).toBeGreaterThanOrEqual(24);
    expect(OPPORTUNITY_FIXTURES.length).toBeLessThanOrEqual(30);
  });

  // Swagger UI pre-fills the `oppId` box with the specs' `Types.uuid` example.
  // If no fixture carries that id, the first Execute a visitor runs — with the
  // field untouched — answers 404 instead of the documented record.
  it("carries the id the specs publish as their uuid example", () => {
    const canonical = getById(CANONICAL_OPPORTUNITY_ID);

    expect(canonical).toBeDefined();
    expect(canonical!.title).toBe("Small business grant program");
    expect(canonical!.description).toBe(
      "This program provides funding to small businesses to help them grow and create jobs",
    );
    expect(canonical!.status).toEqual({
      value: "open",
      description: "The opportunity is currently accepting applications",
    });
    expect(canonical!.funding?.totalAmountAvailable).toEqual({
      amount: "1000000.00",
      currency: "USD",
    });
  });

  it("sorts the documented example first under the list endpoint's default ordering", () => {
    const newestFirst = [...OPPORTUNITY_FIXTURES].sort(
      (a, b) =>
        new Date(b.lastModifiedAt).getTime() -
        new Date(a.lastModifiedAt).getTime(),
    );

    expect(newestFirst[0].id).toBe(CANONICAL_OPPORTUNITY_ID);
  });

  it("leaves the reserved 404 id absent from the fixture set", () => {
    expect(getById(RESERVED_MISSING_OPPORTUNITY_ID)).toBeUndefined();
  });

  it("gives every record the OpportunityBase-emitted shape", () => {
    for (const opp of OPPORTUNITY_FIXTURES) {
      expect(typeof opp.id).toBe("string");
      expect(typeof opp.title).toBe("string");
      expect(typeof opp.description).toBe("string");
      expect(typeof opp.createdAt).toBe("string");
      expect(typeof opp.lastModifiedAt).toBe("string");

      expect(typeof opp.status).toBe("object");
      expect(STATUS_VALUES).toContain(opp.status.value);

      expect(opp.funding).toBeDefined();
      const amounts = [
        opp.funding?.totalAmountAvailable,
        opp.funding?.minAwardAmount,
        opp.funding?.maxAwardAmount,
      ].filter(Boolean);
      expect(amounts.length).toBeGreaterThan(0);
      expect(typeof amounts[0]?.amount).toBe("string");
      expect(typeof amounts[0]?.currency).toBe("string");

      expect(opp.keyDates?.closeDate).toBeDefined();
    }
  });

  it("includes all four status values, and 'custom' records carry a customValue", () => {
    const values = OPPORTUNITY_FIXTURES.map((opp) => opp.status.value);
    for (const status of STATUS_VALUES) {
      expect(values).toContain(status);
    }

    const customRecords = OPPORTUNITY_FIXTURES.filter(
      (opp) => opp.status.value === "custom",
    );
    expect(customRecords.length).toBeGreaterThan(0);
    for (const opp of customRecords) {
      expect(typeof opp.status.customValue).toBe("string");
    }
  });

  // The spec's documented example pageSize is 20 (@example(20) on
  // PaginatedResultsInfo.pageSize). With at least 24 records, listing at that
  // page size yields a visible second page, and every status has enough
  // records that filtering by status visibly narrows the results rather than
  // collapsing to a single known record.
  it("has enough records for pagination and status filtering to have visible effect at pageSize=20", () => {
    expect(OPPORTUNITY_FIXTURES.length).toBeGreaterThanOrEqual(24);

    const values = OPPORTUNITY_FIXTURES.map((opp) => opp.status.value);
    for (const status of STATUS_VALUES) {
      const count = values.filter((value) => value === status).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("shapeOpportunityForVersion", () => {
  const detailRecord = OPPORTUNITY_FIXTURES.find(
    (opp) => Boolean(opp.competitions) && Boolean(opp.acceptedApplicantTypes),
  ) as Opportunity;

  it("strips v0.2+-only fields for v0.1 detail records", () => {
    expect(detailRecord).toBeDefined();

    const shaped = shapeOpportunityForVersion(detailRecord, "0.1.0", "detail");

    expect(shaped).not.toHaveProperty("competitions");
    expect(shaped).not.toHaveProperty("acceptedApplicantTypes");
  });

  it("retains acceptedApplicantTypes and competitions for v0.2 detail records", () => {
    const shaped = shapeOpportunityForVersion(detailRecord, "0.2.0", "detail");

    expect(shaped).toHaveProperty("acceptedApplicantTypes");
    expect(shaped).toHaveProperty("competitions");
  });

  it("never includes competitions on a v0.3 list-variant record", () => {
    const shaped = shapeOpportunityForVersion(detailRecord, "0.3.0", "list");

    expect(shaped).not.toHaveProperty("competitions");
  });

  it("allForVersion('0.1.0') strips acceptedApplicantTypes/competitions from every record", () => {
    const shaped = allForVersion("0.1.0");

    for (const opp of shaped) {
      expect(opp).not.toHaveProperty("acceptedApplicantTypes");
      expect(opp).not.toHaveProperty("competitions");
    }
  });

  it("allForVersion('0.3.0') returns the same number of (list-shaped) records", () => {
    const shaped = allForVersion("0.3.0");

    expect(shaped.length).toBe(OPPORTUNITY_FIXTURES.length);
  });

  it("shapes 0.4.0 identically to 0.3.0 for both list and detail variants", () => {
    expect(shapeOpportunityForVersion(detailRecord, "0.4.0", "list")).toEqual(
      shapeOpportunityForVersion(detailRecord, "0.3.0", "list"),
    );
    expect(shapeOpportunityForVersion(detailRecord, "0.4.0", "detail")).toEqual(
      shapeOpportunityForVersion(detailRecord, "0.3.0", "detail"),
    );
  });
});

describe("getById", () => {
  it("has unique ids across the fixture set", () => {
    const ids = OPPORTUNITY_FIXTURES.map((opp) => opp.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves the STEM Education Grant Program seeded from the mock API server", () => {
    const opp = getById("573525f2-8e15-4405-83fb-e6523511d893");

    expect(opp?.title).toBe("STEM Education Grant Program");
  });

  it("returns undefined for an unknown id", () => {
    expect(getById("does-not-exist")).toBeUndefined();
  });
});

describe("isSupportedVersion", () => {
  it.each(SUPPORTED_VERSIONS)("accepts the supported version %s", (version) => {
    expect(isSupportedVersion(version)).toBe(true);
  });

  it("accepts 0.4.0 as a supported version", () => {
    expect(isSupportedVersion("0.4.0")).toBe(true);
  });

  it("rejects a version the fixture cannot shape", () => {
    expect(isSupportedVersion("0.5.0")).toBe(false);
  });
});
