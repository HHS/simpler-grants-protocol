import { describe, it, expect } from "vitest";
import { mergeExtensions } from "@/extensions";
import type { SchemaExtensions } from "@/extensions";

describe("mergeExtensions", () => {
  // ##########################################################################
  // Base cases
  // ##########################################################################
  describe("base cases", () => {
    it("returns an empty object for an empty array", () => {
      const result = mergeExtensions([]);
      expect(result).toEqual({});
    });

    it("returns the same reference for a single source", () => {
      const source: SchemaExtensions = {
        Opportunity: { legacyId: { fieldType: "string" } },
      };
      const result = mergeExtensions([source]);
      expect(result).toBe(source);
    });
  });

  // ##########################################################################
  // Non-overlapping merges
  // ##########################################################################

  describe("non-overlapping merges", () => {
    it("merges disjoint fields on the same model", () => {
      const a: SchemaExtensions = {
        Opportunity: { legacyId: { fieldType: "string" } },
      };
      const b: SchemaExtensions = {
        Opportunity: { category: { fieldType: "string" } },
      };

      const result = mergeExtensions([a, b]);
      expect(result).toEqual({
        Opportunity: {
          legacyId: { fieldType: "string" },
          category: { fieldType: "string" },
        },
      });
    });

    it("merges sources that extend different models (no overlap)", () => {
      // TODO: Expand this test to include other schemas when they are supported
      const a: SchemaExtensions = {
        Opportunity: { legacyId: { fieldType: "string" } },
      };
      const b: SchemaExtensions = {};

      const result = mergeExtensions([a, b]);
      expect(result).toEqual({
        Opportunity: { legacyId: { fieldType: "string" } },
      });
    });
  });

  // ##########################################################################
  // Conflict handling
  // ##########################################################################

  describe("conflict handling", () => {
    // Default behavior
    it('throws on duplicate field names with default onConflict ("error")', () => {
      const a: SchemaExtensions = {
        Opportunity: { legacyId: { fieldType: "string" } },
      };
      const b: SchemaExtensions = {
        Opportunity: { legacyId: { fieldType: "number" } },
      };

      expect(() => mergeExtensions([a, b])).toThrowError(
        'mergeExtensions: duplicate field "legacyId" on model "Opportunity"'
      );
    });

    // Explicit error behavior
    it('throws on duplicate field names with explicit onConflict: "error"', () => {
      const a: SchemaExtensions = {
        Opportunity: { legacyId: { fieldType: "string" } },
      };
      const b: SchemaExtensions = {
        Opportunity: { legacyId: { fieldType: "number" } },
      };

      expect(() => mergeExtensions([a, b], { onConflict: "error" })).toThrowError(
        'mergeExtensions: duplicate field "legacyId" on model "Opportunity"'
      );
    });

    // Last wins behavior
    it('keeps the last definition with onConflict: "lastWins"', () => {
      const a: SchemaExtensions = {
        Opportunity: {
          legacyId: { fieldType: "string", description: "first" },
        },
      };
      const b: SchemaExtensions = {
        Opportunity: {
          legacyId: { fieldType: "number", description: "second" },
        },
      };

      const result = mergeExtensions([a, b], { onConflict: "lastWins" });
      expect(result).toEqual({
        Opportunity: {
          legacyId: { fieldType: "number", description: "second" },
        },
      });
    });

    // First wins behavior
    it('keeps the first definition with onConflict: "firstWins"', () => {
      const a: SchemaExtensions = {
        Opportunity: {
          legacyId: { fieldType: "string", description: "first" },
        },
      };
      const b: SchemaExtensions = {
        Opportunity: {
          legacyId: { fieldType: "number", description: "second" },
        },
      };

      const result = mergeExtensions([a, b], { onConflict: "firstWins" });
      expect(result).toEqual({
        Opportunity: {
          legacyId: { fieldType: "string", description: "first" },
        },
      });
    });
  });

  // ##########################################################################
  // Three+ sources
  // ##########################################################################

  describe("three+ sources", () => {
    it("merges three or more sources correctly", () => {
      const a: SchemaExtensions = {
        Opportunity: { legacyId: { fieldType: "string" } },
      };
      const b: SchemaExtensions = {
        Opportunity: { category: { fieldType: "string" } },
      };
      const c: SchemaExtensions = {
        Opportunity: { priority: { fieldType: "integer" } },
      };

      const result = mergeExtensions([a, b, c]);
      expect(result).toEqual({
        Opportunity: {
          legacyId: { fieldType: "string" },
          category: { fieldType: "string" },
          priority: { fieldType: "integer" },
        },
      });
    });

    it("applies lastWins across three sources with overlapping fields", () => {
      const a: SchemaExtensions = {
        Opportunity: { tag: { fieldType: "string", description: "v1" } },
      };
      const b: SchemaExtensions = {
        Opportunity: { tag: { fieldType: "string", description: "v2" } },
      };
      const c: SchemaExtensions = {
        Opportunity: { tag: { fieldType: "string", description: "v3" } },
      };

      const result = mergeExtensions([a, b, c], { onConflict: "lastWins" });
      expect(result).toEqual({
        Opportunity: {
          tag: { fieldType: "string", description: "v3" },
        },
      });
    });
  });
});
