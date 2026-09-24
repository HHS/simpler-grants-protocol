/**
 * Pins ticket #1219-T1: the v0.5.0 JSON Schema for `OppRef` gains an
 * optional `identifiers` property referencing `OppIds`. `OpportunityBase`
 * carries it as its own property (via the `...OppRef` spread, the same way
 * `id` and `title` already are) and `OpportunityDetails` inherits it through
 * `allOf` (via `extends`). Neither redeclares it. v0.4.0 and earlier are left
 * unchanged.
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
  properties?: Record<string, { $ref?: string }>;
  required?: string[];
  allOf?: { $ref?: string }[];
}

/** Narrows the loader's untyped document to the shape asserted here. */
function modelSchema(
  version: "0.4.0" | "0.5.0",
  schemaName: string,
): ModelSchema | undefined {
  return loadRawSchema(version, schemaName) as ModelSchema | undefined;
}

describe("OppRef gains identifiers at v0.5.0 (#1219-T1)", () => {
  it("refs OppIds from OppRef/OpportunityBase/OpportunityDetails at v0.5.0, optionally, while v0.4.0 stays untouched", () => {
    const oppRefV5 = modelSchema("0.5.0", "OppRef.yaml");
    expect(oppRefV5, "v0.5.0/OppRef.yaml does not exist").toBeDefined();
    expect(oppRefV5?.properties?.identifiers?.$ref).toBe("OppIds.yaml");
    expect(oppRefV5?.required).not.toContain("identifiers");

    const oppBaseV5 = modelSchema("0.5.0", "OpportunityBase.yaml");
    expect(
      oppBaseV5?.properties?.identifiers?.$ref,
      "OpportunityBase.yaml (v0.5.0) does not carry identifiers from OppRef",
    ).toBe("OppIds.yaml");

    // `OpportunityDetails` uses TypeSpec `extends`, which the emitter renders
    // as `allOf` rather than copying properties in: it inherits `identifiers`
    // through `OpportunityBase` and must not redeclare it.
    const oppDetailsV5 = modelSchema("0.5.0", "OpportunityDetails.yaml");
    expect(
      oppDetailsV5?.allOf?.map((entry) => entry.$ref),
      "OpportunityDetails.yaml (v0.5.0) no longer composes OpportunityBase",
    ).toContain("OpportunityBase.yaml");
    expect(
      oppDetailsV5?.properties?.identifiers,
      "OpportunityDetails.yaml (v0.5.0) redeclares identifiers instead of inheriting it",
    ).toBeUndefined();

    const oppRefV4 = modelSchema("0.4.0", "OppRef.yaml");
    expect(
      oppRefV4?.properties?.identifiers,
      "v0.4.0/OppRef.yaml unexpectedly gained identifiers",
    ).toBeUndefined();
  });
});
