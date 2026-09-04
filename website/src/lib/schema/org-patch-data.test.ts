import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import Ajv2020 from "ajv/dist/2020";
import { Paths } from "./paths";

/**
 * RFC 7396 (JSON Merge Patch) behavior of the published OrgPatchData schema.
 *
 * Guards the two failure modes fixed by hand-composing the merge-patch
 * sources: record keys must be deletable with `null`, and fields inherited
 * through `extends` (systemId, otherIds) must be optional and clearable.
 * Also confirms the schema still rejects malformed patches.
 *
 * Uses its own Ajv instance rather than the shared one from lib/validation:
 * that loader strips top-level `unevaluatedProperties`, but external
 * consumers validate against the published files verbatim, so the sealing
 * behavior is part of the contract under test.
 */
describe("OrgPatchData merge-patch schema", () => {
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  for (const file of fs.readdirSync(Paths.SCHEMAS_DIR)) {
    if (!file.endsWith(".yaml")) continue;
    const schema = yaml.load(
      fs.readFileSync(path.join(Paths.SCHEMAS_DIR, file), "utf-8"),
    ) as { $id?: string };
    ajv.addSchema(schema, schema.$id ?? file);
  }
  const validate = ajv.getSchema("OrgPatchData.yaml");

  it("is published and compiles", () => {
    expect(validate).toBeDefined();
  });

  describe("accepts RFC 7396 patches", () => {
    const valid: Array<[string, object]> = [
      ["deletes a customFields key", { customFields: { legacyCode: null } }],
      [
        "deletes an otherIds key",
        { identifiers: { otherIds: { "org:xi:foo": null } } },
      ],
      [
        "deletes an otherSocials key",
        { socials: { otherSocials: { youtube: null } } },
      ],
      [
        "deletes an otherAddresses key",
        { addresses: { otherAddresses: { work: null } } },
      ],
      [
        "deletes an otherPhones key",
        { phones: { otherPhones: { mobile: null } } },
      ],
      [
        "deletes an otherEmails key",
        { emails: { otherEmails: { work: null } } },
      ],
      [
        "clears the inherited systemId field",
        { identifiers: { systemId: null } },
      ],
      [
        "clears an inherited PCSTerm field on orgType",
        { orgType: { description: null } },
      ],
      [
        "patches orgType without its other PCSTerm fields",
        { orgType: { code: "AB123456" } },
      ],
      ["deletes a base identifier", { identifiers: { "org:us:ein": null } }],
      ["clears a whole field", { customFields: null }],
      [
        "applies the documented example",
        {
          name: "Example Nonprofit (Renamed)",
          mission: "To expand access to community health resources.",
          yearFounded: null,
          socials: { website: null },
          emails: { primary: "info@example.org" },
        },
      ],
      [
        "adds or replaces an otherIds entry",
        {
          identifiers: {
            otherIds: {
              "org:xi:foo": {
                registry: { code: "org:xi:foo", url: "https://example.com" },
                id: "12345",
              },
            },
          },
        },
      ],
    ];

    it.each(valid)("%s", (_name, patch) => {
      expect(validate!(patch)).toBe(true);
    });
  });

  describe("rejects invalid patches", () => {
    const invalid: Array<[string, object]> = [
      ["unknown top-level property", { bogus: true }],
      ["null for the non-clearable name field", { name: null }],
      ["wrong type for mission", { mission: 42 }],
      [
        "wrong type inside an otherIds entry",
        { identifiers: { otherIds: { "org:xi:foo": { id: 123 } } } },
      ],
      [
        "unknown property inside a customFields entry",
        { customFields: { foo: { bogus: true } } },
      ],
      ["unknown property inside addresses", { addresses: { bogus: true } }],
      [
        "wrong type inside an otherPhones entry",
        { phones: { otherPhones: { mobile: { number: 123 } } } },
      ],
      ["malformed orgType code", { orgType: { code: "nope" } }],
      [
        "null for the non-clearable orgType term field",
        { orgType: { term: null } },
      ],
    ];

    it.each(invalid)("%s", (_name, patch) => {
      expect(validate!(patch)).toBe(false);
    });
  });

  /**
   * The two invariants below are asserted structurally over every emitted
   * `OrgPatch*` schema rather than against a hand-listed set of fields, because
   * the `Patch` mirrors in `organization-sync.tsp` are maintained by hand: a
   * field added to one of the mirrored base models flows in through spread but
   * does not pick up the adjustment its type needs. Checking the emitted shape
   * means these need no per-model upkeep as the base models change.
   */
  type Node = Record<string, unknown>;
  const isObj = (v: unknown): v is Node =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  /** Visit every schema node in every emitted `OrgPatch*` schema. */
  const eachSchemaNode = (visit: (node: Node, where: string) => void) => {
    let seen = 0;
    const walk = (node: unknown, where: string) => {
      if (Array.isArray(node)) {
        node.forEach((n, i) => walk(n, `${where}[${i}]`));
        return;
      }
      if (!isObj(node)) return;
      seen += 1;
      visit(node, where);
      for (const [key, value] of Object.entries(node))
        walk(value, `${where}/${key}`);
    };
    for (const file of fs.readdirSync(Paths.SCHEMAS_DIR)) {
      if (!file.startsWith("OrgPatch") || !file.endsWith(".yaml")) continue;
      walk(
        yaml.load(fs.readFileSync(path.join(Paths.SCHEMAS_DIR, file), "utf-8")),
        file,
      );
    }
    // Guards against a silently-broken walk making either assertion vacuous.
    expect(seen).toBeGreaterThan(0);
  };

  // Root cause 1: a record member with no `null` branch rejects RFC 7396
  // per-key deletion.
  it("every record member accepts null (per-key deletion)", () => {
    // A sealed model emits `unevaluatedProperties: {not: {}}`. A record emits
    // its value schema there instead, and declares no properties of its own.
    const isSealed = (v: unknown) =>
      isObj(v) && isObj(v.not) && Object.keys(v.not).length === 0;

    const isRecord = (n: Node) =>
      n.type === "object" &&
      "unevaluatedProperties" in n &&
      !isSealed(n.unevaluatedProperties) &&
      Object.keys(isObj(n.properties) ? n.properties : {}).length === 0;

    const permitsNull = (v: unknown): boolean => {
      if (!isObj(v)) return false;
      if (Object.keys(v).length === 0) return true; // {} accepts any value
      if (v.type === "null") return true;
      if (Array.isArray(v.type) && v.type.includes("null")) return true;
      return ["anyOf", "oneOf"].some(
        (kw) =>
          Array.isArray(v[kw]) &&
          (v[kw] as unknown[]).some((b) => isObj(b) && b.type === "null"),
      );
    };

    const records: string[] = [];
    const violations: string[] = [];
    eachSchemaNode((node, where) => {
      if (!isRecord(node)) return;
      records.push(where);
      if (!permitsNull(node.unevaluatedProperties)) violations.push(where);
    });

    expect(violations).toEqual([]);
    // Six record members plus Address.geography.
    expect(records.length).toBeGreaterThanOrEqual(7);
  });

  // Root cause 2: inheriting a read schema through `allOf` pulls in fields that
  // skipped the merge-patch transform, so they stay required and non-clearable.
  it("never inherits an un-patched read schema via allOf", () => {
    const violations: string[] = [];
    eachSchemaNode((node, where) => {
      if (!Array.isArray(node.allOf)) return;
      node.allOf.forEach((branch, i) => {
        const ref = isObj(branch) ? branch.$ref : undefined;
        if (typeof ref !== "string" || ref.startsWith("#")) return;
        if (!path.basename(ref).startsWith("OrgPatch"))
          violations.push(`${where}/allOf[${i}] -> ${ref}`);
      });
    });

    expect(violations).toEqual([]);
  });

  it("covers every writable OrganizationBase top-level field (drift guard)", () => {
    const load = (name: string) =>
      yaml.load(
        fs.readFileSync(path.join(Paths.SCHEMAS_DIR, name), "utf-8"),
      ) as { properties: Record<string, unknown> };

    const base = Object.keys(load("OrganizationBase.yaml").properties);
    const patch = Object.keys(load("OrgPatchData.yaml").properties);

    // Read-only id is excluded from the patch model by design; ein/uei/duns
    // are removed as of v0.4 and never coexist with a patch.
    const readOnly = ["id", "ein", "uei", "duns"];
    const writable = base.filter((key) => !readOnly.includes(key));

    expect(patch.sort()).toEqual(writable.sort());
  });
});
