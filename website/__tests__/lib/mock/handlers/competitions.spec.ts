/**
 * Handler + fixture suite for the competitions endpoint. The spec instantiates
 * only `read` for competitions, so there is deliberately no list or apply
 * suite here.
 */
import { describe, it, expect } from "vitest";
import {
  COMPETITION_FIXTURES,
  CANONICAL_COMPETITION_ID,
  DOCUMENTED_COMPETITION_ID,
  getCompetitionById,
} from "@/lib/mock/data/competitions";
import { getCompetition } from "@/lib/mock/handlers/competitions";
import { RESERVED_MISSING_ID } from "@/lib/mock/data/ids";
import { OPPORTUNITY_FIXTURES, type Version } from "@/lib/mock/data/fixtures";

const VERSION: Version = "0.4.0";
const STATUS_VALUES = ["open", "closed", "custom"];

describe("COMPETITION_FIXTURES", () => {
  it("gives every record the CompetitionBase-required fields", () => {
    for (const competition of COMPETITION_FIXTURES) {
      expect(typeof competition.id).toBe("string");
      expect(typeof competition.opportunityId).toBe("string");
      expect(typeof competition.title).toBe("string");
      expect(typeof competition.status).toBe("object");
      expect(typeof competition.forms).toBe("object");
      expect(typeof competition.createdAt).toBe("string");
      expect(typeof competition.lastModifiedAt).toBe("string");
    }
  });

  // Embedded-form identity and the `validation.required` key rule are pinned
  // in `data/cross-resource.spec.ts`, which checks them by object identity
  // rather than deep equality and so catches strictly more.

  it("gives every fixture a status.value in open/closed/custom, with a customValue on every custom one", () => {
    for (const competition of COMPETITION_FIXTURES) {
      expect(STATUS_VALUES).toContain(competition.status.value);
      if (competition.status.value === "custom") {
        expect(typeof competition.status.customValue).toBe("string");
      }
    }
  });

  it("has unique ids across the fixture set, with the reserved 404 id absent", () => {
    const ids = COMPETITION_FIXTURES.map((competition) => competition.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getCompetitionById(RESERVED_MISSING_ID)).toBeUndefined();
  });
});

describe("GET /v{version}/common-grants/competitions/{compId} (detail)", () => {
  it("returns 200 for the id Swagger UI pre-fills into every path parameter box", async () => {
    const response = getCompetition(CANONICAL_COMPETITION_ID, VERSION);

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: number;
      data: { id: string };
    };

    expect(body.status).toBe(200);
    expect(body.data.id).toBe(CANONICAL_COMPETITION_ID);
  });

  it("returns 200 for the id the CompetitionBase example itself publishes", async () => {
    const response = getCompetition(DOCUMENTED_COMPETITION_ID, VERSION);

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: number;
      data: { id: string };
    };

    expect(body.status).toBe(200);
    expect(body.data.id).toBe(DOCUMENTED_COMPETITION_ID);
  });

  it("returns 400 with a field-level validation error for a malformed (non-UUID) compId", async () => {
    const response = getCompetition("not-a-uuid", VERSION);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(400);
    expect(body.errors).toEqual([
      { field: "compId", message: "Must be a valid UUID" },
    ]);
  });

  it("returns 404 with a compId field error for a well-formed but unknown UUID", async () => {
    const response = getCompetition(RESERVED_MISSING_ID, VERSION);

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      status: number;
      message: string;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(404);
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.some((error) => error.field === "compId")).toBe(true);
  });
});

describe("competition detail per protocol version", () => {
  const canonical = getCompetitionById(CANONICAL_COMPETITION_ID);
  const opportunity = OPPORTUNITY_FIXTURES.find(
    (opp) => opp.id === canonical?.opportunityId,
  );

  /** The `data` of a canonical-competition detail response at `version`. */
  async function detail(version: Version) {
    const response = getCompetition(CANONICAL_COMPETITION_ID, version);
    expect(response.status).toBe(200);
    return ((await response.json()) as { data: Record<string, unknown> }).data;
  }

  /** The forms nested in a served competition. */
  function formsOf(data: Record<string, unknown>) {
    const forms = (data.forms as { forms: Record<string, object> }).forms;
    expect(Object.keys(forms).length).toBeGreaterThan(0);
    return Object.values(forms);
  }

  it("references a real opportunity that has identifiers, or the v0.5 checks prove less", () => {
    expect(opportunity?.identifiers).toBeDefined();
  });

  it.each(["0.2.0", "0.3.0", "0.4.0"] as Version[])(
    "serves opportunityId and named forms at v%s",
    async (version) => {
      const data = await detail(version);

      expect(data.opportunityId).toBe(opportunity?.id);
      expect(data).not.toHaveProperty("opportunity");
      for (const form of formsOf(data)) {
        expect(form).toHaveProperty("name");
        expect(form).not.toHaveProperty("title");
      }
    },
  );

  it("serves a v0.5 opportunity reference read from the real opportunity, in opportunityId's place", async () => {
    const data = await detail("0.5.0");

    expect(data).not.toHaveProperty("opportunityId");
    expect(data.opportunity).toEqual({
      id: opportunity?.id,
      title: opportunity?.title,
      identifiers: opportunity?.identifiers,
    });
    expect(Object.keys(data)[1]).toBe("opportunity");
  });

  it("keeps nested forms on name at v0.5", async () => {
    for (const form of formsOf(await detail("0.5.0"))) {
      expect(form).toHaveProperty("name");
      expect(form).not.toHaveProperty("title");
    }
  });

  it("leaves the fixtures and each version's output intact across interleaved requests", async () => {
    const first = await detail("0.4.0");
    const latest = await detail("0.5.0");

    expect(await detail("0.4.0")).toEqual(first);
    expect(await detail("0.5.0")).toEqual(latest);
    expect(canonical?.opportunityId).toBe(opportunity?.id);
    expect(canonical).not.toHaveProperty("opportunity");
  });
});
