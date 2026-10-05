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

  /**
   * ADR 0030 organization relationships (v0.5). These pin the patch shape
   * only: each list is an array a patch replaces whole, `null` removes the
   * addressed list or every list, omitted lists are untouched, and an entry's
   * `org` can be named by its writable `id` alone. Validation never fills in
   * the other organization's `name` or `identifiers`.
   */
  describe("organization relationships (ADR 0030)", () => {
    const NETWORK = "01912a8b-7c3d-7891-abcd-ef1234567891";
    const FOUNDATION = "01912a8b-7c3d-7892-abcd-ef1234567892";
    const LISTS: Array<[string, string]> = [
      ["parents", "chapter"],
      ["children", "fiscalSponsor"],
      ["succeededBy", "split"],
      ["succeeds", "merger"],
      ["recordReplacedBy", "duplicate"],
      ["recordReplaces", "merged"],
      ["otherRelationships", "custom"],
    ];
    const kind = (value: string) =>
      value === "custom" ? { value, customValue: "partner" } : { value };

    const accepted: Array<[string, object]> = [
      ...LISTS.map(([list, value]): [string, object] => [
        `replaces ${list} with an ID-only entry`,
        {
          relationships: {
            [list]: [{ org: { id: NETWORK }, kind: kind(value) }],
          },
        },
      ]),
      ...LISTS.map(([list]): [string, object] => [
        `removes ${list} with null`,
        { relationships: { [list]: null } },
      ]),
      ...LISTS.map(([list]): [string, object] => [
        `sends an empty ${list} list`,
        { relationships: { [list]: [] } },
      ]),
      ["removes all relationships with null", { relationships: null }],
      [
        "sends an entry with only org",
        { relationships: { otherRelationships: [{ org: { id: NETWORK } }] } },
      ],
      [
        "sends optional org name and identifiers",
        {
          relationships: {
            parents: [
              {
                org: {
                  id: FOUNDATION,
                  name: "Riverside Community Foundation",
                  identifiers: {
                    "org:us:ein": {
                      registry: { code: "org:us:ein" },
                      id: "123456789",
                    },
                  },
                },
              },
            ],
          },
        },
      ],
      [
        "ends a sponsorship by resending the whole parents list",
        {
          relationships: {
            parents: [
              { org: { id: NETWORK }, kind: { value: "chapter" } },
              {
                org: { id: FOUNDATION },
                kind: { value: "fiscalSponsor" },
                startDate: "2024-07-01",
                endDate: "2026-06-30",
                status: "inactive",
              },
            ],
          },
        },
      ],
      [
        "sends null kind, dates, and status in an entry",
        {
          relationships: {
            parents: [
              {
                org: { id: NETWORK },
                kind: null,
                startDate: null,
                endDate: null,
                status: null,
              },
            ],
          },
        },
      ],
      [
        "replaces two lists together",
        {
          relationships: {
            parents: [{ org: { id: NETWORK } }],
            succeededBy: [
              { org: { id: FOUNDATION }, kind: { value: "split" } },
            ],
          },
        },
      ],
      ["replaces the DBA names", { dbaNames: ["Example Thrift", "Example"] }],
      ["sends empty DBA names", { dbaNames: [] }],
      ["removes the DBA names", { dbaNames: null }],
    ];

    it.each(accepted)("accepts: %s", (_name, patch) => {
      expect(validate!(patch), JSON.stringify(validate!.errors)).toBe(true);
    });

    const rejected: Array<[string, object]> = [
      [
        "an entry without org",
        { relationships: { parents: [{ kind: { value: "chapter" } }] } },
      ],
      [
        "an org without an id",
        {
          relationships: {
            parents: [{ org: { name: "National Reading Network" } }],
          },
        },
      ],
      [
        "a null org id",
        { relationships: { parents: [{ org: { id: null } }] } },
      ],
      ["a null org", { relationships: { parents: [{ org: null }] } }],
      [
        "a single entry where a list is required",
        { relationships: { parents: { org: { id: NETWORK } } } },
      ],
      ["a null entry in a list", { relationships: { parents: [null] } }],
      [
        "a bare reference instead of an entry",
        { relationships: { parents: [{ id: NETWORK }] } },
      ],
      [
        "kind beside the reference's fields",
        {
          relationships: {
            parents: [{ org: { id: NETWORK, kind: { value: "chapter" } } }],
          },
        },
      ],
      [
        "an unknown member on an entry",
        {
          relationships: {
            parents: [{ org: { id: NETWORK }, category: "parent" }],
          },
        },
      ],
      [
        "parents grouped by kind",
        { relationships: { parents: { chapter: [{ id: NETWORK }] } } },
      ],
      [
        "an unknown relationship list",
        { relationships: { fiscalSponsor: { id: FOUNDATION } } },
      ],
      [
        "otherRelationships keyed by label",
        {
          relationships: {
            otherRelationships: { affiliate: [{ id: NETWORK }] },
          },
        },
      ],
      [
        "a kind as a bare string",
        {
          relationships: {
            parents: [{ org: { id: NETWORK }, kind: "chapter" }],
          },
        },
      ],
      [
        "a kind from another category",
        {
          relationships: {
            succeededBy: [{ org: { id: NETWORK }, kind: { value: "chapter" } }],
          },
        },
      ],
      [
        "a status outside active and inactive",
        {
          relationships: {
            parents: [{ org: { id: NETWORK }, status: "pending" }],
          },
        },
      ],
      [
        "a null identifier in a replaced entry's org",
        {
          relationships: {
            parents: [
              { org: { id: NETWORK, identifiers: { "org:us:ein": null } } },
            ],
          },
        },
      ],
      ["a non-string DBA name", { dbaNames: [42] }],
      ["a single string for DBA names", { dbaNames: "Example Thrift" }],
    ];

    it.each(rejected)("rejects: %s", (_name, patch) => {
      expect(validate!(patch)).toBe(false);
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
  // per-key deletion. A `ReplaceOnly` schema is an array element that a patch
  // replaces whole, so it has nothing to delete keys from and is exempt.
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
      if (!isRecord(node) || where.includes("ReplaceOnly")) return;
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

  // `Patch.OrgRelationships`, the patch entries, and `Patch.OrgTargetRef` are
  // redeclared by hand rather than spread, so a member added to the read
  // models would otherwise be silently impossible to patch. Each written entry
  // must match its read entry apart from `org`, and the written `org` must
  // carry the read `OrgRef` members and the read identifier shapes.
  it("covers every relationship member and target field (drift guard)", () => {
    type Props = { properties: Record<string, Node>; required?: string[] };
    const load = (name: string) =>
      yaml.load(
        fs.readFileSync(path.join(Paths.SCHEMAS_DIR, name), "utf-8"),
      ) as Props & { $defs: Record<string, Props> };
    const patchData = load("OrgPatchData.yaml");
    // Follows a property, or an array's items, to its object schema: inline,
    // a local definition, or a published file.
    const defOf = (property: Node): Props => {
      const branches = [property, ...((property.anyOf as Node[]) ?? [])];
      const items = branches.map((b) => (isObj(b.items) ? b.items : b));
      const inline = items.find((b) => isObj(b.properties));
      if (inline) return inline as Props;
      const ref = items.find((b) => typeof b.$ref === "string")!.$ref as string;
      return ref.startsWith("#/$defs/")
        ? patchData.$defs[ref.replace("#/$defs/", "")]
        : load(ref);
    };
    const keys = (props: Props) => Object.keys(props.properties).sort();

    const relationships = defOf(patchData.properties.relationships);
    const readRelationships = load("OrgRelationships.yaml");
    expect(keys(relationships)).toEqual(keys(readRelationships));

    const readIdNames = [
      ...keys(load("OrgIds.yaml")),
      ...keys(load("IdentifierCollection.yaml")),
    ].sort();
    const readIdFiles: Record<string, string> = {
      "org:us:ein": "OrgIdEin.yaml",
      "org:us:uei": "OrgIdUei.yaml",
      "org:xi:duns": "OrgIdDuns.yaml",
      systemId: "SystemId.yaml",
      otherIds: "Identifier.yaml",
    };
    expect(Object.keys(readIdFiles).sort()).toEqual(readIdNames);

    for (const list of keys(readRelationships)) {
      const entry = defOf(relationships.properties[list]);
      const readEntry = defOf(readRelationships.properties[list]);
      const { org, ...members } = entry.properties;
      const { org: readOrg, ...readMembers } = readEntry.properties;
      expect(readOrg, list).toBeDefined();
      expect(members, list).toEqual(readMembers);
      expect(entry.required, list).toEqual(readEntry.required);

      const target = defOf(org);
      expect(keys(target), list).toEqual(keys(load("OrgRef.yaml")));
      expect(target.required, list).toEqual(["id"]);
      const ids = defOf(target.properties.identifiers);
      expect(keys(ids), list).toEqual(readIdNames);
      for (const [name, file] of Object.entries(readIdFiles)) {
        // `otherIds` is a record, so its member is the record's value schema.
        const property = ids.properties[name];
        const member =
          name === "otherIds"
            ? defOf(property.unevaluatedProperties as Node)
            : defOf(property);
        expect(member.properties, `${list} ${name}`).toEqual(
          load(file).properties,
        );
      }
    }
  });
});
