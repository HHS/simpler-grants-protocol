import { describe, it, expect } from "vitest";
import { OrgRefSchema, OrgRefCollectionSchema } from "@/schemas/zod/organizations";
import { checkZodMatchesJsonSchema } from "../../utils/fuzz-test";
import { expectZodMatchesJsonSchema } from "../../helper";

/**
 * DRAFT parity suite for the #1220-T5 validation pass. Not intended to merge.
 *
 * It answers one question: can `OrgRef` and `OrgRefCollection` be typed in Zod
 * today, before the identifier models that #1156 owns exist? Every divergence
 * it records is evidence for the v0.9 SDK alignment tickets.
 */

const validOrgRef = {
  id: "018f2e77-4b5c-7d2e-9f3a-bcdef1234567",
  name: "Health Resources and Services Administration",
};

/**
 * json-schema-faker defaults `maxDepth` to 5. At the limit it emits only an
 * object's required properties, filling each with a placeholder: a const if
 * the schema has one, then a default, then the first enum value, then a bare
 * type placeholder such as `""`. `OrgRefCollection` puts the `allIds[N]` item
 * object (required `id` and `status`) at exactly depth 5, so `id` becomes an
 * empty string where the protocol demands a patterned UEI, EIN or DUNS, or a
 * uuid under `systemId`. The harness then correctly refuses to compare a
 * sample its own schema rejects.
 *
 * Measured across all 152 bundle schemas, only six generate differently at
 * depth 12, and four produce protocol-invalid samples at the default:
 * `OrgRefCollection` (11/25), `AwardBase` (5/25), `OrgRevision` (4/25) and
 * `ProposalOrgs` (1/25). Of the shipped suites only `OpportunityBase` differs
 * at all, and its samples stay valid. The award schemas #1156 owns are on that
 * list, so they will hit this the moment they are typed.
 */
const deepGenerate = async (schema: unknown, seed: number) => {
  const { generate } = await import("json-schema-faker");
  return generate(schema as Parameters<typeof generate>[0], { seed, maxDepth: 12 });
};

describe("DRAFT OrgRefSchema", () => {
  const jsonSchemaId = "OrgRef.yaml";

  it("should match OrgRef.yaml", async () => {
    await expectZodMatchesJsonSchema(
      OrgRefSchema,
      jsonSchemaId,
      [
        // Controls: both sides must agree on these.
        { label: "required fields only", value: validOrgRef },
        { label: "id is not a uuid", value: { ...validOrgRef, id: "not-a-uuid" } },
        { label: "name missing", value: { id: validOrgRef.id } },
        { label: "identifiers is not an object", value: { ...validOrgRef, identifiers: "nope" } },
        // Note this one agrees with or without `.strict()`: the harness wraps
        // the root schema in `.strict()` itself, so the flag is masked here.
        // The nested `otherOrgs` case in the collection suite is what actually
        // discriminates.
        { label: "unknown top-level key", value: { ...validOrgRef, unexpected: 1 } },

        // Every optional field is `.nullish()` in Zod while the protocol
        // declares it optional but not nullable (ADR 0024, #1192).
        {
          label: "identifiers explicitly null (SDK nullish, protocol optional but not nullable)",
          value: { ...validOrgRef, identifiers: null },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1192",
        },

        // `identifiers` is any object on the SDK side until the Zod identifier
        // models land (#1156); the protocol seals `OrgIds` to its three base
        // registry codes plus `systemId` and `otherIds`.
        {
          label:
            "identifiers with an unregistered top-level key (SDK any object, protocol sealed OrgIds)",
          value: { ...validOrgRef, identifiers: { "org:made:up": { id: "x" } } },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1156",
        },
      ],
      2
    );
  });
});

describe("DRAFT OrgRefCollectionSchema", () => {
  const jsonSchemaId = "OrgRefCollection.yaml";

  it("should match OrgRefCollection.yaml once the generator reaches full depth", async () => {
    const result = await checkZodMatchesJsonSchema(OrgRefCollectionSchema, jsonSchemaId, {
      generateSample: deepGenerate,
      cases: [
        // Controls: both sides must agree on these.
        { label: "primary only", value: { primary: validOrgRef } },
        { label: "primary missing", value: { otherOrgs: {} } },
        {
          label: "otherOrgs entry is a valid OrgRef",
          value: { primary: validOrgRef, otherOrgs: { parent: validOrgRef } },
        },
        {
          label: "otherOrgs entry is missing OrgRef.name",
          value: { primary: validOrgRef, otherOrgs: { parent: { id: validOrgRef.id } } },
        },
        // Nested strictness, the case that motivated `.strict()` on OrgRef.
        {
          label: "otherOrgs entry carries an unknown key",
          value: {
            primary: validOrgRef,
            otherOrgs: { parent: { ...validOrgRef, unexpected: 1 } },
          },
        },

        // ADR 0024 nullability, as above.
        {
          label: "otherOrgs explicitly null (SDK nullish, protocol optional but not nullable)",
          value: { primary: validOrgRef, otherOrgs: null },
          expect: "divergent" as const,
          issue: "https://github.com/HHS/simpler-grants-protocol/issues/1192",
        },
      ],
      expectedDivergences: 1,
    });

    expect(result.mismatches).toEqual([]);
    expect(result.passed).toBe(true);
  });
});
