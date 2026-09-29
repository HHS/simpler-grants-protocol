import { describe, it, expect } from "vitest";
import {
  IdentifierSchema,
  SystemIdSchema,
  AwdIdFainSchema,
  AwdIdsSchema,
  AwdRefSchema,
  OpportunityDetailsSchema,
} from "../../../src/schemas/zod/awards";
import { expectZodMatchesJsonSchema } from "../../helper";

/**
 * DRAFT, NOT FOR MERGE. Schema-parity spec for the #1221-T4 validation pass.
 *
 * These schemas are not exported from `./index` and this spec is not part of
 * the published SDK's test surface; it exists to answer, before
 * `OpportunityDetails.awards` ships in Core v0.5, whether the award reference
 * stack can be modelled faithfully in Zod, and to write down what diverges
 * where it cannot yet.
 */

// Silence unused-import warnings for schemas exercised only indirectly (they
// back the `AwdIds`/`AwdRef` fields under test, not as standalone parity
// targets in this pass).
void IdentifierSchema;
void SystemIdSchema;
void AwdIdFainSchema;

// ############################################################################
// AwdIds Schema
// ############################################################################

describe("AwdIds Schema", () => {
  const jsonSchemaId = "AwdIds.yaml";

  it("should match AwdIds.yaml", async () => {
    const validAwdIds = {
      systemId: {
        registry: { code: "awd:grants.gov:system" },
        id: "123e4567-e89b-12d3-a456-426614174000",
      },
      "awd:us:fain": {
        registry: { code: "awd:us:fain", url: "https://commongrants.org/registries/awd-us-fain" },
        id: "H80CS00001",
      },
    };

    const result = await expectZodMatchesJsonSchema(
      AwdIdsSchema,
      jsonSchemaId,
      [
        // Controls: both sides must agree on these.
        { label: "empty object (every field optional)", value: {} },
        { label: "full example", value: validAwdIds },
        {
          label: "unregistered top-level key (root-level, agrees regardless of nested .strict())",
          value: { ...validAwdIds, unknownTopLevelKey: "x" },
        },
        {
          label: "awd:us:fain.registry.code is not the pinned literal",
          value: {
            "awd:us:fain": { registry: { code: "not:the:right:code" }, id: "H80CS00001" },
          },
        },

        // Nested boundary cases: these agree (both reject) only because
        // `RegistrySchema` and `IdentifierSchema` carry their own `.strict()`.
        // The harness only auto-applies `.strict()` at the root of the schema
        // under test (`fuzz-test.ts`), so a root-level unknown-key case cannot
        // observe a missing nested `.strict()` (#1220-T5 finding). These can.
        {
          label: "systemId.registry carries an unknown key (nested; pins RegistrySchema.strict())",
          value: {
            systemId: {
              registry: { code: "awd:grants.gov:system", extraKey: "nope" },
              id: "123e4567-e89b-12d3-a456-426614174000",
            },
          },
        },
        {
          label: "otherIds entry carries an unknown key (nested; pins IdentifierSchema.strict())",
          value: {
            otherIds: {
              "org:some:code": {
                registry: { code: "org:some:code" },
                unknownKey: "nope",
              },
            },
          },
        },
        {
          label:
            "awd:us:fain.registry carries an unknown key (nested; pins registryWithCode(...).strict())",
          value: {
            "awd:us:fain": {
              registry: { code: "awd:us:fain", extraKey: "nope" },
              id: "H80CS00001",
            },
          },
        },
        {
          label:
            "systemId.allIds entry carries an unknown key (nested; pins identifierValue(...).strict())",
          value: {
            systemId: {
              allIds: [
                {
                  id: "123e4567-e89b-12d3-a456-426614174000",
                  status: "active",
                  extraKey: "nope",
                },
              ],
            },
          },
        },

        // Regression controls for the #1221-T4 fuzzing finding: Core's
        // `IdentifierT` template declares both `registry` and `registry.code`
        // optional (`lib/core/lib/core/fields/identifier.tsp:28-34`,
        // `registry?: {code?: Code; url?: url}`), so an identifier may
        // legitimately omit its registry, or a registry may legitimately omit
        // its `code`. The draft originally required both (no `.nullish()`),
        // which generated fuzzing caught at 25/25 successful generations (not
        // a depth-truncation artifact); `RegistrySchema`, `registryWithCode`,
        // and every identifier's `registry` field are now `.nullish()`, and
        // these two cases pin that the fix agrees with the protocol.
        {
          label:
            "systemId present with registry omitted entirely (legal: IdentifierT marks registry optional)",
          value: { systemId: { id: "123e4567-e89b-12d3-a456-426614174000" } },
        },
        {
          label:
            "awd:us:fain present with registry omitted entirely (legal: IdentifierT marks registry and code optional)",
          value: { "awd:us:fain": { id: "H80CS00001" } },
        },
        {
          label: "systemId is a completely empty identifier object (every member optional)",
          value: { systemId: {} },
        },

        // ADR 0024 nullability (#1192): the SDK models every optional field as
        // `.nullish()`, while the protocol declares each optional but not
        // nullable, so an explicit `null` diverges.
        ...(
          [
            ["systemId", { systemId: null }],
            ["awd:us:fain", { "awd:us:fain": null }],
            ["otherIds", { otherIds: null }],
          ] as const
        ).map(([field, override]) => ({
          label: `${field} explicitly null (SDK nullish, protocol optional but not nullable)`,
          value: { ...validAwdIds, ...override },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1192",
        })),

        // The same #1192 disagreement one level deeper: `RegistrySchema`,
        // `registryWithCode`, and `identifierValue` are all built from
        // `.nullish()` leaves, so an explicit `null` diverges at every nested
        // position exactly like it does at the top level. Declaring three
        // representative positions (registry itself, a field within it, and
        // `allIds`) rather than enumerating every leaf at every nesting depth.
        {
          label:
            "awd:us:fain.registry explicitly null (nested; SDK nullish, protocol optional but not nullable)",
          value: { "awd:us:fain": { registry: null } },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1192",
        },
        {
          label:
            "systemId.registry.code explicitly null (nested; SDK nullish, protocol optional but not nullable)",
          value: { systemId: { registry: { code: null } } },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1192",
        },
        {
          label:
            "systemId.allIds explicitly null (nested; SDK nullish, protocol optional but not nullable)",
          value: { systemId: { allIds: null } },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1192",
        },
      ],
      6
    );

    expect(new Set(result.knownDivergences.map(d => d.issue))).toEqual(
      new Set(["https://github.com/HHS/simpler-grants-protocol/issues/1192"])
    );
  });
});

// ############################################################################
// AwdRef Schema
// ############################################################################

describe("AwdRef Schema", () => {
  const jsonSchemaId = "AwdRef.yaml";

  it("should match AwdRef.yaml", async () => {
    const valid = {
      id: "01912a8b-7c3d-7894-abcd-ef1234567890",
      title: "Community Health Center Capital Improvement Grant",
      identifiers: {
        systemId: {
          registry: { code: "awd:grants.gov:system" },
          id: "01912a8b-7c3d-7894-abcd-ef1234567890",
        },
      },
    };

    const withoutTitle: Partial<typeof valid> = { ...valid };
    delete withoutTitle.title;

    const result = await expectZodMatchesJsonSchema(
      AwdRefSchema,
      jsonSchemaId,
      [
        // Controls: both sides must agree on these.
        {
          label: "required fields only (no identifiers)",
          value: { id: valid.id, title: valid.title },
        },
        { label: "full example", value: valid },
        { label: "required title omitted", value: withoutTitle },
        { label: "id is not a uuid", value: { ...valid, id: "not-a-uuid" } },
        {
          label: "unregistered top-level key (root-level, agrees regardless of nested .strict())",
          value: { ...valid, unknownTopLevelKey: "x" },
        },

        // Nested boundary cases: these agree (both reject) only because
        // `AwdIdsSchema` and `RegistrySchema` carry their own `.strict()`. A
        // root-level case here cannot observe either one, per the #1220-T5
        // finding.
        {
          label:
            "identifiers carries an unknown top-level key (nested; pins AwdIdsSchema.strict())",
          value: { ...valid, identifiers: { ...valid.identifiers, unknownKey: "nope" } },
        },
        {
          label:
            "identifiers.systemId.registry carries an unknown key (nested; pins RegistrySchema.strict())",
          value: {
            ...valid,
            identifiers: {
              systemId: {
                registry: { code: "awd:grants.gov:system", extraKey: "nope" },
                id: valid.id,
              },
            },
          },
        },

        // Same regression control as AwdIds.yaml's block (registry/code are
        // legitimately optional per Core's `IdentifierT`), reached here
        // through `identifiers`.
        {
          label:
            "identifiers.systemId present with registry omitted entirely (legal: IdentifierT marks registry optional)",
          value: { ...valid, identifiers: { systemId: { id: valid.id } } },
        },
        {
          label: "identifiers.systemId is a completely empty identifier object",
          value: { ...valid, identifiers: { systemId: {} } },
        },

        // ADR 0024 nullability (#1192).
        {
          label: "identifiers explicitly null (SDK nullish, protocol optional but not nullable)",
          value: { ...valid, identifiers: null },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1192",
        },
      ],
      1
    );

    expect(new Set(result.knownDivergences.map(d => d.issue))).toEqual(
      new Set(["https://github.com/HHS/simpler-grants-protocol/issues/1192"])
    );
  });
});

// ############################################################################
// OpportunityDetails Schema
// ############################################################################

describe("OpportunityDetails Schema", () => {
  const jsonSchemaId = "OpportunityDetails.yaml";

  it("should match OpportunityDetails.yaml", async () => {
    const valid = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Sample Grant Opportunity",
      status: { value: "open" },
      description: "A sample grant opportunity for testing",
      createdAt: "2025-01-01T00:00:00Z",
      lastModifiedAt: "2025-01-02T00:00:00Z",
    };

    const withoutTitle: Partial<typeof valid> = { ...valid };
    delete withoutTitle.title;

    const validAward = {
      id: "01912a8b-7c3d-7894-abcd-ef1234567890",
      title: "Community Health Center Capital Improvement Grant",
    };

    const result = await expectZodMatchesJsonSchema(
      OpportunityDetailsSchema,
      jsonSchemaId,
      [
        // Controls: both sides must agree on these. `OpportunityDetails.yaml`
        // composes `OpportunityBase.yaml` through `allOf` with a `$ref`; AJV
        // (`ajv-validator.ts`) resolves it, so the base's required fields and
        // `unevaluatedProperties: {not: {}}` are enforced across the composed
        // schema, and these controls exercise that.
        { label: "required fields only", value: valid },
        {
          label: "required title omitted (from OpportunityBase, propagated through allOf)",
          value: withoutTitle,
        },
        { label: "id is not a uuid", value: { ...valid, id: "not-a-uuid" } },
        { label: "source is not a uri", value: { ...valid, source: "not a uri" } },
        {
          // Both sides reject this today, but not for the same reason the
          // label once implied: `OpportunityDetailsSchema` itself extends the
          // non-strict `OpportunityBaseSchema` and would silently strip an
          // unknown key on its own. The seal here comes entirely from the
          // harness applying `.strict()` at the root of the schema under test
          // (`fuzz-test.ts`), the same shape as the #1220-T5 finding: a green
          // control at the root cannot be read as the draft schema sealing
          // the composition itself.
          label:
            "unregistered top-level key (agrees only because the harness auto-strict's the root; the draft schema does not seal this on its own)",
          value: { ...valid, unknownTopLevelKey: "x" },
        },
        { label: "createdAt as a Date instance", value: { ...valid, createdAt: new Date() } },
        { label: "awards with a valid AwdRef entry", value: { ...valid, awards: [validAward] } },
        {
          // This is rejected by the required `title: z.string()` on
          // `AwdRefSchema`, not by its `.strict()` seal; the case below is
          // what actually pins strictness.
          label: "awards entry missing required title (required field, not strictness)",
          value: { ...valid, awards: [{ id: validAward.id }] },
        },
        {
          label:
            "awards entry carries an unknown key (nested; pins AwdRefSchema.strict(), not just its required fields)",
          value: { ...valid, awards: [{ ...validAward, extra: 1 }] },
        },

        // Same regression control as AwdIds.yaml/AwdRef.yaml (registry/code
        // are legitimately optional per Core's `IdentifierT`), reached here
        // through a nested `awards` entry.
        {
          label:
            "awards entry's identifiers.systemId present with registry omitted entirely (legal: IdentifierT marks registry optional)",
          value: {
            ...valid,
            awards: [{ ...validAward, identifiers: { systemId: { id: validAward.id } } }],
          },
        },

        // Values the SDK accepts that the protocol does not: every optional
        // field is `.nullish()` in Zod, while the protocol declares it optional
        // but not nullable. `awards` and `competitions` are new here; the rest
        // are inherited from `OpportunityBaseSchema` (models.spec.ts:236-254)
        // because `OpportunityDetailsSchema` extends it. ADR 0024 / #1192.
        ...(
          [
            ["funding", { funding: null }],
            ["keyDates", { keyDates: null }],
            ["source", { source: null }],
            ["customFields", { customFields: null }],
            ["acceptedApplicantTypes", { acceptedApplicantTypes: null }],
            ["identifiers", { identifiers: null }],
            ["funders", { funders: null }],
            ["competitions", { competitions: null }],
            ["awards", { awards: null }],
          ] as const
        ).map(([field, override]) => ({
          label: `${field} explicitly null (SDK nullish, protocol optional but not nullable)`,
          value: { ...valid, ...override },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1192",
        })),

        // `identifiers` and `funders` are inherited #1156 stopgaps
        // (models.ts:139,160): any object is accepted on the SDK side until the
        // Zod identifier/organization models land, while the protocol seals
        // `OppIds` and requires `OrgRefCollection.primary`. Non-objects still
        // agree.
        {
          label: "identifiers is not an object",
          value: { ...valid, identifiers: "not an object" },
        },
        {
          label:
            "identifiers with an unregistered top-level key (SDK any object, protocol sealed OppIds)",
          value: { ...valid, identifiers: { "opp:made:up": { id: "x" } } },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1156",
        },
        {
          label: "funders is not an object",
          value: { ...valid, funders: "not an object" },
        },
        {
          label: "funders without primary (SDK any object, protocol requires primary)",
          value: { ...valid, funders: { otherOrgs: {} } },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1156",
        },

        // `competitions` is left as a loose array of records on purpose (this
        // draft's docstring): `CompetitionBase` has no Zod model in either
        // SDK, and no issue owns adding one (not #1156, which scopes award
        // models only), so the SDK accepts any object where the protocol
        // requires `CompetitionBase`'s required fields (including `forms`).
        {
          label: "competitions is not an array",
          value: { ...valid, competitions: "not an array" },
        },
        {
          // Not #1156: that issue is "[TS SDK] Add Zod schemas for the award
          // models" and does not own Competition models; no issue does, in
          // either SDK. This is an open, unowned question, filed here against
          // #1221 (the umbrella issue this validation pass reports to) rather
          // than mis-parked on #1156. It is also precisely the question
          // #1221-T4 was asked to answer ("whether `OpportunityDetails` needs
          // `competitions` typed before `awards` can be"): the answer this
          // pass found is no. `awards` types cleanly against the real
          // `AwdRefSchema` regardless of `competitions` staying loose; the two
          // fields are independent, so typing `competitions` is not a
          // prerequisite for typing `awards`.
          label:
            "competitions entry missing CompetitionBase's required fields (SDK any object, protocol requires id/opportunityId/title/status/forms/createdAt/lastModifiedAt)",
          value: { ...valid, competitions: [{}] },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1221",
        },
      ],
      12
    );

    expect(new Set(result.knownDivergences.map(d => d.issue))).toEqual(
      new Set([
        "https://github.com/HHS/simpler-grants-protocol/issues/1192",
        "https://github.com/HHS/simpler-grants-protocol/issues/1156",
        "https://github.com/HHS/simpler-grants-protocol/issues/1221",
      ])
    );
  });
});
