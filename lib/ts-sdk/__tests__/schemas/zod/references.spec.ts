import { describe, it, expect } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper";
import {
  AppRefSchema,
  OrgIdEinSchema,
  OrgIdUeiSchema,
  OrgIdDunsSchema,
  OrgIdsSchema,
  OrgRefSchema,
  OrgRefCollectionSchema,
  OppIdFonSchema,
  OppIdAlnSchema,
  OppIdsSchema,
  OppRefSchema,
} from "@/schemas";
import { checkZodMatchesJsonSchema, type BoundaryCase } from "../../utils/fuzz-test";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

// ############################################################################
// AppRef schema
// ############################################################################

describe("AppRef Schema", () => {
  const jsonSchemaId = "AppRef.yaml";

  it("should validate a reference with id and title", () => {
    const value = { id: VALID_UUID, title: "My Application" };
    expect(AppRefSchema.parse(value)).toEqual(value);
  });

  it("should match AppRef.yaml", async () => {
    const cases: BoundaryCase[] = [
      { label: "valid reference", value: { id: VALID_UUID, title: "My Application" } },
      { label: "missing id is rejected", value: { title: "My Application" } },
      { label: "missing title is rejected", value: { id: VALID_UUID } },
      { label: "non-uuid id is rejected", value: { id: "not-a-uuid", title: "My Application" } },
      {
        label: "extra top-level key is rejected",
        value: { id: VALID_UUID, title: "My Application", unexpected: true },
      },
    ];
    await expectZodMatchesJsonSchema(AppRefSchema, jsonSchemaId, cases, 0, true);
  });

  it("should reject a missing required field", () => {
    expect(() => AppRefSchema.parse({ id: VALID_UUID })).toThrow();
    expect(() => AppRefSchema.parse({ title: "My Application" })).toThrow();
  });
});

// ############################################################################
// Organization identifier schemas
// ############################################################################

describe("OrgIdEin Schema", () => {
  it("should match OrgIdEin.yaml", async () => {
    const cases: BoundaryCase[] = [
      { label: "omitted registry code remains valid", value: { registry: {}, id: "123456789" } },
      {
        label: "wrong registry code is rejected",
        value: { registry: { code: "org:us:uei" }, id: "123456789" },
      },
      { label: "short primary id is rejected", value: { id: "12345678" } },
      {
        label: "short historical id is rejected",
        value: { allIds: [{ id: "12345678", status: "active" }] },
      },
      {
        label: "registry is sealed",
        value: { registry: { code: "org:us:ein", unexpected: true }, id: "123456789" },
      },
    ];
    await expectZodMatchesJsonSchema(OrgIdEinSchema, "OrgIdEin.yaml", cases, 0, true);
  });
});

describe("OrgIdUei Schema", () => {
  it("should match OrgIdUei.yaml", async () => {
    const cases: BoundaryCase[] = [
      { label: "omitted registry code remains valid", value: { registry: {}, id: "AB0123456789" } },
      {
        label: "wrong registry code is rejected",
        value: { registry: { code: "org:us:ein" }, id: "AB0123456789" },
      },
      { label: "lowercase primary id is rejected", value: { id: "ab0123456789" } },
      {
        label: "forbidden historical id character is rejected",
        value: { allIds: [{ id: "AI0123456789", status: "active" }] },
      },
      {
        label: "historical identifier is sealed",
        value: { allIds: [{ id: "AB0123456789", status: "active", unexpected: true }] },
      },
    ];
    await expectZodMatchesJsonSchema(OrgIdUeiSchema, "OrgIdUei.yaml", cases, 0, true);
  });
});

describe("OrgIdDuns Schema", () => {
  it("should match OrgIdDuns.yaml", async () => {
    const cases: BoundaryCase[] = [
      { label: "omitted registry code remains valid", value: { registry: {}, id: "123456789" } },
      {
        label: "wrong registry code is rejected",
        value: { registry: { code: "org:us:ein" }, id: "123456789" },
      },
      { label: "short primary id is rejected", value: { id: "12345678" } },
      {
        label: "short historical id is rejected",
        value: { allIds: [{ id: "12345678", status: "active" }] },
      },
      { label: "identifier is sealed", value: { id: "123456789", unexpected: true } },
    ];
    await expectZodMatchesJsonSchema(OrgIdDunsSchema, "OrgIdDuns.yaml", cases, 0, true);
  });
});

describe("OrgIds Schema", () => {
  it("should preserve inherited and specialized identifiers together", () => {
    const value = {
      systemId: { id: VALID_UUID },
      otherIds: { custom: { id: "custom-id" } },
      "org:us:ein": {
        registry: { code: "org:us:ein" },
        id: "012345678",
        allIds: [{ id: "987654321", status: "archived" }],
      },
      "org:us:uei": { registry: {}, id: "AB0123456789" },
      "org:xi:duns": { id: "123456789" },
    };

    expect(OrgIdsSchema.parse(value)).toEqual(value);
  });

  it("should match OrgIds.yaml", async () => {
    const cases: BoundaryCase[] = [
      { label: "unknown top-level key is rejected", value: { unexpected: true } },
      { label: "null specialized identifier is rejected", value: { "org:us:ein": null } },
      {
        label: "valid specialized history is accepted",
        value: {
          "org:us:uei": {
            allIds: [{ id: "AB0123456789", status: "archived" }],
          },
        },
      },
      {
        label: "specialized identifier nested in OrgIds is sealed",
        value: {
          "org:us:ein": {
            id: "123456789",
            registry: { code: "org:us:ein", unexpected: true },
          },
        },
      },
    ];
    await expectZodMatchesJsonSchema(OrgIdsSchema, "OrgIds.yaml", cases, 0, true);
  });
});

// ############################################################################
// Organization reference schemas
// ############################################################################

describe("OrgRef Schema", () => {
  it("should match OrgRef.yaml", async () => {
    const cases: BoundaryCase[] = [
      {
        label: "unknown top-level key is rejected",
        value: { id: VALID_UUID, name: "Example Organization", unexpected: true },
      },
      {
        label: "null identifiers are rejected",
        value: { id: VALID_UUID, name: "Example Organization", identifiers: null },
      },
      {
        label: "valid nested history is accepted",
        value: {
          id: VALID_UUID,
          name: "Example Organization",
          identifiers: {
            "org:us:uei": {
              allIds: [{ id: "AB0123456789", status: "archived" }],
            },
          },
        },
      },
      {
        label: "identifiers nested in OrgRef enforce specialized closure",
        value: {
          id: VALID_UUID,
          name: "Example Organization",
          identifiers: {
            "org:us:ein": { id: "123456789", unexpected: true },
          },
        },
      },
    ];
    await expectZodMatchesJsonSchema(OrgRefSchema, "OrgRef.yaml", cases, 0, true);
  });
});

describe("OrgRefCollection Schema", () => {
  const validCollection = {
    primary: {
      id: VALID_UUID,
      name: "Primary Organization",
      identifiers: {
        "org:us:uei": {
          registry: { code: "org:us:uei" },
          id: "AB0123456789",
          allIds: [{ id: "AB0123456789", status: "active" }],
        },
      },
    },
    otherOrgs: {
      funder: { id: VALID_UUID, name: "Funder" },
    },
  };

  it("should require a primary organization and validate every other organization", () => {
    const value = {
      primary: {
        id: VALID_UUID,
        name: "Primary Organization",
      },
      otherOrgs: {
        fiscalSponsor: { id: VALID_UUID, name: "Fiscal Sponsor" },
        subrecipient: { id: VALID_UUID, name: "Subrecipient" },
      },
    };

    expect(OrgRefCollectionSchema.parse(value)).toEqual(value);
    expect(() => OrgRefCollectionSchema.parse({ otherOrgs: value.otherOrgs })).toThrow();
    expect(() =>
      OrgRefCollectionSchema.parse({
        primary: value.primary,
        otherOrgs: { ...value.otherOrgs, invalid: { id: VALID_UUID } },
      })
    ).toThrow();
  });

  it("should match OrgRefCollection.yaml", async () => {
    // json-schema-faker emits empty strings for some pattern-constrained
    // allIds[].id values after reference resolution, so the harness's
    // protocol-validity guard correctly throws. This #1156-scoped workaround
    // injects varied valid collections; explicit cases above cover valid nested
    // history even when the default seeds omit it.
    const collectionResult = await checkZodMatchesJsonSchema(
      OrgRefCollectionSchema,
      "OrgRefCollection.yaml",
      {
        generateSample: async (_schema, seed) => {
          const uei = `AB${seed.toString().padStart(10, "0").slice(-10)}`;
          if (seed % 3 === 0) {
            return { primary: { id: VALID_UUID, name: `Primary Organization ${seed}` } };
          }
          const sample = {
            primary: {
              ...validCollection.primary,
              name: `Primary Organization ${seed}`,
              identifiers: {
                "org:us:uei": {
                  registry: { code: "org:us:uei" },
                  id: uei,
                  allIds: [{ id: uei, status: "active" }],
                },
              },
            },
          };
          return seed % 2 === 0
            ? sample
            : {
                ...sample,
                otherOrgs: {
                  [`funder-${seed}`]: { id: VALID_UUID, name: `Funder ${seed}` },
                },
              };
        },
        preserveObjectPolicy: true,
        cases: [
          {
            label: "unknown top-level key is rejected",
            value: {
              primary: { id: VALID_UUID, name: "Primary Organization" },
              unexpected: true,
            },
          },
          {
            label: "null other organizations are rejected",
            value: {
              primary: { id: VALID_UUID, name: "Primary Organization" },
              otherOrgs: null,
            },
          },
          {
            label: "organization references nested in otherOrgs are sealed",
            value: {
              primary: { id: VALID_UUID, name: "Primary Organization" },
              otherOrgs: {
                funder: { id: VALID_UUID, name: "Funder", unexpected: true },
              },
            },
          },
        ],
      }
    );
    expect(collectionResult.generationFailures).toEqual([]);
    expect(collectionResult.mismatches).toEqual([]);
    expect(collectionResult.resolvedDivergences).toEqual([]);
    expect(collectionResult.knownDivergences).toEqual([]);
    expect(collectionResult.validated).toBe(
      collectionResult.generationAttempted + collectionResult.boundaryCases
    );
  });
});

// ############################################################################
// Opportunity identifier schemas
// ############################################################################

describe("OppIdFon Schema", () => {
  it("should match OppIdFon.yaml", async () => {
    const cases: BoundaryCase[] = [
      { label: "omitted registry code remains valid", value: { registry: {}, id: "FON-0001" } },
      {
        label: "wrong registry code is rejected",
        value: { registry: { code: "opp:us:aln" }, id: "FON-0001" },
      },
      {
        label: "registry is sealed",
        value: { registry: { code: "opp:us:fon", unexpected: true }, id: "FON-0001" },
      },
      { label: "outer object is sealed", value: { id: "FON-0001", unexpected: true } },
      {
        label: "history entry missing status is rejected",
        value: { allIds: [{ id: "FON-0001" }] },
      },
      {
        label: "history entry is sealed",
        value: { allIds: [{ id: "FON-0001", status: "active", unexpected: true }] },
      },
    ];
    await expectZodMatchesJsonSchema(OppIdFonSchema, "OppIdFon.yaml", cases, 0, true);
  });
});

describe("OppIdAln Schema", () => {
  it("should match OppIdAln.yaml", async () => {
    const cases: BoundaryCase[] = [
      { label: "omitted registry code remains valid", value: { registry: {}, id: "93.123" } },
      {
        label: "wrong registry code is rejected",
        value: { registry: { code: "opp:us:fon" }, id: "93.123" },
      },
      {
        label: "registry is sealed",
        value: { registry: { code: "opp:us:aln", unexpected: true }, id: "93.123" },
      },
      { label: "outer object is sealed", value: { id: "93.123", unexpected: true } },
      {
        label: "history entry missing status is rejected",
        value: { allIds: [{ id: "93.123" }] },
      },
      {
        label: "history entry is sealed",
        value: { allIds: [{ id: "93.123", status: "active", unexpected: true }] },
      },
    ];
    await expectZodMatchesJsonSchema(OppIdAlnSchema, "OppIdAln.yaml", cases, 0, true);
  });
});

describe("OppIds Schema", () => {
  it("should preserve inherited and specialized identifiers together", () => {
    const value = {
      systemId: { id: VALID_UUID },
      otherIds: { custom: { id: "custom-id" } },
      "opp:us:fon": {
        registry: { code: "opp:us:fon" },
        id: "FON-0001",
        allIds: [{ id: "FON-0000", status: "archived" }],
      },
      "opp:us:aln": { registry: {}, id: "93.123" },
    };

    expect(OppIdsSchema.parse(value)).toEqual(value);
  });

  it("should match OppIds.yaml", async () => {
    const cases: BoundaryCase[] = [
      { label: "unknown top-level key is rejected", value: { unexpected: true } },
      { label: "null specialized identifier is rejected", value: { "opp:us:fon": null } },
      {
        label: "valid specialized history is accepted",
        value: {
          "opp:us:aln": {
            allIds: [{ id: "93.123", status: "archived" }],
          },
        },
      },
      {
        label: "specialized identifier nested in OppIds is sealed",
        value: {
          "opp:us:fon": {
            id: "FON-0001",
            registry: { code: "opp:us:fon", unexpected: true },
          },
        },
      },
    ];
    await expectZodMatchesJsonSchema(OppIdsSchema, "OppIds.yaml", cases, 0, true);
  });
});

// ############################################################################
// Opportunity reference schemas
// ############################################################################

describe("OppRef Schema", () => {
  it("should match OppRef.yaml", async () => {
    const cases: BoundaryCase[] = [
      {
        label: "unknown top-level key is rejected",
        value: { id: VALID_UUID, title: "Example Opportunity", unexpected: true },
      },
      {
        label: "null identifiers are rejected",
        value: { id: VALID_UUID, title: "Example Opportunity", identifiers: null },
      },
      {
        label: "valid nested history is accepted",
        value: {
          id: VALID_UUID,
          title: "Example Opportunity",
          identifiers: {
            "opp:us:aln": {
              allIds: [{ id: "93.123", status: "archived" }],
            },
          },
        },
      },
      {
        label: "identifiers nested in OppRef enforce specialized closure",
        value: {
          id: VALID_UUID,
          title: "Example Opportunity",
          identifiers: {
            "opp:us:fon": { id: "FON-0001", unexpected: true },
          },
        },
      },
    ];
    await expectZodMatchesJsonSchema(OppRefSchema, "OppRef.yaml", cases, 0, true);
  });
});
