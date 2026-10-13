import { describe, it, expect } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper.js";
import {
  IdentifierStatusEnum,
  IdentifierSchema,
  SystemIdSchema,
  IdentifierCollectionSchema,
} from "@/schemas";
import * as Schemas from "@/schemas";
import type { BoundaryCase } from "../../utils/fuzz-test.js";

const VALID_UUID = "01912a8b-7c3d-7890-abcd-ef1234567890";

// ############################################################################
// IdentifierStatus enum
// ############################################################################

describe("IdentifierStatusEnum", () => {
  it("should validate the two lifecycle statuses", () => {
    expect(IdentifierStatusEnum.parse("active")).toBe("active");
    expect(IdentifierStatusEnum.parse("archived")).toBe("archived");
  });

  it("should match IdentifierStatus.yaml", async () => {
    await expectZodMatchesJsonSchema(IdentifierStatusEnum, "IdentifierStatus.yaml");
  });

  it("should reject an unknown status", () => {
    expect(() => IdentifierStatusEnum.parse("retired")).toThrow();
  });
});

// ############################################################################
// Identifier schema (generic string identifier)
// ############################################################################

describe("Identifier Schema", () => {
  const jsonSchemaId = "Identifier.yaml";

  it("should validate an empty identifier", () => {
    expect(IdentifierSchema.parse({})).toEqual({});
  });

  it("should validate an empty and a URL-only registry", () => {
    expect(IdentifierSchema.parse({ registry: {} })).toEqual({ registry: {} });
    const urlOnly = { registry: { url: "https://commongrants.org/registries/org-us-ein" } };
    expect(IdentifierSchema.parse(urlOnly)).toEqual(urlOnly);
  });

  it("should retain primary and historical identifiers on parse", () => {
    const value = {
      registry: { code: "org:us:ein", url: "https://commongrants.org/registries/org-us-ein" },
      id: "123456789",
      allIds: [
        { id: "123456789", status: "active" },
        { id: "987654321", status: "archived" },
      ],
    };
    expect(IdentifierSchema.parse(value)).toEqual(value);
  });

  it("should match Identifier.yaml, including nested closure", async () => {
    const cases: BoundaryCase[] = [
      { label: "empty identifier", value: {} },
      { label: "empty registry", value: { registry: {} } },
      { label: "url-only registry", value: { registry: { url: "https://example.com/r" } } },
      {
        label: "extra top-level key is rejected",
        value: { id: "123456789", unexpected: true },
      },
      {
        label: "extra registry key is rejected",
        value: { registry: { code: "org:us:ein", unexpected: true } },
      },
      {
        label: "extra allIds-entry key is rejected",
        value: { allIds: [{ id: "123456789", status: "active", unexpected: true }] },
      },
      { label: "null registry is rejected", value: { registry: null } },
      { label: "null id is rejected", value: { id: null } },
      { label: "non-string id is rejected", value: { id: 123456789 } },
      {
        label: "allIds entry missing status is rejected",
        value: { allIds: [{ id: "123456789" }] },
      },
      {
        label: "allIds entry missing id is rejected",
        value: { allIds: [{ status: "active" }] },
      },
      {
        label: "allIds entry with unknown status is rejected",
        value: { allIds: [{ id: "123456789", status: "retired" }] },
      },
    ];
    await expectZodMatchesJsonSchema(IdentifierSchema, jsonSchemaId, cases, 0, true);
  });
});

// ############################################################################
// SystemId schema (UUID-constrained identifier)
// ############################################################################

describe("SystemId Schema", () => {
  const jsonSchemaId = "SystemId.yaml";

  it("should validate a UUID primary and historical id", () => {
    const value = { id: VALID_UUID, allIds: [{ id: VALID_UUID, status: "active" }] };
    expect(SystemIdSchema.parse(value)).toEqual(value);
  });

  it("should match SystemId.yaml, enforcing UUID on primary and historical ids", async () => {
    const cases: BoundaryCase[] = [
      { label: "empty system id", value: {} },
      { label: "valid uuid primary", value: { id: VALID_UUID } },
      { label: "non-uuid primary is rejected", value: { id: "123456789" } },
      {
        label: "non-uuid historical id is rejected",
        value: { allIds: [{ id: "123456789", status: "active" }] },
      },
      {
        label: "valid uuid historical id",
        value: { allIds: [{ id: VALID_UUID, status: "archived" }] },
      },
      { label: "null id is rejected", value: { id: null } },
      { label: "extra top-level key is rejected", value: { id: VALID_UUID, unexpected: true } },
    ];
    await expectZodMatchesJsonSchema(SystemIdSchema, jsonSchemaId, cases, 0, true);
  });
});

// ############################################################################
// IdentifierCollection schema (extensible)
// ############################################################################

describe("IdentifierCollection Schema", () => {
  const jsonSchemaId = "IdentifierCollection.yaml";

  it("should validate an empty collection", () => {
    expect(IdentifierCollectionSchema.parse({})).toEqual({});
  });

  it("should retain systemId and otherIds on parse", () => {
    const value = {
      systemId: { registry: { code: "org:grants.gov:system" }, id: VALID_UUID },
      otherIds: {
        "org:candid:bridge": { registry: { code: "org:candid:bridge" }, id: "1234567" },
      },
    };
    expect(IdentifierCollectionSchema.parse(value)).toEqual(value);
  });

  it("should match IdentifierCollection.yaml, accepting the open record", async () => {
    const cases: BoundaryCase[] = [
      { label: "empty collection", value: {} },
      {
        label: "extra top-level key is accepted (extensible)",
        value: { extra: { registry: { code: "x" }, id: "1" } },
      },
      {
        label: "otherIds entry must be an Identifier",
        value: { otherIds: { "org:x": "not-an-object" } },
      },
      {
        label: "nested Identifier closure is enforced through otherIds",
        value: { otherIds: { "org:x": { id: "1", unexpected: true } } },
      },
      {
        label: "systemId UUID constraint applies through the collection",
        value: { systemId: { id: "not-a-uuid" } },
      },
    ];
    await expectZodMatchesJsonSchema(IdentifierCollectionSchema, jsonSchemaId, cases, 0, true);
  });
});

// ############################################################################
// Internal factory is not part of the public barrel
// ############################################################################

describe("public schema barrel", () => {
  it("should not expose the internal identifier factory", () => {
    expect((Schemas as Record<string, unknown>).createIdentifierSchema).toBeUndefined();
  });
});
