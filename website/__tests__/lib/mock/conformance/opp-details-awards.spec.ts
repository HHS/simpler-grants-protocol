/**
 * Pins ticket #1221-T1: the v0.5.0 JSON Schema for `OpportunityDetails` gains
 * an optional `awards` property, an array of `AwdRef`. `OpportunityDetails`
 * declares `awards` as its own property, the same way it already declares
 * `competitions`, so `OpportunityBase` must not carry it (unlike `identifiers`,
 * which flows through `OppRef` into `OpportunityBase`). v0.2.0, v0.3.0, and
 * v0.4.0 are left unchanged.
 */

import { describe, it, expect } from "vitest";
import { loadRawSchema, schemasAvailable } from "./schema-validator";

// Matches the sibling conformance suites: the versioned schemas are gitignored
// build output, so their absence is a setup error to report, never a skip.
if (!schemasAvailable()) {
  throw new Error(
    "Generated schemas not found. Run `pnpm --filter website run build` " +
      "(or its `typespec` + `generate` steps) before running this suite.",
  );
}

/** The parts of a generated model schema this spec asserts on. */
interface ModelSchema {
  properties?: Record<
    string,
    { $ref?: string; type?: string; items?: { $ref?: string } }
  >;
  required?: string[];
  allOf?: { $ref?: string }[];
}

/** Narrows the loader's untyped document to the shape asserted here. */
function modelSchema(
  version: "0.2.0" | "0.3.0" | "0.4.0" | "0.5.0",
  schemaName: string,
): ModelSchema | undefined {
  return loadRawSchema(version, schemaName) as ModelSchema | undefined;
}

describe("OpportunityDetails gains awards at v0.5.0 (#1221-T1)", () => {
  it("adds an optional AwdRef array to OpportunityDetails at v0.5.0, leaving OpportunityBase and earlier versions untouched", () => {
    const oppDetailsV5 = modelSchema("0.5.0", "OpportunityDetails.yaml");
    expect(
      oppDetailsV5,
      "v0.5.0/OpportunityDetails.yaml does not exist",
    ).toBeDefined();
    expect(oppDetailsV5?.properties?.awards?.type).toBe("array");
    expect(oppDetailsV5?.properties?.awards?.items?.$ref).toBe("AwdRef.yaml");
    // `OpportunityDetails` declares only optional properties of its own, so
    // the emitter omits `required` entirely; an absent list still proves
    // `awards` is optional.
    expect(oppDetailsV5?.required ?? []).not.toContain("awards");

    // Every absence check below asserts the schema loaded first. `loadRawSchema`
    // returns `undefined` for a missing file, which would also satisfy the
    // `toBeUndefined()` on the property, so deleting a schema would otherwise
    // leave this suite green.
    const oppBaseV5 = modelSchema("0.5.0", "OpportunityBase.yaml");
    expect(
      oppBaseV5,
      "v0.5.0/OpportunityBase.yaml does not exist",
    ).toBeDefined();
    expect(
      oppBaseV5?.properties?.awards,
      "OpportunityBase.yaml (v0.5.0) unexpectedly carries awards",
    ).toBeUndefined();

    for (const version of ["0.2.0", "0.3.0", "0.4.0"] as const) {
      const oppDetails = modelSchema(version, "OpportunityDetails.yaml");
      expect(
        oppDetails,
        `OpportunityDetails.yaml (v${version}) does not exist`,
      ).toBeDefined();
      expect(
        oppDetails?.properties?.awards,
        `OpportunityDetails.yaml (v${version}) unexpectedly gained awards`,
      ).toBeUndefined();
    }
  });
});
