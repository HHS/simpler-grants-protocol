/**
 * Every fixture record, shaped per version, validated against the generated
 * per-version JSON Schemas (#334, extending #1077's pattern).
 *
 * #1077 built this for opportunities on the 3A Worker; #1078's port to this
 * site left it behind. This restores it and generalizes it to all six resources,
 * because hand-written fixtures across six resources are exactly the situation
 * where a schema check earns its keep — and it earned it immediately: it caught
 * two competition fixtures using `local_government` and `nonprofit_with_501c3`,
 * neither of which is in `ApplicantTypeOptions` (the enum spells the second
 * `non_profit_with_501c3`, while its sibling is `nonprofit_without_501c3`).
 *
 * **What this catches, and what it does not.** It catches drift in the resource
 * models' own declared fields — a renamed property, a wrong type, a missing
 * required field, an out-of-enum value, a malformed uuid or timestamp. It does
 * NOT catch: (1) drift in the enum/status models the resources reference, because
 * of the version-generator overlay limitation documented in
 * `./schema-validator.ts`; (2) properties a model does not declare, because
 * `unevaluatedProperties` is stripped for ajv's sake (also documented there); and
 * (3) semantic freshness — a coherent record describing a grant that closed in
 * 2019 conforms perfectly. Schema conformance is not the same as a good fixture.
 *
 * **Version resolution is asserted, not assumed.** Two facts make that
 * necessary. The form model is emitted as `Form.yaml` at v0.2.0 and
 * `FormBase.yaml` from v0.3.0 on — a rename the resolution below has to follow,
 * or a version would silently validate against no schema at all. And
 * `getValidator` throws rather than falling back when a model is missing for a
 * version, so a generated output that lost a schema fails loudly instead of
 * quietly validating against a weaker one. That failure mode — green CI over a
 * downgraded schema — is what #1077 flagged as the thing most worth guarding.
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

// Guard: fail loudly (never silently skip) if the generated schemas aren't on
// disk, so a missing build step can't make CI falsely green. Deliberately at
// module scope rather than in `beforeAll`: the `describe.each` blocks below call
// `getValidator` during vitest's collection phase, which runs before any hook
// fires, so a `beforeAll` version of this check would be dead code that only
// looked load-bearing.
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
  /**
   * The schema file for a version. A function rather than a constant because the
   * form model was renamed between versions.
   */
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
  // The availability table drives the router's version gating, so if it and the
  // generated schema set disagree, one of them is wrong and the mock is either
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

  // Deliberately one-directional. The reverse ("no schema ⇒ not served") does
  // NOT hold, and asserting it would fail: `OrganizationBase.yaml` is emitted
  // into v0.2.0 and v0.3.0 even though the `/orgs` *routes* are
  // `@added(Versions.v0_4)`, because the model predates the routes — other
  // models reference it. Model availability and route availability are different
  // facts, and `data/availability.ts` is about routes.
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
    // Awards do not exist before v0.4. The overlay's fallback layer holds the
    // *current* schema set, so without a guard `AwardBase.yaml` resolves at
    // v0.2.0 anyway — to today's shape — and every award assertion would pass
    // while validating against the wrong version. `requireVersioned` is that
    // guard, and this is the test that proves it is doing something: the same
    // call without it does NOT throw.
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
        // `requireVersioned`: this version is supposed to have its own copy of
        // the model, so a fallback here would mean validating v0.2 data against
        // v0.4 shapes. See `GetValidatorOptions`.
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
  // Organization revisions are served by the four `/changes` routes, so they are
  // a response shape in their own right — and `shapeRevision` is the only thing
  // standing between the fixture's bookkeeping `orgId` field and the wire.
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

  // `AppFormResponse` is what `GET|PUT /applications/{appId}/forms/{formId}`
  // returns, and it is nested inside every application, so it is validated
  // twice over — once here on its own, and once as part of `ApplicationBase`.
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
  // Carried over from the 3A suite. `getValidator` throws where the 3A helper
  // fell back to `OpportunityBase`, so the v0.1 case names that schema outright
  // rather than relying on a fallback — v0.1 predates `OpportunityDetails`, and
  // `OpportunityBase` is what the mock actually serves for a v0.1 detail read.
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
      // Not `requireVersioned`: v0.1 has no `OpportunityDetails` and is
      // deliberately validated against its own `OpportunityBase`, which is what
      // the mock actually serves for a v0.1 detail read.
      const { validate, errorText } = getValidator(version, schemaName);

      for (const opp of OPPORTUNITY_FIXTURES) {
        const shaped = shapeOpportunityForVersion(opp, version, "detail");

        // The nested `Competition` preview in `data/fixtures.ts` deliberately
        // omits `CompetitionBase`'s required `forms` object, so a record still
        // carrying `competitions` fails. That deviation is pinned explicitly
        // below; dropping it here lets this test pin the rest of the shape.
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

    // If these start failing, the nested `Competition` type grew a `forms`
    // object and now matches the full model — DELETE this block and fold
    // `competitions` back into the detail test above (dropping the omission),
    // rather than patching these assertions.
    //
    // Worth noting what #334 did NOT do here: `data/competitions.ts` has a
    // full `CompetitionBase` type that DOES carry `forms`, so the nested preview
    // could have been switched to it. It wasn't, because those previews are
    // inside the opportunity envelopes the golden corpus pins byte for byte —
    // changing them would rewrite that corpus for no gain to this ticket.
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
  // Without these, a validator that silently accepted everything — a broken
  // overlay, a schema that failed to register — would leave every test above
  // green while checking nothing.
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
    // The exact drift this suite caught for real when it was written.
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
