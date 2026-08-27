/**
 * Every fixture record, shaped per version, validated against the generated
 * per-version JSON Schemas. This catches drift in the models' own declared
 * fields; drift in referenced enum models and undeclared properties are not
 * covered (see `./schema-validator.ts`).
 */

import { describe, it, expect } from "vitest";
import {
  APPLICATION_FIXTURES,
  type AppFormResponse,
} from "@/lib/mock/data/applications";
import {
  RESOURCE_MIN_VERSION,
  versionsServing,
  type ResourceName,
} from "@/lib/mock/data/availability";
import { AWARD_FIXTURES } from "@/lib/mock/data/awards";
import { COMPETITION_FIXTURES } from "@/lib/mock/data/competitions";
import {
  CANONICAL_OPPORTUNITY_ID,
  OPPORTUNITY_FIXTURES,
  SUPPORTED_VERSIONS,
  shapeOpportunityForVersion,
  type Version,
} from "@/lib/mock/data/fixtures";
import { FORM_FIXTURES } from "@/lib/mock/data/forms";
import {
  ORGANIZATION_FIXTURES,
  ORG_REVISION_FIXTURES,
  shapeRevision,
} from "@/lib/mock/data/organizations";
import {
  getValidator,
  schemaExistsForVersion,
  schemasAvailable,
} from "./schema-validator";

// Must stay at module scope: `describe.each` calls `getValidator` at
// collection time, before any hook runs. Fail loudly, never skip.
if (!schemasAvailable()) {
  throw new Error(
    "Generated schemas not found. Run `pnpm --filter website run build` " +
      "(or its `typespec` + `generate` steps) before running this suite.",
  );
}

/** One resource's conformance case: which schema, which records, per version. */
interface ResourceCase {
  /** Key into the availability table, for the cross-check below. */
  resource: ResourceName;
  /** Human label used in test names. */
  label: string;
  /** The schema file for a version — a function because of the form rename. */
  schemaFor: (version: Version) => string;
  /** The records to validate, shaped for that version. */
  recordsFor: (version: Version) => unknown[];
}

const RESOURCE_CASES: ResourceCase[] = [
  {
    resource: "awards",
    label: "awards",
    schemaFor: () => "AwardBase.yaml",
    recordsFor: () => [...AWARD_FIXTURES],
  },
  {
    resource: "orgs",
    label: "organizations",
    schemaFor: () => "OrganizationBase.yaml",
    recordsFor: () => [...ORGANIZATION_FIXTURES],
  },
  {
    resource: "applications",
    label: "applications",
    schemaFor: () => "ApplicationBase.yaml",
    recordsFor: () => [...APPLICATION_FIXTURES],
  },
  {
    resource: "forms",
    label: "forms",
    // `Models.Form` at v0.2.0, renamed to `Models.FormBase` from v0.3.0 on.
    schemaFor: (version) =>
      version === "0.2.0" ? "Form.yaml" : "FormBase.yaml",
    recordsFor: () => [...FORM_FIXTURES],
  },
  {
    resource: "competitions",
    label: "competitions",
    schemaFor: () => "CompetitionBase.yaml",
    recordsFor: () => [...COMPETITION_FIXTURES],
  },
];

describe("schema resolution", () => {
  // If the availability table and the generated schemas disagree, the mock is
  // serving a route the version doesn't have or 404-ing one it does.
  it.each(RESOURCE_CASES)(
    "has a $label schema in every version the router serves $label from",
    ({ resource, schemaFor }) => {
      const served = versionsServing(resource);
      expect(served.length).toBeGreaterThan(0);

      for (const version of served) {
        expect(
          schemaExistsForVersion(version, schemaFor(version)),
          `v${version} has no ${schemaFor(version)} but the router serves ${resource} there`,
        ).toBe(true);
      }
    },
  );

  // One-directional on purpose: OrganizationBase.yaml exists in v0.2 schemas
  // though the /orgs routes are v0.4. Model availability is not route
  // availability.
  it("does not require the reverse: a model may exist before its routes do", () => {
    expect(RESOURCE_MIN_VERSION.orgs).toBe("0.4.0");
    expect(schemaExistsForVersion("0.2.0", "OrganizationBase.yaml")).toBe(true);
  });

  it("resolves the form model's rename across versions", () => {
    expect(schemaExistsForVersion("0.2.0", "Form.yaml")).toBe(true);
    expect(schemaExistsForVersion("0.2.0", "FormBase.yaml")).toBe(false);
    expect(schemaExistsForVersion("0.3.0", "FormBase.yaml")).toBe(true);
    expect(schemaExistsForVersion("0.4.0", "FormBase.yaml")).toBe(true);
  });

  it("throws rather than downgrading when a model is missing for a version", () => {
    // Without `requireVersioned`, the fallback resolves AwardBase.yaml at
    // v0.2.0 to today's shape — this proves the guard does something.
    expect(schemaExistsForVersion("0.2.0", "AwardBase.yaml")).toBe(false);
    expect(() => getValidator("0.2.0", "AwardBase.yaml")).not.toThrow();
    expect(() =>
      getValidator("0.2.0", "AwardBase.yaml", { requireVersioned: true }),
    ).toThrow(/not registered for v0.2.0/);
  });
});

describe("new resources conform to their generated schemas", () => {
  for (const testCase of RESOURCE_CASES) {
    describe(testCase.label, () => {
      for (const version of versionsServing(testCase.resource)) {
        const schemaName = testCase.schemaFor(version);
        const { validate, errorText } = getValidator(version, schemaName, {
          requireVersioned: true,
        });

        it(`validates every record against v${version}'s ${schemaName}`, () => {
          const records = testCase.recordsFor(version);
          expect(records.length).toBeGreaterThan(0);

          for (const record of records) {
            const id = (record as { id: string }).id;
            expect(
              validate(record),
              `${schemaName} (v${version}) rejected ${id}: ${errorText()}`,
            ).toBe(true);
          }
        });
      }
    });
  }
});

describe("sub-resources conform to their generated schemas", () => {
  // `shapeRevision` strips the fixture-only `orgId` bookkeeping field.
  it("validates every organization revision against v0.4.0's OrgRevision", () => {
    const { validate, errorText } = getValidator("0.4.0", "OrgRevision.yaml", {
      requireVersioned: true,
    });

    for (const revision of ORG_REVISION_FIXTURES) {
      const wire = shapeRevision(revision);
      expect(
        validate(wire),
        `OrgRevision.yaml rejected ${revision.id}: ${errorText()}`,
      ).toBe(true);
    }
  });

  it.each(versionsServing("applications"))(
    "validates every nested form response against v%s's AppFormResponse",
    (version) => {
      const { validate, errorText } = getValidator(
        version,
        "AppFormResponse.yaml",
        { requireVersioned: true },
      );

      const responses: AppFormResponse[] = APPLICATION_FIXTURES.flatMap(
        (application) => Object.values(application.formResponses),
      );
      expect(responses.length).toBeGreaterThan(0);

      for (const response of responses) {
        expect(
          validate(response),
          `AppFormResponse.yaml (v${version}) rejected ${response.id}: ${errorText()}`,
        ).toBe(true);
      }
    },
  );
});

describe("opportunities conform to their generated schemas (#1077, restored)", () => {
  // v0.1 predates `OpportunityDetails`; the mock serves `OpportunityBase` for
  // a v0.1 detail read.
  const detailSchemaFor = (version: Version): string =>
    version === "0.1.0" ? "OpportunityBase.yaml" : "OpportunityDetails.yaml";

  describe.each(SUPPORTED_VERSIONS)("version %s", (version: Version) => {
    it("shapes every record into a valid list record", () => {
      const { validate, errorText } = getValidator(
        version,
        "OpportunityBase.yaml",
        { requireVersioned: true },
      );

      for (const opp of OPPORTUNITY_FIXTURES) {
        const shaped = shapeOpportunityForVersion(opp, version, "list");
        expect(
          validate(shaped),
          `OpportunityBase.yaml (list, v${version}) rejected ${opp.id}: ${errorText()}`,
        ).toBe(true);
      }
    });

    it("shapes every record into a valid detail record, competitions omitted", () => {
      const schemaName = detailSchemaFor(version);
      // Not `requireVersioned`: the v0.1 fallback here is deliberate.
      const { validate, errorText } = getValidator(version, schemaName);

      for (const opp of OPPORTUNITY_FIXTURES) {
        const shaped = shapeOpportunityForVersion(opp, version, "detail");

        // The nested `Competition` preview omits the required `forms` object,
        // so `competitions` is dropped here; the deviation is pinned below.
        const withoutCompetitions = { ...shaped };
        delete withoutCompetitions.competitions;

        expect(
          validate(withoutCompetitions),
          `${schemaName} (detail, v${version}) rejected ${opp.id}: ${errorText()}`,
        ).toBe(true);
      }
    });
  });

  describe("the nested-competitions deviation (pinned, not fixed)", () => {
    const withCompetitions = OPPORTUNITY_FIXTURES.filter(
      (opp) => opp.competitions !== undefined,
    );

    it("still applies to some records", () => {
      expect(withCompetitions.length).toBeGreaterThan(0);
    });

    // If these start failing, the nested `Competition` type gained `forms` —
    // DELETE this block and fold `competitions` back into the detail test
    // above, rather than patching these assertions.
    it.each(SUPPORTED_VERSIONS.filter((v) => v !== "0.1.0"))(
      "fails OpportunityDetails validation for v%s when competitions are left in",
      (version) => {
        const { validate, errorText } = getValidator(
          version,
          "OpportunityDetails.yaml",
        );

        for (const record of withCompetitions) {
          const shaped = shapeOpportunityForVersion(record, version, "detail");

          expect(validate(shaped), `${record.id} unexpectedly validated`).toBe(
            false,
          );
          expect(errorText()).toContain("forms");
        }
      },
    );
  });
});

describe("drifted records (negative path)", () => {
  // A validator that silently accepted everything would leave every test
  // above green while checking nothing.
  it("rejects an award whose status is a bare string", () => {
    const award = { ...AWARD_FIXTURES[0], status: "awarded" };
    const { validate, errorText } = getValidator("0.4.0", "AwardBase.yaml");

    expect(validate(award)).toBe(false);
    expect(errorText()).toContain("status");
  });

  it("rejects an organization missing its required name", () => {
    const withoutName: Record<string, unknown> = {
      ...ORGANIZATION_FIXTURES[0],
    };
    delete withoutName.name;
    const { validate, errorText } = getValidator(
      "0.4.0",
      "OrganizationBase.yaml",
    );

    expect(validate(withoutName)).toBe(false);
    expect(errorText()).toContain("name");
  });

  it("rejects an application whose id is not a uuid", () => {
    const application = { ...APPLICATION_FIXTURES[0], id: "not-a-uuid" };
    const { validate, errorText } = getValidator(
      "0.4.0",
      "ApplicationBase.yaml",
    );

    expect(validate(application)).toBe(false);
    expect(errorText()).toContain("format");
  });

  it("rejects a competition with an out-of-enum applicant type", () => {
    const competition = {
      ...COMPETITION_FIXTURES[0],
      acceptedApplicantTypes: [{ value: "local_government" }],
    };
    const { validate, errorText } = getValidator(
      "0.4.0",
      "CompetitionBase.yaml",
    );

    expect(validate(competition)).toBe(false);
    expect(errorText()).toContain("allowed values");
  });

  it("rejects an opportunity whose status is a bare string", () => {
    const canonical = OPPORTUNITY_FIXTURES.find(
      (opp) => opp.id === CANONICAL_OPPORTUNITY_ID,
    )!;
    const shaped = shapeOpportunityForVersion(canonical, "0.3.0", "list");
    const drifted = { ...shaped, status: "open" };
    const { validate, errorText } = getValidator(
      "0.3.0",
      "OpportunityBase.yaml",
    );

    expect(validate(drifted)).toBe(false);
    expect(errorText()).toContain("status");
  });
});
