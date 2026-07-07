import { describe, expect, it } from "vitest";
import { classifyFilters, F, validateRoutes } from "@/extensions";
import { validateFilterCall } from "@/extensions/custom-filters";
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
// validateRoutes / validateFilterCall tests
// ############################################################################

describe("route and filter-call validation", () => {
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

    it("throws FilterError when custom filters are declared on an unsupported route (list)", () => {
      // `list` is no longer expressible in PluginRoutes (closed RouteMethod union);
      // cast through unknown to exercise the runtime backstop plain-JS callers hit.
      const unsupportedRoutes = {
        opportunities: {
          list: {
            filters: {
              agency: { filterType: "stringArray" },
            },
          },
        },
      } as unknown as PluginRoutes;

      expect(() => validateRoutes(unsupportedRoutes)).toThrow(FilterError);
    });

    it("does not throw for valid routes", () => {
      expect(() => validateRoutes(grantsGovRoutes)).not.toThrow();
    });

    it("skips explicitly-undefined resource, method, and filter-spec values (no raw TypeError)", () => {
      // Partial<Record<...>> admits explicit undefined; a conditional-route
      // pattern like `{ opportunities: hasFilters ? {...} : undefined }` must
      // not crash Object.entries.
      expect(() => validateRoutes({ opportunities: undefined })).not.toThrow();
      expect(() => validateRoutes({ opportunities: { search: undefined } })).not.toThrow();
      // Filter-spec values are only undefined for plain-JS callers (the record
      // value type is not Partial), but the backstop must not raw-TypeError.
      expect(() =>
        validateRoutes({
          opportunities: { search: { filters: { agency: undefined } } },
        } as unknown as PluginRoutes)
      ).not.toThrow();
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

    it("returns undefined for an ad-hoc filter with a coherent operator/value pair", () => {
      // Ad-hoc (spec=undefined) — operator pairs with the right value structure
      expect(
        validateFilterCall(undefined, "legacyTag", { operator: "eq", value: "legacy-2024" })
      ).toBeUndefined();
      expect(
        validateFilterCall(undefined, "regions", { operator: "in", value: ["US-CA", "US-NY"] })
      ).toBeUndefined();
      expect(
        validateFilterCall(undefined, "amountRange", {
          operator: "between",
          value: { min: 100, max: 500 },
        })
      ).toBeUndefined();
    });

    it("returns a FilterError for an ad-hoc filter with an invalid shape", () => {
      // Missing `operator` key — no branch of AdHocFilterSchema matches
      const err = validateFilterCall(undefined, "badFilter", { value: "something" });
      expect(err).toBeInstanceOf(FilterError);
    });

    it("returns a FilterError for an ad-hoc filter with an unknown operator", () => {
      // `superCustomOp` is not a known operator — no branch matches
      const err = validateFilterCall(undefined, "badFilter", {
        operator: "superCustomOp",
        value: "x",
      });
      expect(err).toBeInstanceOf(FilterError);
    });

    it("returns a FilterError for an ad-hoc operator/value mismatch", () => {
      // `in` needs an array value
      expect(
        validateFilterCall(undefined, "regions", { operator: "in", value: "US-CA" })
      ).toBeInstanceOf(FilterError);
      // `between` needs a { min, max } object, not a scalar
      expect(
        validateFilterCall(undefined, "amountRange", { operator: "between", value: 500 })
      ).toBeInstanceOf(FilterError);
      // `like` needs a string
      expect(
        validateFilterCall(undefined, "title", { operator: "like", value: 42 })
      ).toBeInstanceOf(FilterError);
      // `eq` needs a scalar, not an array
      expect(
        validateFilterCall(undefined, "code", { operator: "eq", value: ["A", "B"] })
      ).toBeInstanceOf(FilterError);
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

// ############################################################################
// classifyFilters (fail-fast classifier)
// ############################################################################

describe("classifyFilters", () => {
  it("classifies defaults top-level and registered/ad-hoc under customFilters", () => {
    const result = classifyFilters(grantsGovRoutes, "opportunities", "search", {
      status: { operator: "in", value: ["open"] },
      agency: F.in(["NSF"]),
      adHocKey: F.eq("x"),
    });
    expect(result.status).toEqual({ operator: "in", value: ["open"] });
    expect(result.customFilters).toMatchObject({
      agency: { operator: "in", value: ["NSF"] },
      adHocKey: { operator: "eq", value: "x" },
    });
  });

  it("throws FilterError on an invalid standard filter value", () => {
    expect(() =>
      classifyFilters(grantsGovRoutes, "opportunities", "search", {
        status: { operator: "bogus", value: 1 },
      })
    ).toThrow(FilterError);
  });

  it("throws FilterError on a wrong-typed registered filter value", () => {
    expect(() =>
      classifyFilters(grantsGovRoutes, "opportunities", "search", {
        agency: { operator: "eq", value: "NSF" },
      })
    ).toThrow(FilterError);
  });

  it("throws FilterError on a malformed ad-hoc filter value", () => {
    expect(() =>
      classifyFilters(grantsGovRoutes, "opportunities", "search", {
        adHocKey: { notAFilter: true },
      })
    ).toThrow(FilterError);
  });

  it("passes well-formed ad-hoc filters through without throwing", () => {
    const result = classifyFilters(grantsGovRoutes, "opportunities", "search", {
      adHocKey: F.between(1, 10),
    });
    expect(result.customFilters?.adHocKey).toBeDefined();
  });

  it("throws FilterError on an ad-hoc operator/value mismatch", () => {
    expect(() =>
      classifyFilters(grantsGovRoutes, "opportunities", "search", {
        // `in` requires an array value
        adHocKey: { operator: "in", value: "not-an-array" },
      })
    ).toThrow(FilterError);
  });

  it("omits customFilters entirely when only defaults are present", () => {
    const result = classifyFilters(grantsGovRoutes, "opportunities", "search", {
      status: { operator: "in", value: ["open"] },
    });
    expect(result.customFilters).toBeUndefined();
  });

  it("builds the exact ADR-0012 OppFilters request body for mixed default + custom + ad-hoc input", () => {
    const result = classifyFilters(
      grantsGovRoutes,
      "opportunities",
      "search",
      mixedConsumerFilters
    );

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
  });

  it("passes gov.<system>@<filterName> namespaced keys through to customFilters verbatim", () => {
    const result = classifyFilters(grantsGovRoutes, "opportunities", "search", {
      "gov.grants@announcementType": { operator: "eq", value: "NOFO" },
    });

    expect(result.customFilters?.["gov.grants@announcementType"]).toEqual({
      operator: "eq",
      value: "NOFO",
    });
  });

  it("handles an empty filters object gracefully", () => {
    const result = classifyFilters(grantsGovRoutes, "opportunities", "search", {});
    expect(result).toEqual({});
  });
});
