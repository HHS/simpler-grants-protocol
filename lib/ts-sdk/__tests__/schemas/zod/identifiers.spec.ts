import { describe, it, expect } from "vitest";
import {
  IdentifierStatusEnum,
  IdentifierSchema,
  SystemIdSchema,
  IdentifierCollectionSchema,
  OppIdFonSchema,
  OppIdAlnSchema,
  OppIdsSchema,
  OppRefSchema,
} from "@/schemas";
import { expectZodMatchesJsonSchema } from "../../helper";

/**
 * Every optional field in the SDK is `.nullish()`, while the protocol declares
 * optionals that are not nullable. ADR 0024 alignment owns the fix, and it is
 * the only divergence this draft reproduces: one per model below, kept next to
 * an agreeing control of the same shape so a substituted failure surfaces there.
 */
const ADR_0024_ISSUE = "https://github.com/HHS/simpler-grants-protocol/issues/1192";

/**
 * A second, unrelated cause, and the only model here it affects. The harness
 * unconditionally seals the Zod side with `.strict()` before comparing
 * (`__tests__/utils/fuzz-test.ts:304-307`), so a protocol schema that is
 * deliberately open cannot be matched: the SDK rejects an unknown key the
 * protocol accepts, whatever the draft does. Sealing the draft would not help.
 * Tracked against this ticket until it gets an issue of its own.
 */
const OPEN_SCHEMA_ISSUE = "https://github.com/HHS/simpler-grants-protocol/issues/1219";

// ############################################################################
// OppIdFon Schema
// ############################################################################

describe("OppIdFon Schema", () => {
  const jsonSchemaId = "OppIdFon.yaml";

  it("should validate a valid OppIdFon", () => {
    const validOppIdFon = {
      registry: {
        code: "opp:us:fon",
        url: "https://commongrants.org/registries/opp-us-fon",
      },
      id: "HHS-2026-ACF-OCC-YD-0001",
    };
    expect(OppIdFonSchema.parse(validOppIdFon)).toEqual(validOppIdFon);
  });

  it("should match OppIdFon.yaml", async () => {
    const valid = {
      registry: {
        code: "opp:us:fon",
        url: "https://commongrants.org/registries/opp-us-fon",
      },
      id: "HHS-2026-ACF-OCC-YD-0001",
    };

    const result = await expectZodMatchesJsonSchema(
      OppIdFonSchema,
      jsonSchemaId,
      [
        // Every field is optional, so an empty object is valid.
        { label: "empty object", value: {} },
        { label: "empty registry", value: { registry: {} } },
        { label: "full valid value", value: valid },
        // registry.code is a const; the wrong literal must be rejected.
        {
          label: "wrong registry code",
          value: { registry: { code: "opp:us:aln" }, id: "X" },
        },
        // The schema is sealed at the top level.
        { label: "unknown top-level key", value: { id: "X", extra: "nope" } },
        // The registry object is sealed too.
        {
          label: "unknown key inside registry",
          value: { registry: { code: "opp:us:fon", nope: 1 } },
        },
        // allIds entries require both id and status.
        {
          label: "allIds entry missing status",
          value: { allIds: [{ id: "X" }] },
        },
        {
          label: "allIds entry with a bad status",
          value: { allIds: [{ id: "X", status: "retired" }] },
        },
        {
          label: "registry.url is not a uri",
          value: { registry: { code: "opp:us:fon", url: "not a uri" } },
        },
        // The control for the divergent case below: the same field, populated.
        { label: "id present", value: { id: "X" } },
        {
          label: "id explicitly null (SDK nullish, protocol optional but not nullable)",
          value: { id: null },
          expect: "divergent",
          issue: ADR_0024_ISSUE,
        },
      ],
      1
    );

    expect(new Set(result.knownDivergences.map(d => d.issue))).toEqual(new Set([ADR_0024_ISSUE]));
  });

  it("should raise an error for an invalid OppIdFon", () => {
    // Wrong registry code (const mismatch)
    expect(() => OppIdFonSchema.parse({ registry: { code: "opp:us:aln" } })).toThrow();
    // Unknown top-level key
    expect(() => OppIdFonSchema.parse({ id: "X", extra: "nope" })).toThrow();
    // allIds entry missing required status
    expect(() => OppIdFonSchema.parse({ allIds: [{ id: "X" }] })).toThrow();
  });
});

// ############################################################################
// OppIdAln Schema
// ############################################################################

describe("OppIdAln Schema", () => {
  const jsonSchemaId = "OppIdAln.yaml";

  it("should validate a valid OppIdAln", () => {
    const validOppIdAln = {
      registry: { code: "opp:us:aln" },
      id: "93.575",
    };
    expect(OppIdAlnSchema.parse(validOppIdAln)).toEqual(validOppIdAln);
  });

  it("should match OppIdAln.yaml", async () => {
    const result = await expectZodMatchesJsonSchema(
      OppIdAlnSchema,
      jsonSchemaId,
      [
        { label: "empty object", value: {} },
        {
          label: "full valid value",
          value: { registry: { code: "opp:us:aln" }, id: "93.575" },
        },
        // registry.code is a const; the wrong literal must be rejected.
        {
          label: "wrong registry code",
          value: { registry: { code: "opp:us:fon" }, id: "93.575" },
        },
        // ALN carries no pattern, so a value shaped nothing like an ALN is valid
        // on both sides. The catalog entry remains the authority on the format.
        { label: "id that is not ALN-shaped", value: { id: "not-an-aln" } },
        {
          label: "id explicitly null (SDK nullish, protocol optional but not nullable)",
          value: { id: null },
          expect: "divergent",
          issue: ADR_0024_ISSUE,
        },
      ],
      1
    );

    expect(new Set(result.knownDivergences.map(d => d.issue))).toEqual(new Set([ADR_0024_ISSUE]));
  });

  it("should raise an error for an invalid OppIdAln", () => {
    // Wrong registry code (const mismatch)
    expect(() => OppIdAlnSchema.parse({ registry: { code: "opp:us:fon" } })).toThrow();
  });
});

// ############################################################################
// OppIds Schema
// ############################################################################

describe("OppIds Schema", () => {
  const jsonSchemaId = "OppIds.yaml";

  const fullExample = {
    systemId: {
      registry: { code: "opp:grants.gov:system" },
      id: "018f2e77-3a4b-7c1d-9e2f-abcdef123456",
    },
    "opp:us:fon": {
      registry: { code: "opp:us:fon", url: "https://commongrants.org/registries/opp-us-fon" },
      id: "HHS-2026-ACF-OCC-YD-0001",
    },
    "opp:us:aln": {
      registry: { code: "opp:us:aln", url: "https://commongrants.org/registries/opp-us-aln" },
      id: "93.575",
    },
  };

  it("should validate a valid OppIds", () => {
    expect(OppIdsSchema.parse(fullExample)).toEqual(fullExample);
  });

  it("should match OppIds.yaml", async () => {
    const result = await expectZodMatchesJsonSchema(
      OppIdsSchema,
      jsonSchemaId,
      [
        { label: "empty object", value: {} },
        { label: "full example from the bundle", value: fullExample },
        {
          label: "otherIds carrying an arbitrary registry code",
          value: {
            otherIds: {
              "opp:custom:thing": { registry: { code: "opp:custom:thing" }, id: "abc" },
            },
          },
        },
        // systemId.id must be a uuid.
        { label: "systemId.id is not a uuid", value: { systemId: { id: "not-a-uuid" } } },
        // unevaluatedProperties: {not: {}} seals OppIds even across the allOf.
        { label: "unknown top-level key", value: { "opp:us:xyz": { id: "a" } } },
        // opp:us:fon value with the wrong nested registry code.
        {
          label: "opp:us:fon with the wrong nested code",
          value: { "opp:us:fon": { registry: { code: "opp:us:aln" } } },
        },
        // The control for the divergent case below: the same field, populated.
        { label: "systemId present", value: { systemId: fullExample.systemId } },
        {
          label: "systemId explicitly null (SDK nullish, protocol optional but not nullable)",
          value: { systemId: null },
          expect: "divergent",
          issue: ADR_0024_ISSUE,
        },
      ],
      1
    );

    expect(new Set(result.knownDivergences.map(d => d.issue))).toEqual(new Set([ADR_0024_ISSUE]));
  });

  it("should raise an error for an invalid OppIds", () => {
    // systemId.id must be a uuid
    expect(() => OppIdsSchema.parse({ systemId: { id: "not-a-uuid" } })).toThrow();
    // unknown top-level key is not allowed
    expect(() => OppIdsSchema.parse({ "opp:us:xyz": { id: "a" } })).toThrow();
  });
});

// ############################################################################
// OppRef Schema
// ############################################################################

describe("OppRef Schema", () => {
  const jsonSchemaId = "OppRef.yaml";

  const requiredOnly = {
    id: "018f2e77-3a4b-7c1d-9e2f-abcdef123456",
    title: "Health Center Capital Improvement Program",
  };

  it("should validate a valid OppRef", () => {
    expect(OppRefSchema.parse(requiredOnly)).toEqual(requiredOnly);
  });

  it("should match OppRef.yaml", async () => {
    const withIdentifiers = {
      ...requiredOnly,
      identifiers: {
        systemId: {
          registry: { code: "opp:grants.gov:system" },
          id: "018f2e77-3a4b-7c1d-9e2f-abcdef123456",
        },
        "opp:us:fon": {
          registry: { code: "opp:us:fon", url: "https://commongrants.org/registries/opp-us-fon" },
          id: "HHS-2026-ACF-OCC-YD-0001",
        },
        "opp:us:aln": {
          registry: { code: "opp:us:aln", url: "https://commongrants.org/registries/opp-us-aln" },
          id: "93.575",
        },
      },
    };

    const withoutTitle: Partial<typeof requiredOnly> = { ...requiredOnly };
    delete withoutTitle.title;

    const result = await expectZodMatchesJsonSchema(
      OppRefSchema,
      jsonSchemaId,
      [
        { label: "required-only", value: requiredOnly },
        { label: "with identifiers", value: withIdentifiers },
        { label: "title omitted", value: withoutTitle },
        { label: "id is not a uuid", value: { ...requiredOnly, id: "not-a-uuid" } },
        { label: "unknown top-level key", value: { ...requiredOnly, extra: "nope" } },
        {
          label: "identifiers explicitly null (SDK nullish, protocol optional but not nullable)",
          value: { ...requiredOnly, identifiers: null },
          expect: "divergent",
          issue: ADR_0024_ISSUE,
        },
      ],
      1
    );

    expect(new Set(result.knownDivergences.map(d => d.issue))).toEqual(new Set([ADR_0024_ISSUE]));
  });

  it("should raise an error for an invalid OppRef", () => {
    // Missing required field 'title'
    expect(() => OppRefSchema.parse({ id: "018f2e77-3a4b-7c1d-9e2f-abcdef123456" })).toThrow();
    // Invalid UUID format for 'id'
    expect(() => OppRefSchema.parse({ id: "not-a-uuid", title: "Test" })).toThrow();
  });
});

// ############################################################################
// Supporting generic identifier schemas
// ############################################################################

describe("IdentifierStatusEnum", () => {
  const jsonSchemaId = "IdentifierStatus.yaml";

  it("should validate a valid IdentifierStatusEnum", () => {
    expect(IdentifierStatusEnum.parse("active")).toBe("active");
    expect(IdentifierStatusEnum.parse("archived")).toBe("archived");
  });

  it("should match IdentifierStatus.yaml", async () => {
    await expectZodMatchesJsonSchema(IdentifierStatusEnum, jsonSchemaId, [
      { label: "active", value: "active" },
      { label: "archived", value: "archived" },
      { label: "a status outside the enum", value: "retired" },
      { label: "not a string", value: 1 },
    ]);
  });

  it("should raise an error for an invalid IdentifierStatusEnum", () => {
    expect(() => IdentifierStatusEnum.parse("retired")).toThrow();
  });
});

describe("Identifier Schema", () => {
  const jsonSchemaId = "Identifier.yaml";

  const validIdentifier = {
    registry: { code: "org:us:ein", url: "https://commongrants.org/registries/org-us-ein" },
    id: "123456789",
  };

  it("should validate a valid Identifier", () => {
    expect(IdentifierSchema.parse(validIdentifier)).toEqual(validIdentifier);
  });

  it("should match Identifier.yaml", async () => {
    const result = await expectZodMatchesJsonSchema(
      IdentifierSchema,
      jsonSchemaId,
      [
        { label: "empty object", value: {} },
        { label: "full valid value", value: validIdentifier },
        // The generic form pins no registry, so any code is valid.
        { label: "an arbitrary registry code", value: { registry: { code: "anything:at:all" } } },
        { label: "unknown top-level key", value: { id: "X", extra: "nope" } },
        { label: "allIds entry missing status", value: { allIds: [{ id: "X" }] } },
        {
          label: "multi-value example from the bundle",
          value: {
            registry: { code: "org:us:ein" },
            id: "123456789",
            allIds: [
              { id: "123456789", status: "active" },
              { id: "987654321", status: "archived" },
            ],
          },
        },
        { label: "id present", value: { id: "X" } },
        {
          label: "id explicitly null (SDK nullish, protocol optional but not nullable)",
          value: { id: null },
          expect: "divergent",
          issue: ADR_0024_ISSUE,
        },
      ],
      1
    );

    expect(new Set(result.knownDivergences.map(d => d.issue))).toEqual(new Set([ADR_0024_ISSUE]));
  });

  it("should raise an error for an invalid Identifier", () => {
    expect(() => IdentifierSchema.parse({ allIds: [{ id: "X" }] })).toThrow();
  });
});

describe("SystemId Schema", () => {
  const jsonSchemaId = "SystemId.yaml";

  const validSystemId = {
    registry: { code: "org:grants.gov:system" },
    id: "01912a8b-7c3d-7890-abcd-ef1234567890",
  };

  it("should validate a valid SystemId", () => {
    expect(SystemIdSchema.parse(validSystemId)).toEqual(validSystemId);
  });

  it("should match SystemId.yaml", async () => {
    const result = await expectZodMatchesJsonSchema(
      SystemIdSchema,
      jsonSchemaId,
      [
        { label: "empty object", value: {} },
        { label: "full valid value", value: validSystemId },
        // Unlike the generic Identifier, the value must be a uuid.
        { label: "id is not a uuid", value: { id: "not-a-uuid" } },
        {
          label: "allIds entry whose id is not a uuid",
          value: { allIds: [{ id: "not-a-uuid", status: "active" }] },
        },
        { label: "unknown top-level key", value: { id: validSystemId.id, extra: "nope" } },
        { label: "id present", value: { id: validSystemId.id } },
        {
          label: "id explicitly null (SDK nullish, protocol optional but not nullable)",
          value: { id: null },
          expect: "divergent",
          issue: ADR_0024_ISSUE,
        },
      ],
      1
    );

    expect(new Set(result.knownDivergences.map(d => d.issue))).toEqual(new Set([ADR_0024_ISSUE]));
  });

  it("should raise an error for an invalid SystemId", () => {
    // id must be a uuid on SystemId, unlike the generic Identifier
    expect(() => SystemIdSchema.parse({ id: "not-a-uuid" })).toThrow();
  });
});

describe("IdentifierCollection Schema", () => {
  const jsonSchemaId = "IdentifierCollection.yaml";

  const validCollection = {
    systemId: {
      registry: { code: "org:grants.gov:system" },
      id: "01912a8b-7c3d-7890-abcd-ef1234567890",
    },
    otherIds: {
      "org:candid:bridge": { registry: { code: "org:candid:bridge" }, id: "1234567" },
    },
  };

  it("should validate a valid IdentifierCollection", () => {
    expect(IdentifierCollectionSchema.parse(validCollection)).toEqual(validCollection);
  });

  it("should match IdentifierCollection.yaml", async () => {
    const result = await expectZodMatchesJsonSchema(
      IdentifierCollectionSchema,
      jsonSchemaId,
      [
        { label: "empty object", value: {} },
        { label: "full valid value", value: validCollection },
        { label: "systemId.id is not a uuid", value: { systemId: { id: "not-a-uuid" } } },
        {
          label: "otherIds value that is not an Identifier",
          value: { otherIds: { "org:candid:bridge": { nope: 1 } } },
        },
        // The only open schema in this draft, and the only place the harness's
        // forced .strict() bites. See OPEN_SCHEMA_ISSUE above.
        {
          label: "unknown top-level key (protocol open, harness seals the Zod side)",
          value: { ...validCollection, extra: "nope" },
          expect: "divergent",
          issue: OPEN_SCHEMA_ISSUE,
        },
        { label: "systemId present", value: { systemId: validCollection.systemId } },
        {
          label: "systemId explicitly null (SDK nullish, protocol optional but not nullable)",
          value: { systemId: null },
          expect: "divergent",
          issue: ADR_0024_ISSUE,
        },
      ],
      2
    );

    // Two distinct causes here, unlike every other model in this file.
    expect(new Set(result.knownDivergences.map(d => d.issue))).toEqual(
      new Set([ADR_0024_ISSUE, OPEN_SCHEMA_ISSUE])
    );
  });

  it("should raise an error for an invalid IdentifierCollection", () => {
    expect(() => IdentifierCollectionSchema.parse({ systemId: { id: "not-a-uuid" } })).toThrow();
  });
});
