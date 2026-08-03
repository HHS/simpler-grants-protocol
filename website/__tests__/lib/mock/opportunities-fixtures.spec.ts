import { describe, it, expect } from "vitest";
import {
  OPPORTUNITY_FIXTURES,
  shapeOpportunityForVersion,
  getById,
  allForVersion,
  type Opportunity,
} from "@/lib/mock/opportunities/fixtures";

const STATUS_VALUES = ["forecasted", "open", "closed", "custom"];

describe("OPPORTUNITY_FIXTURES", () => {
  it("contains between 8 and 12 detail-shaped records", () => {
    expect(OPPORTUNITY_FIXTURES.length).toBeGreaterThanOrEqual(8);
    expect(OPPORTUNITY_FIXTURES.length).toBeLessThanOrEqual(12);
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
