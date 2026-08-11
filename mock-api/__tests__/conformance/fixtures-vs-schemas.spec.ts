import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import {
  OPPORTUNITY_FIXTURES,
  SUPPORTED_VERSIONS,
  CANONICAL_OPPORTUNITY_ID,
  shapeOpportunityForVersion,
  type Version,
} from "../../src/data/fixtures";
import { getOpportunityValidator, schemasAvailable } from "../utils/schema-validator";

// Resolved relative to this file rather than `process.cwd()`, so it holds
// regardless of whether vitest is invoked from the package or the repo root.
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_VERSIONS_DIR = path.resolve(TEST_DIR, "../../../website/public/schemas/yaml/versions");

function loadYamlSchema(
  version: string,
  schemaFile: string
): { properties?: Record<string, unknown> } {
  const filePath = path.join(SCHEMA_VERSIONS_DIR, `v${version}`, schemaFile);
  return yaml.load(readFileSync(filePath, "utf-8")) as { properties?: Record<string, unknown> };
}

// (A) Guard: fail loudly (never silently skip) if the generated schemas aren't on
// disk, so a missing build step can't make CI falsely green. Deliberately at module
// scope rather than in `beforeAll`: the `describe.each` blocks below call
// `getOpportunityValidator` during vitest's collection phase, which runs before any
// hook fires, so a `beforeAll` version of this check would be dead code that only
// looked load-bearing.
if (!schemasAvailable()) {
  throw new Error(
    "Generated schemas not found. Run `pnpm --filter @common-grants/mock-api run schemas` " +
      "to generate them before running this suite."
  );
}

describe("fixtures vs. generated schemas (#1077-T4)", () => {
  // Schema resolution itself is asserted, not assumed. `getOpportunityValidator`
  // falls back to OpportunityBase when a version has no OpportunityDetails, which
  // is correct only for v0.1.0 (the model was added in v0.2). Without this, a
  // version whose OpportunityDetails went missing from the generated output would
  // silently downgrade to OpportunityBase and every detail test below would still
  // pass — validating a weaker schema while reporting green.
  describe("schema resolution", () => {
    it.each(SUPPORTED_VERSIONS)("uses the real OpportunityBase for %s list", version => {
      const { schemaName, isFallback } = getOpportunityValidator(version, "list");

      expect(schemaName).toBe("OpportunityBase.yaml");
      expect(isFallback).toBe(false);
    });

    it.each(SUPPORTED_VERSIONS)("resolves the expected detail schema for %s", version => {
      const { schemaName, isFallback } = getOpportunityValidator(version, "detail");

      // v0.1 predates OpportunityDetails, so there the fallback IS the real answer.
      const expectFallback = version === "0.1.0";

      expect(isFallback).toBe(expectFallback);
      expect(schemaName).toBe(expectFallback ? "OpportunityBase.yaml" : "OpportunityDetails.yaml");
    });
  });

  // (B) List variant: every record, every version, projects to a valid
  // OpportunityBase. This variant carries no known deviation — all green.
  describe("list variant conformance", () => {
    describe.each(SUPPORTED_VERSIONS)("version %s", (version: Version) => {
      const { validate, errorText, schemaName } = getOpportunityValidator(version, "list");

      it.each(OPPORTUNITY_FIXTURES)("shapes $id into a valid list record", opp => {
        const shaped = shapeOpportunityForVersion(opp, version, "list");
        const ok = validate(shaped);

        expect(ok, `${schemaName} (list, ${version}) rejected ${opp.id}: ${errorText()}`).toBe(
          true
        );
      });
    });
  });

  // (C) Detail variant: every record, every version, projects to a valid
  // OpportunityDetails (or, for v0.1.0, the OpportunityBase fallback) —
  // *after* dropping `competitions`. That omission is the known, deliberate
  // deviation pinned separately in the "competitions deviation" suite below;
  // it is spelled out here rather than folded into a helper so it stays
  // visible at the call site.
  describe("detail variant conformance (competitions omitted, see deviation suite below)", () => {
    describe.each(SUPPORTED_VERSIONS)("version %s", (version: Version) => {
      const { validate, errorText, schemaName } = getOpportunityValidator(version, "detail");

      it.each(OPPORTUNITY_FIXTURES)("shapes $id into a valid detail record", opp => {
        const shaped = shapeOpportunityForVersion(opp, version, "detail");

        // The fixture's `Competition` shape deliberately omits the full
        // model's required `forms` field (see the `Competition` interface
        // docstring in src/data/fixtures.ts), so any record still carrying
        // `competitions` fails OpportunityDetails validation. Drop it here so
        // this suite pins the rest of the shape; the deviation itself is
        // asserted explicitly below.
        const withoutCompetitions = { ...shaped };
        delete withoutCompetitions.competitions;

        const ok = validate(withoutCompetitions);

        expect(ok, `${schemaName} (detail, ${version}) rejected ${opp.id}: ${errorText()}`).toBe(
          true
        );
      });
    });
  });

  // (D) Pin the deviation: assert it still exists exactly as measured, so a
  // silent fix (or regression) is caught either way.
  describe("competitions deviation (pinned, not fixed)", () => {
    const recordsWithCompetitions = OPPORTUNITY_FIXTURES.filter(
      opp => opp.competitions !== undefined
    );

    it("carries competitions on exactly 3 of the 11 fixture records", () => {
      expect(OPPORTUNITY_FIXTURES.length).toBe(11);
      expect(recordsWithCompetitions.length).toBe(3);
    });

    // Every version that has a real OpportunityDetails, not just v0.3.0 — so the
    // same regression appearing on v0.2.0 or v0.4.0 is caught too.
    const DETAIL_VERSIONS = SUPPORTED_VERSIONS.filter(v => v !== "0.1.0");

    // If these start failing, it means the fixture's `Competition` type grew a
    // `forms` object and now matches the full model — DELETE this block and fold
    // `competitions` back into "detail variant conformance" above (drop the
    // omission there) instead of patching these assertions.
    it.each(DETAIL_VERSIONS)(
      "fails OpportunityDetails validation for %s when competitions are left in",
      version => {
        const { validate, errorText } = getOpportunityValidator(version, "detail");

        for (const record of recordsWithCompetitions) {
          const shaped = shapeOpportunityForVersion(record, version, "detail");

          expect(validate(shaped), `${record.id} unexpectedly validated`).toBe(false);
          expect(errorText()).toContain("forms");
        }
      }
    );
  });

  // (E) v0.1 stripping proof (edge case). The schema-level fact holds: v0.1's
  // OpportunityBase predates `acceptedApplicantTypes` and v0.2's has it.
  describe("v0.1 stripping proof", () => {
    it("lacks acceptedApplicantTypes on v0.1.0's OpportunityBase, unlike v0.2.0's", () => {
      const v01 = loadYamlSchema("0.1.0", "OpportunityBase.yaml");
      const v02 = loadYamlSchema("0.2.0", "OpportunityBase.yaml");

      expect(v01.properties).not.toHaveProperty("acceptedApplicantTypes");
      expect(v02.properties).toHaveProperty("acceptedApplicantTypes");
    });

    // Empirically checked (see PR description / probe): the generated v0.1.0
    // OpportunityBase schema does NOT set `additionalProperties: false`, so it
    // is "unsealed" — a record that still carries `acceptedApplicantTypes`
    // after v0.1 shaping validates successfully anyway. Schema validation
    // alone can't catch a failure to strip that field; the
    // `shapeOpportunityForVersion` unit tests in
    // __tests__/data/fixtures.spec.ts are what actually pin the stripping
    // behavior. This test just records why a schema-validation assertion
    // here would be a false negative.
    it("does not reject a v0.1.0 record with acceptedApplicantTypes added back (the schema is unsealed)", () => {
      const canonical = OPPORTUNITY_FIXTURES.find(opp => opp.id === CANONICAL_OPPORTUNITY_ID)!;
      const shaped = shapeOpportunityForVersion(canonical, "0.1.0", "list");
      const withFieldAddedBack = {
        ...shaped,
        acceptedApplicantTypes: canonical.acceptedApplicantTypes,
      };

      const { validate } = getOpportunityValidator("0.1.0", "list");

      expect(validate(withFieldAddedBack)).toBe(true);
    });
  });

  // (F) Negative path: a deliberately drifted record fails, with a readable,
  // non-empty error naming the offending field.
  describe("drifted record (negative path)", () => {
    it("fails validation with a readable error naming the offending field", () => {
      const canonical = OPPORTUNITY_FIXTURES.find(opp => opp.id === CANONICAL_OPPORTUNITY_ID)!;
      const shaped = shapeOpportunityForVersion(canonical, "0.3.0", "list");

      // Deliberately drift the record: `status` must be an OppStatus object;
      // no version of the schema accepts a bare string here.
      const drifted = { ...shaped, status: "open" };

      const { validate, errorText } = getOpportunityValidator("0.3.0", "list");
      const ok = validate(drifted);

      expect(ok).toBe(false);
      const message = errorText();
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain("status");
    });
  });
});
