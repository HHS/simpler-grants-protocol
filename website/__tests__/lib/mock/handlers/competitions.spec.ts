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
import { getFormById } from "@/lib/mock/data/forms";
import { getCompetition } from "@/lib/mock/handlers/competitions";
import { RESERVED_MISSING_ID } from "@/lib/mock/data/ids";
import type { Version } from "@/lib/mock/data/fixtures";

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

  it("embeds real form fixtures in forms.forms, not copies — every value resolves via getFormById", () => {
    for (const competition of COMPETITION_FIXTURES) {
      const forms = competition.forms.forms;
      expect(Object.keys(forms).length).toBeGreaterThan(0);

      for (const form of Object.values(forms)) {
        const fixture = getFormById(form.id);
        expect(fixture).toBeDefined();
        expect(form).toEqual(fixture);
      }
    }
  });

  it("names keys of forms.forms in forms.validation.required, not form ids", () => {
    for (const competition of COMPETITION_FIXTURES) {
      const required = competition.forms.validation?.required;
      if (!required) continue;

      const formKeys = Object.keys(competition.forms.forms);
      const formIds = Object.values(competition.forms.forms).map(
        (form) => form.id,
      );

      for (const key of required) {
        expect(formKeys).toContain(key);
        expect(formIds).not.toContain(key);
      }
    }
  });

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
