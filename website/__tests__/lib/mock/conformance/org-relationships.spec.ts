/**
 * Pins the ADR 0030 organization-relationships slice of #1256: the v0.5.0
 * schemas gain `dbaNames` and `relationships` on `OrganizationBase` and
 * `OrgPatchData`, plus the `OrgRelationships` and `OrgParents` models, while
 * v0.4.0 and earlier are left unchanged. `OrgRef` itself does not change; the
 * writable target reference lives only inside the patch schema.
 */

import { describe, it, expect } from "vitest";
import type { Version } from "@/lib/mock/data/fixtures";
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
  properties?: Record<string, unknown>;
  required?: string[];
}

function modelSchema(
  version: Version,
  schemaName: string,
): ModelSchema | undefined {
  return loadRawSchema(version, schemaName) as ModelSchema | undefined;
}

const ADDED = ["dbaNames", "relationships"];

describe("organization relationships at v0.5.0 (ADR 0030)", () => {
  it("adds optional dbaNames and relationships to OrganizationBase and OrgPatchData", () => {
    for (const schemaName of ["OrganizationBase.yaml", "OrgPatchData.yaml"]) {
      const schema = modelSchema("0.5.0", schemaName);
      expect(schema, `v0.5.0/${schemaName} does not exist`).toBeDefined();
      for (const field of ADDED) {
        expect(
          schema?.properties?.[field],
          `v0.5.0/${schemaName} lacks ${field}`,
        ).toBeDefined();
        expect(schema?.required ?? []).not.toContain(field);
      }
    }
  });

  it("publishes the relationship models only from v0.5.0", () => {
    for (const schemaName of ["OrgRelationships.yaml", "OrgParents.yaml"]) {
      expect(
        modelSchema("0.5.0", schemaName),
        `v0.5.0/${schemaName} does not exist`,
      ).toBeDefined();
      expect(
        modelSchema("0.4.0", schemaName),
        `v0.4.0/${schemaName} unexpectedly exists`,
      ).toBeUndefined();
    }
  });

  it.each(["0.2.0", "0.3.0", "0.4.0"] as const)(
    "leaves OrganizationBase and OrgPatchData unchanged at v%s",
    (version) => {
      for (const schemaName of ["OrganizationBase.yaml", "OrgPatchData.yaml"]) {
        const schema = modelSchema(version, schemaName);
        if (schema === undefined) continue; // OrgPatchData starts at v0.4.0
        for (const field of ADDED) {
          expect(
            schema.properties?.[field],
            `v${version}/${schemaName} unexpectedly gained ${field}`,
          ).toBeUndefined();
        }
      }
    },
  );

  it("does not change the read OrgRef between v0.4.0 and v0.5.0", () => {
    expect(modelSchema("0.5.0", "OrgRef.yaml")).toEqual(
      modelSchema("0.4.0", "OrgRef.yaml"),
    );
  });
});
