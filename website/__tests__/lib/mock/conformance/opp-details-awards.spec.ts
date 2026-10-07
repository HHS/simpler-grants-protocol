/**
 * Pins ticket #1221-T1: at v0.5.0 `OpportunityDetails` gains an optional
 * `awards` property, an array of `AwdRef`, in both generated Core artifacts:
 * the versioned JSON Schema and the per-version OpenAPI document.
 * `OpportunityDetails` declares `awards` as its own property, the same way it
 * already declares `competitions`, so `OpportunityBase` must not carry it
 * (unlike `identifiers`, which flows through `OppRef` into `OpportunityBase`).
 * v0.2.0, v0.3.0, and v0.4.0 are left unchanged.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import { loadRawSchema, schemasAvailable } from "./schema-validator";

// Matches the sibling conformance suites: the versioned schemas are gitignored
// build output, so their absence is a setup error to report, never a skip.
if (!schemasAvailable()) {
  throw new Error(
    "Generated schemas not found. Run `pnpm --filter website run build` " +
      "(or its `typespec` + `generate` steps) before running this suite.",
  );
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_DIR = path.resolve(HERE, "../../../../public/openapi");

/**
 * `OpportunityDetails` is `@added(v0_2)`, so v0.1.0 has nothing to assert on:
 * neither artifact declares the model there, and a missing model would read
 * the same as a missing property. The absence checks start at v0.2.0.
 */
type DetailsVersion = "0.2.0" | "0.3.0" | "0.4.0" | "0.5.0";

/** The parts of a generated model schema this spec asserts on. */
interface ModelSchema {
  properties?: Record<
    string,
    { $ref?: string; type?: string; items?: { $ref?: string } }
  >;
  required?: string[];
}

/** Narrows the loader's untyped document to the shape asserted here. */
function modelSchema(
  version: DetailsVersion,
  schemaName: string,
): ModelSchema | undefined {
  return loadRawSchema(version, schemaName) as ModelSchema | undefined;
}

/** Reads `CommonGrants.Models.<modelName>` out of a version's OpenAPI document. */
function openApiModelSchema(
  version: DetailsVersion,
  modelName: string,
): ModelSchema | undefined {
  const file = path.join(OPENAPI_DIR, `openapi.${version}.yaml`);
  const document = yaml.load(readFileSync(file, "utf-8")) as {
    components?: { schemas?: Record<string, ModelSchema | undefined> };
  };
  return document.components?.schemas?.[`CommonGrants.Models.${modelName}`];
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

  it("declares the same optional AwdRef array in the v0.5.0 OpenAPI document, and in no earlier one", () => {
    const oppDetailsV5 = openApiModelSchema("0.5.0", "OpportunityDetails");
    expect(
      oppDetailsV5,
      "openapi.0.5.0.yaml declares no CommonGrants.Models.OpportunityDetails",
    ).toBeDefined();
    expect(oppDetailsV5?.properties?.awards?.type).toBe("array");
    expect(oppDetailsV5?.properties?.awards?.items?.$ref).toBe(
      "#/components/schemas/CommonGrants.Models.AwdRef",
    );
    expect(oppDetailsV5?.required ?? []).not.toContain("awards");

    // As above: a renamed or dropped component would also make the property
    // read as absent, so assert the component loaded before asserting on it.
    for (const version of ["0.2.0", "0.3.0", "0.4.0"] as const) {
      const oppDetails = openApiModelSchema(version, "OpportunityDetails");
      expect(
        oppDetails,
        `openapi.${version}.yaml declares no CommonGrants.Models.OpportunityDetails`,
      ).toBeDefined();
      expect(
        oppDetails?.properties?.awards,
        `openapi.${version}.yaml unexpectedly gives OpportunityDetails awards`,
      ).toBeUndefined();
    }
  });
});
