import { describe, expect, it } from "vitest";
import { classifyFilters, F, validateFilterCall, validateRoutes } from "@/extensions";
import { FilterError } from "@/extensions";
import type { PluginRoutes } from "@/extensions";
import { OppFiltersSchema } from "@/schemas/zod/models";
import { DefaultFilterSchema } from "@/schemas/zod/filters";

// ############################################################################
// File-scope fixtures
// ############################################################################

/**
 * Grants.gov plugin routes — the canonical demo from the spec (CONTEXT.md §Specific Ideas):
 * - `agency`         → stringArray (custom, registered)
 * - `fundingProgram` → stringComparison (custom, registered)
 */
const grantsGovRoutes: PluginRoutes = {
  opportunities: {
    search: {
      filters: {
        agency: { filterType: "stringArray", description: "Filter by funding agency" },
        fundingProgram: {
          filterType: "stringComparison",
          description: "Filter by funding program",
        },
      },
    },
  },
};

/** Mixed consumer filters: default + registered custom + ad-hoc */
const mixedConsumerFilters: Record<string, unknown> = {
  // Bucket 1 — default filter fields (top-level request-body fields)
  status: { operator: "in", value: ["open", "closed"] },
  closeDateRange: { operator: "between", value: { min: "2025-01-01", max: "2025-12-31" } },
  // Bucket 2 — registered custom filters → customFilters record
  agency: { operator: "in", value: ["HHS", "DOE"] },
  fundingProgram: { operator: "like", value: "SBIR%" },
  // Bucket 3 — ad-hoc filter (not registered, not a default field)
  legacyTag: { operator: "eq", value: "legacy-2024" },
};

// ############################################################################
// classifyFilters tests
// ############################################################################

describe("classifyFilters", () => {
  // ############################################################################
  // Three-bucket classification
  // ############################################################################

  describe("three-bucket classification", () => {
    it("routes default filters to top-level named request-body fields", () => {
      const { result, errors } = classifyFilters(grantsGovRoutes, "opportunities", "search", {
        status: { operator: "in", value: ["open"] },
      });

      expect(result.status).toEqual({ operator: "in", value: ["open"] });
      expect(result.customFilters).toBeUndefined();
      expect(errors).toEqual([]);
    });

    it("routes pre-registered custom filters to customFilters record", () => {
      const { result, errors } = classifyFilters(grantsGovRoutes, "opportunities", "search", {
        agency: { operator: "in", value: ["HHS"] },
      });

      expect(result.customFilters?.agency).toEqual({ operator: "in", value: ["HHS"] });
      expect(result.status).toBeUndefined();
      expect(errors).toEqual([]);
    });

    it("routes ad-hoc filters to customFilters passthrough (no registration required)", () => {
      const { result, errors } = classifyFilters(grantsGovRoutes, "opportunities", "search", {
        legacyTag: { operator: "eq", value: "legacy-2024" },
      });

      expect(result.customFilters?.legacyTag).toEqual({ operator: "eq", value: "legacy-2024" });
      expect(errors).toEqual([]);
    });

    it("builds exact ADR-0012 OppFilters request body for mixed default + custom + ad-hoc input", () => {
      const { result, errors } = classifyFilters(
        grantsGovRoutes,
        "opportunities",
        "search",
        mixedConsumerFilters
      );

      // Assert the exact request body shape
      const expected: ReturnType<typeof OppFiltersSchema.parse> = {
        status: { operator: "in", value: ["open", "closed"] },
        closeDateRange: { operator: "between", value: { min: "2025-01-01", max: "2025-12-31" } },
        customFilters: {
          agency: { operator: "in", value: ["HHS", "DOE"] },
          fundingProgram: { operator: "like", value: "SBIR%" },
          legacyTag: { operator: "eq", value: "legacy-2024" },
        },
      };

      expect(result).toEqual(expected);
      expect(errors).toEqual([]);
    });

    it("passes gov.<system>@<filterName> namespaced keys through to customFilters verbatim", () => {
      const { result } = classifyFilters(grantsGovRoutes, "opportunities", "search", {
        "gov.grants@announcementType": { operator: "eq", value: "NOFO" },
      });

      expect(result.customFilters?.["gov.grants@announcementType"]).toEqual({
        operator: "eq",
        value: "NOFO",
      });
    });

    it("returns only top-level fields when no custom or ad-hoc filters are provided", () => {
      const { result } = classifyFilters(grantsGovRoutes, "opportunities", "search", {
        status: { operator: "in", value: ["open"] },
      });

      expect(result).not.toHaveProperty("customFilters");
    });

    it("handles an empty filters object gracefully", () => {
      const { result, errors } = classifyFilters(grantsGovRoutes, "opportunities", "search", {});

      expect(result).toEqual({});
      expect(errors).toEqual([]);
    });

    // ##########################################################################
    // Fail-soft validation (collect, don't throw)
    // ##########################################################################

    it("collects a FilterError and omits the key when a default filter violates its real field type (status)", () => {
      // `status` is a StringArrayFilter (operator in/notIn, value string[]).
      // `{ operator: "gt", value: 5 }` is a structurally valid DefaultFilter
      // (passes the permissive shape check) but invalid for `status`. Default
      // filters are validated against their real field type — a malformed one is
      // fail-soft: dropped from `result`, surfaced in `errors`, never thrown.
      const { result, errors } = classifyFilters(grantsGovRoutes, "opportunities", "search", {
        status: { operator: "gt", value: 5 },
      });

      expect(result).not.toHaveProperty("status");
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(FilterError);
      expect(errors[0].path).toBe("filters.status");
    });

    it("collects errors for invalid registered and ad-hoc filters, omitting both from result", () => {
      const { result, errors } = classifyFilters(grantsGovRoutes, "opportunities", "search", {
        // registered stringArray given a non-array value → invalid
        agency: { operator: "in", value: "not-an-array" },
        // ad-hoc with a missing operator → invalid shape
        legacyTag: { value: "no-operator" },
      });

      expect(result.customFilters).toBeUndefined();
      expect(errors).toHaveLength(2);
      expect(errors.map(e => e.path).sort()).toEqual(["filters.agency", "filters.legacyTag"]);
    });

    it("keeps valid keys and drops only invalid ones for mixed valid+invalid input", () => {
      const { result, errors } = classifyFilters(grantsGovRoutes, "opportunities", "search", {
        // valid default
        status: { operator: "in", value: ["open"] },
        // invalid default (wrong operator/value for status)
        closeDateRange: { operator: "in", value: ["nope"] },
        // valid registered custom
        agency: { operator: "in", value: ["HHS"] },
        // invalid registered custom (stringArray with non-array value)
        fundingProgram: { operator: "like", value: 12345 },
        // valid ad-hoc
        legacyTag: { operator: "eq", value: "legacy-2024" },
      });

      // Valid keys are present.
      expect(result.status).toEqual({ operator: "in", value: ["open"] });
      expect(result.customFilters?.agency).toEqual({ operator: "in", value: ["HHS"] });
      expect(result.customFilters?.legacyTag).toEqual({ operator: "eq", value: "legacy-2024" });

      // Invalid keys are absent.
      expect(result).not.toHaveProperty("closeDateRange");
      expect(result.customFilters).not.toHaveProperty("fundingProgram");

      // errors count discriminates: exactly the two invalid keys.
      expect(errors).toHaveLength(2);
      expect(errors.map(e => e.path).sort()).toEqual([
        "filters.closeDateRange",
        "filters.fundingProgram",
      ]);
    });
  });

  // ############################################################################
  // Registration-time validation (validateRoutes)
  // ############################################################################

  describe("registration-time validation", () => {
    it("throws FilterError on unknown filterType", () => {
      const badRoutes: PluginRoutes = {
        opportunities: {
          search: {
            filters: {
              // @ts-expect-error — intentionally passing an invalid filterType to test runtime validation
              myFilter: { filterType: "invalidType" },
            },
          },
        },
      };

      expect(() => validateRoutes(badRoutes)).toThrow(FilterError);
    });

    it("FilterError for unknown filterType includes the path and sourceValue", () => {
      const badRoutes: PluginRoutes = {
        opportunities: {
          search: {
            filters: {
              // @ts-expect-error — intentionally passing an invalid filterType
              myFilter: { filterType: "unknownType" },
            },
          },
        },
      };

      try {
        validateRoutes(badRoutes);
        expect.fail("Expected FilterError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(FilterError);
        const pluginErr = err as FilterError;
        expect(pluginErr.path).toBe("routes.opportunities.search.filters.myFilter");
        expect(pluginErr.sourceValue).toMatchObject({ filterType: "unknownType" });
      }
    });

    it("throws FilterError when custom filter name collides with a default filter name (status)", () => {
      const collidingRoutes: PluginRoutes = {
        opportunities: {
          search: {
            filters: {
              // `status` is a default-filter field name — collision
              status: { filterType: "stringComparison" },
            },
          },
        },
      };

      expect(() => validateRoutes(collidingRoutes)).toThrow(FilterError);
    });

    it("throws FilterError when custom filter name collides with closeDateRange", () => {
      const collidingRoutes: PluginRoutes = {
        opportunities: {
          search: {
            filters: {
              closeDateRange: { filterType: "dateRange" },
            },
          },
        },
      };

      expect(() => validateRoutes(collidingRoutes)).toThrow(FilterError);
    });

    it("does not throw for valid routes", () => {
      expect(() => validateRoutes(grantsGovRoutes)).not.toThrow();
    });
  });

  // ############################################################################
  // Call-time validation (validateFilterCall)
  // ############################################################################

  describe("call-time validation", () => {
    it("returns a FilterError on operator/filterType mismatch for a registered filter", () => {
      // `like` operator is not valid for numberComparison (only gt/gte/lt/lte/eq/neq)
      const spec = { filterType: "numberComparison" } as const;

      const err = validateFilterCall(spec, "amount", { operator: "like", value: "100" });
      expect(err).toBeInstanceOf(FilterError);
    });

    it("returns a FilterError on value-shape mismatch for a registered stringArray filter", () => {
      // stringArray requires value to be string[]; passing a plain string fails
      const spec = { filterType: "stringArray" } as const;

      const err = validateFilterCall(spec, "agency", { operator: "in", value: "not-an-array" });
      expect(err).toBeInstanceOf(FilterError);
    });

    it("returns a FilterError on value-shape mismatch for a registered numberComparison filter", () => {
      // numberComparison requires value to be a number; passing a string fails
      const spec = { filterType: "numberComparison" } as const;

      const err = validateFilterCall(spec, "amount", { operator: "eq", value: "not-a-number" });
      expect(err).toBeInstanceOf(FilterError);
    });

    it("returns undefined for a valid integerComparison filter (no throw)", () => {
      const spec = { filterType: "integerComparison" } as const;

      expect(validateFilterCall(spec, "awardCount", { operator: "eq", value: 2 })).toBeUndefined();
    });

    it("returned FilterError path includes the filter name", () => {
      const spec = { filterType: "stringArray" } as const;

      const err = validateFilterCall(spec, "agency", { operator: "in", value: "wrong" });
      expect(err).toBeInstanceOf(FilterError);
      expect(err?.path).toBe("filters.agency");
    });

    it("returns undefined for a valid registered filter (no throw)", () => {
      const spec = { filterType: "stringArray" } as const;

      expect(
        validateFilterCall(spec, "agency", { operator: "in", value: ["HHS", "DOE"] })
      ).toBeUndefined();
    });

    it("returns undefined for an ad-hoc filter with a valid shape (no operator enforcement)", () => {
      // Ad-hoc (spec=undefined) — any valid DefaultFilter shape passes
      expect(
        validateFilterCall(undefined, "legacyTag", { operator: "eq", value: "legacy-2024" })
      ).toBeUndefined();
    });

    it("returns a FilterError for an ad-hoc filter with an invalid shape", () => {
      // Missing `operator` key — fails DefaultFilterSchema shape check (operator is required/enum)
      const err = validateFilterCall(undefined, "badFilter", { value: "something" });
      expect(err).toBeInstanceOf(FilterError);
    });

    it("returns a FilterError for an ad-hoc filter with an unknown operator", () => {
      // `superCustomOp` is not in AllOperatorsEnum — fails DefaultFilterSchema
      const err = validateFilterCall(undefined, "badFilter", {
        operator: "superCustomOp",
        value: "x",
      });
      expect(err).toBeInstanceOf(FilterError);
    });
  });
});

// ############################################################################
// F helpers tests
// ############################################################################

describe("F helpers", () => {
  it("F.eq compiles to { operator: 'eq', value }", () => {
    expect(F.eq("open")).toEqual({ operator: "eq", value: "open" });
  });

  it("F.neq compiles to { operator: 'neq', value }", () => {
    expect(F.neq("closed")).toEqual({ operator: "neq", value: "closed" });
  });

  it("F.gt compiles to { operator: 'gt', value }", () => {
    expect(F.gt(100)).toEqual({ operator: "gt", value: 100 });
  });

  it("F.gte compiles to { operator: 'gte', value }", () => {
    expect(F.gte(100)).toEqual({ operator: "gte", value: 100 });
  });

  it("F.lt compiles to { operator: 'lt', value }", () => {
    expect(F.lt(500)).toEqual({ operator: "lt", value: 500 });
  });

  it("F.lte compiles to { operator: 'lte', value }", () => {
    expect(F.lte(500)).toEqual({ operator: "lte", value: 500 });
  });

  it("F.in compiles to { operator: 'in', value: [...] }", () => {
    expect(F.in(["HHS", "DOE"])).toEqual({ operator: "in", value: ["HHS", "DOE"] });
  });

  it("F.notIn compiles to { operator: 'notIn', value: [...] }", () => {
    expect(F.notIn(["archived"])).toEqual({ operator: "notIn", value: ["archived"] });
  });

  it("F.like compiles to { operator: 'like', value }", () => {
    expect(F.like("SBIR%")).toEqual({ operator: "like", value: "SBIR%" });
  });

  it("F.notLike compiles to { operator: 'notLike', value }", () => {
    expect(F.notLike("TEST%")).toEqual({ operator: "notLike", value: "TEST%" });
  });

  it("F.between compiles to { operator: 'between', value: { min, max } }", () => {
    expect(F.between(100, 500)).toEqual({
      operator: "between",
      value: { min: 100, max: 500 },
    });
  });

  it("F.outside compiles to { operator: 'outside', value: { min, max } }", () => {
    expect(F.outside(0, 50)).toEqual({
      operator: "outside",
      value: { min: 0, max: 50 },
    });
  });

  it("F.* helpers produce values compatible with DefaultFilterSchema", () => {
    // Spot-check that F helper outputs satisfy the request-body schema
    expect(() => DefaultFilterSchema.parse(F.eq("test"))).not.toThrow();
    expect(() => DefaultFilterSchema.parse(F.in(["a", "b"]))).not.toThrow();
    expect(() => DefaultFilterSchema.parse(F.between(100, 500))).not.toThrow();
  });
});
