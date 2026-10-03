import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020";
import { Paths } from "./paths";

/** Every published JSON Schema, verbatim, in one Ajv instance. */
const loadJsonSchemas = () => {
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  for (const file of fs.readdirSync(Paths.SCHEMAS_DIR)) {
    if (!file.endsWith(".yaml")) continue;
    const schema = yaml.load(
      fs.readFileSync(path.join(Paths.SCHEMAS_DIR, file), "utf-8"),
    ) as { $id?: string };
    ajv.addSchema(schema, schema.$id ?? file);
  }
  return ajv;
};

/**
 * Read shape of ADR 0030 organization relationships on the published
 * OrganizationBase schema.
 *
 * Per ADR 0024 an absent field means "not provided", `null` means "doesn't
 * apply", and a value means "has a value", so every new optional member must
 * accept all three while still rejecting wrong non-null values. These checks
 * establish shape only: whether a referenced organization exists, and the
 * integrity of the relationship graph, are provider obligations.
 *
 * Validates the published files verbatim with its own Ajv instance, for the
 * same reason as org-patch-data.test.ts.
 */
describe("OrganizationBase relationships read schema", () => {
  const ajv = loadJsonSchemas();
  const validate = ajv.getSchema("OrganizationBase.yaml");

  const org = { id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f", name: "Example" };
  const ref = (id: string, name: string) => ({ id, name });
  const university = ref(
    "6f1d2c3b-4a59-4e68-8a7b-9c0d1e2f3a4b",
    "Example University",
  );
  const school = ref(
    "7a2e3d4c-5b6a-4f79-9b8c-0d1e2f3a4b5c",
    "Example School of Medicine",
  );
  const sponsor = ref(
    "8b3f4e5d-6c7b-4a8a-8c9d-1e2f3a4b5c6d",
    "Example Community Foundation",
  );
  const withRelationships = (relationships: unknown) => ({
    ...org,
    relationships,
  });

  const accepted: Array<[string, object]> = [
    ["omits relationships and dbaNames (not provided)", org],
    [
      "asserts relationships do not apply",
      { ...org, relationships: null, dbaNames: null },
    ],
    [
      "states every relationship member",
      withRelationships({
        parents: {
          parent: [university],
          department: [school],
          chapter: [],
          subsidiary: [university],
          otherParents: { campus: [university] },
        },
        fiscalSponsor: sponsor,
        successor: sponsor,
        duplicateOf: university,
        otherRelationships: { affiliate: [sponsor] },
      }),
    ],
    [
      "holds a structural parent and a different fiscal sponsor together",
      withRelationships({
        parents: { department: [university] },
        fiscalSponsor: sponsor,
      }),
    ],
    [
      "lists several targets under one hierarchy kind",
      withRelationships({ parents: { department: [university, school] } }),
    ],
    [
      "asserts individual members do not apply",
      withRelationships({
        parents: {
          parent: null,
          department: null,
          chapter: null,
          subsidiary: null,
          otherParents: null,
        },
        fiscalSponsor: null,
        successor: null,
        duplicateOf: null,
        otherRelationships: null,
      }),
    ],
    ["asserts hierarchy does not apply", withRelationships({ parents: null })],
    [
      "carries a target's matching identifiers",
      withRelationships({
        parents: {
          department: [
            {
              ...university,
              identifiers: {
                "org:us:ein": {
                  registry: { code: "org:us:ein" },
                  id: "123456789",
                },
              },
            },
          ],
        },
      }),
    ],
    ["lists current DBA names", { ...org, dbaNames: ["Example Thrift"] }],
    ["lists no DBA names", { ...org, dbaNames: [] }],
  ];

  it.each(accepted)("accepts: %s", (_name, payload) => {
    expect(validate).toBeDefined();
    expect(validate!(payload)).toBe(true);
  });

  const rejected: Array<[string, object]> = [
    ["relationships as a string", withRelationships("none")],
    ["relationships as an array", withRelationships([university])],
    [
      "a single object where a hierarchy array is required",
      withRelationships({ parents: { department: university } }),
    ],
    [
      "a hierarchy target without its name",
      withRelationships({ parents: { department: [{ id: university.id }] } }),
    ],
    [
      "a hierarchy target without its id",
      withRelationships({ parents: { department: [{ name: "Example" }] } }),
    ],
    [
      "a null element inside a hierarchy array",
      withRelationships({ parents: { department: [null] } }),
    ],
    [
      "an array where the singular fiscalSponsor is required",
      withRelationships({ fiscalSponsor: [sponsor, university] }),
    ],
    [
      "a division kind, which department covers",
      withRelationships({ parents: { division: [university] } }),
    ],
    [
      "a nonhierarchical label outside otherRelationships",
      withRelationships({ member: [sponsor] }),
    ],
    [
      "an inline kind on a target reference",
      withRelationships({
        parents: { parent: [{ ...university, kind: "department" }] },
      }),
    ],
    [
      "a single object as a custom label's value",
      withRelationships({ parents: { otherParents: { campus: university } } }),
    ],
    [
      "a null custom label value",
      withRelationships({ otherRelationships: { affiliate: null } }),
    ],
    ["DBA names as a string", { ...org, dbaNames: "Example Thrift" }],
    ["a null DBA name", { ...org, dbaNames: [null] }],
  ];

  it.each(rejected)("rejects: %s", (_name, payload) => {
    expect(validate).toBeDefined();
    expect(validate!(payload)).toBe(false);
  });

  /**
   * The relationships guide is the reviewable preview of this draft, so each
   * of its titled JSON examples must validate: `Organization:` blocks as an
   * `OrganizationBase` read and `Patch:` blocks as an `OrgPatchData` patch.
   */
  describe("guide examples", () => {
    const guide = fs.readFileSync(
      path.join(
        Paths.WEBSITE_ROOT,
        "src/content/docs/guides/organization-relationships.mdx",
      ),
      "utf-8",
    );
    const blocks = [
      ...guide.matchAll(
        /```json title="(Organization|Patch): ([^"]+)"\n([\s\S]*?)```/g,
      ),
    ].map(([, kind, title, body]) => [kind, title, JSON.parse(body)] as const);

    it("finds every titled example", () => {
      expect(blocks.filter(([kind]) => kind === "Organization")).toHaveLength(
        9,
      );
      expect(blocks.filter(([kind]) => kind === "Patch")).toHaveLength(3);
    });

    it.each(blocks)("%s: %s", (kind, _title, payload) => {
      const schema =
        kind === "Organization" ? "OrganizationBase.yaml" : "OrgPatchData.yaml";
      const check = ajv.getSchema(schema)!;
      expect(check(payload), JSON.stringify(check.errors)).toBe(true);
    });
  });
});

/**
 * The same null semantics in the published OpenAPI 3.0 document, which is
 * what an OpenAPI-validating client or server checks. OpenAPI 3.0 has no null
 * type: `nullable: true` admits null only beside a `type` in the same schema,
 * so a nullable `$ref` wrapped in `allOf` still rejects null through the
 * referenced component. Ajv applies `nullable` that way. The OpenAPI
 * components are not sealed, so unknown-property cases stay with the JSON
 * Schema checks above.
 *
 * Only the components the two models reach are loaded: other components carry
 * form examples whose repeated `$id` Ajv would treat as conflicting schemas.
 */
describe("OrganizationBase and OrgPatchData relationships in OpenAPI 3.0", () => {
  const { schemas } = (
    yaml.load(
      fs.readFileSync(
        path.join(Paths.OPENAPI_DIR, "openapi.0.5.0.yaml"),
        "utf-8",
      ),
    ) as { components: { schemas: Record<string, object> } }
  ).components;
  const reached: Record<string, object> = {};
  const reach = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key !== "$ref") reach(value);
      else {
        const name = String(value).replace("#/components/schemas/", "");
        if (!(name in reached)) reach((reached[name] = schemas[name]));
      }
    }
  };
  reach({ $ref: "#/components/schemas/CommonGrants.Models.OrganizationBase" });
  reach({ $ref: "#/components/schemas/CommonGrants.Models.OrgPatchData" });

  const ajv = new Ajv({
    strict: false,
    validateFormats: false,
    validateSchema: false,
  });
  ajv.addSchema({ components: { schemas: reached } }, "openapi");
  const component = (name: string) =>
    ajv.getSchema(`openapi#/components/schemas/CommonGrants.Models.${name}`)!;

  const id = "6f1d2c3b-4a59-4e68-8a7b-9c0d1e2f3a4b";
  const target = { id, name: "Example University" };
  const read = (relationships: unknown) => ({
    id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f",
    name: "Example",
    relationships,
  });
  const patch = (relationships: unknown) => ({ relationships });

  const cases: Array<
    [string, "OrganizationBase" | "OrgPatchData", object, boolean]
  > = [
    ["read: null relationships", "OrganizationBase", read(null), true],
    [
      "read: null parents and singular links",
      "OrganizationBase",
      read({
        parents: null,
        fiscalSponsor: null,
        successor: null,
        duplicateOf: null,
      }),
      true,
    ],
    [
      "read: a department and a fiscal sponsor",
      "OrganizationBase",
      read({ parents: { department: [target] }, fiscalSponsor: target }),
      true,
    ],
    [
      "read: relationships as a string",
      "OrganizationBase",
      read("none"),
      false,
    ],
    [
      "read: fiscalSponsor as an array",
      "OrganizationBase",
      read({ fiscalSponsor: [target] }),
      false,
    ],
    [
      "read: fiscalSponsor without its name",
      "OrganizationBase",
      read({ fiscalSponsor: { id } }),
      false,
    ],
    [
      "read: department target without its id",
      "OrganizationBase",
      read({ parents: { department: [{ name: "Example" }] } }),
      false,
    ],
    ["patch: remove all relationships", "OrgPatchData", patch(null), true],
    [
      "patch: remove all hierarchy",
      "OrgPatchData",
      patch({ parents: null }),
      true,
    ],
    [
      "patch: remove every singular link",
      "OrgPatchData",
      patch({ fiscalSponsor: null, successor: null, duplicateOf: null }),
      true,
    ],
    [
      "patch: clear retained singular metadata",
      "OrgPatchData",
      patch({ fiscalSponsor: { name: null, identifiers: null } }),
      true,
    ],
    [
      "patch: ID-only singular and hierarchy targets",
      "OrgPatchData",
      patch({ fiscalSponsor: { id }, parents: { department: [{ id }] } }),
      true,
    ],
    ["patch: relationships as a number", "OrgPatchData", patch(5), false],
    [
      "patch: fiscalSponsor as an array",
      "OrgPatchData",
      patch({ fiscalSponsor: [{ id }] }),
      false,
    ],
    [
      "patch: null for a singular target's id",
      "OrgPatchData",
      patch({ duplicateOf: { id: null } }),
      false,
    ],
    [
      "patch: hierarchy target without its id",
      "OrgPatchData",
      patch({ parents: { department: [{ name: "Example" }] } }),
      false,
    ],
  ];

  it.each(cases)("%s", (_name, model, payload, valid) => {
    const check = component(model);
    expect(check(payload), JSON.stringify(check.errors)).toBe(valid);
  });

  // A singular target merges, so `null` deletes one identifier, or one
  // identifier's `id`, from it. Both dialects must agree, as must populated
  // and wrong non-null controls. A replaced array has nothing to merge into,
  // so its targets' IDs stay non-null.
  const jsonSchemaPatch = loadJsonSchemas().getSchema("OrgPatchData.yaml")!;
  const populated = {
    "org:us:ein": { registry: { code: "org:us:ein" }, id: "123456789" },
    "org:us:uei": { id: "AB0123456789" },
    "org:xi:duns": { id: "123456789" },
    systemId: { id },
    otherIds: { "org:xi:foo": { id: "foo-1" } },
  };
  const scalarMembers = ["org:us:ein", "org:us:uei", "org:xi:duns", "systemId"];
  const identifierCases = ["fiscalSponsor", "successor", "duplicateOf"].flatMap(
    (link): Array<[string, object, boolean]> => {
      const write = (identifiers: unknown) =>
        patch({ [link]: { identifiers } });
      return [
        ...scalarMembers.map((member): [string, object, boolean] => [
          `${link}: delete ${member}`,
          write({ [member]: null }),
          true,
        ]),
        ...scalarMembers.map((member): [string, object, boolean] => [
          `${link}: delete ${member}'s id`,
          write({ [member]: { id: null } }),
          true,
        ]),
        [
          `${link}: an EIN id of eight digits`,
          write({ "org:us:ein": { id: "12345678" } }),
          false,
        ],
        [
          `${link}: a lowercase UEI id`,
          write({ "org:us:uei": { id: "ab0123456789" } }),
          false,
        ],
        [
          `${link}: a DUNS id with a letter`,
          write({ "org:xi:duns": { id: "12345678A" } }),
          false,
        ],
        [
          `${link}: a numeric systemId id`,
          write({ systemId: { id: 5 } }),
          false,
        ],
        [
          `${link}: delete an otherIds key`,
          write({ otherIds: { "org:xi:foo": null } }),
          true,
        ],
        [`${link}: populated identifiers`, write(populated), true],
        [
          `${link}: an identifier as a string`,
          write({ "org:us:ein": "123456789" }),
          false,
        ],
        [`${link}: systemId as an array`, write({ systemId: [] }), false],
        [
          `${link}: an otherIds entry as a number`,
          write({ otherIds: { "org:xi:foo": 5 } }),
          false,
        ],
      ];
    },
  );
  identifierCases.push(
    [
      "department: null for a target's id",
      patch({ parents: { department: [{ id: null }] } }),
      false,
    ],
    ...scalarMembers.map((member): [string, object, boolean] => [
      `department: null for ${member}'s id`,
      patch({
        parents: {
          department: [{ id, identifiers: { [member]: { id: null } } }],
        },
      }),
      false,
    ]),
  );

  it.each(identifierCases)("%s", (_name, payload, valid) => {
    const openApi = component("OrgPatchData");
    expect(jsonSchemaPatch(payload), "JSON Schema").toBe(valid);
    expect(openApi(payload), `OpenAPI ${JSON.stringify(openApi.errors)}`).toBe(
      valid,
    );
  });

  // OpenAPI 3.0 applies `nullable` only beside a `type`, so a nullable node
  // that also references a component still rejects `null`. None may be
  // reachable from the relationship patch shapes, through any component.
  it("reaches no nullable reference from patch relationships", () => {
    const sites: string[] = [];
    const followed = new Set<string>();
    const walk = (node: unknown, where: string): void => {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      const branches = ["allOf", "anyOf", "oneOf"].flatMap(
        (kw) => (n[kw] as Array<Record<string, unknown>>) ?? [],
      );
      if (n.nullable === true && [n, ...branches].some((b) => "$ref" in b))
        sites.push(where);
      for (const [key, value] of Object.entries(n)) {
        if (key !== "$ref") walk(value, `${where}/${key}`);
        else {
          const name = String(value).replace("#/components/schemas/", "");
          if (!followed.has(name)) {
            followed.add(name);
            walk(schemas[name], name);
          }
        }
      }
    };
    const patchData = schemas["CommonGrants.Models.OrgPatchData"] as {
      properties: { relationships: object };
    };
    walk(patchData.properties.relationships, "relationships");

    expect(sites).toEqual([]);
    // Guards against a walk that never reaches the replaced-array target.
    expect(followed).toContain(
      "CommonGrants.Patch.OrgPatchOrgTargetRefReplaceOnly",
    );
  });
});
