import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020";
import { Paths } from "./paths";

/** A real `YYYY-MM-DD` calendar date, not just the shape. */
const isCalendarDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

/**
 * Every published JSON Schema, verbatim, in one Ajv instance. With
 * `checkDates`, `format: date` is enforced; other formats accept any string.
 */
const loadJsonSchemas = (checkDates = false) => {
  const ajv = new Ajv2020({
    strict: false,
    validateFormats: checkDates,
    formats: {
      date: isCalendarDate,
      "date-time": true,
      time: true,
      uuid: true,
      email: true,
      uri: true,
    },
  });
  for (const file of fs.readdirSync(Paths.SCHEMAS_DIR)) {
    if (!file.endsWith(".yaml")) continue;
    const schema = yaml.load(
      fs.readFileSync(path.join(Paths.SCHEMAS_DIR, file), "utf-8"),
    ) as { $id?: string };
    ajv.addSchema(schema, schema.$id ?? file);
  }
  return ajv;
};

const HIERARCHY_KINDS = [
  "chapter",
  "department",
  "branch",
  "subsidiary",
  "fiscalSponsor",
  "dba",
];
const SUCCESSION_KINDS = ["merger", "acquisition", "divestiture", "split"];
const RECORD_KINDS = ["duplicate", "merged"];
const LISTS: Array<[string, string[]]> = [
  ["parents", HIERARCHY_KINDS],
  ["children", HIERARCHY_KINDS],
  ["succeededBy", SUCCESSION_KINDS],
  ["succeeds", SUCCESSION_KINDS],
  ["recordReplacedBy", RECORD_KINDS],
  ["recordReplaces", RECORD_KINDS],
  ["otherRelationships", []],
];

/**
 * Read shape of ADR 0030 organization relationships on the published
 * OrganizationBase schema.
 *
 * Every optional member is omitted or carries a value; none accepts `null`.
 * `org` and list entries are required wherever they appear. These checks establish
 * shape only; the schema says nothing about whether the other organization
 * exists or whether the two directions agree.
 *
 * Validates the published files verbatim with its own Ajv instance, for the
 * same reason as org-patch-data.test.ts.
 */
describe("OrganizationBase relationships read schema", () => {
  const ajv = loadJsonSchemas();
  const validate = ajv.getSchema("OrganizationBase.yaml");

  const org = { id: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f", name: "Example" };
  const network = {
    id: "01912a8b-7c3d-7891-abcd-ef1234567891",
    name: "National Reading Network",
  };
  const foundation = {
    id: "01912a8b-7c3d-7892-abcd-ef1234567892",
    name: "Riverside Community Foundation",
  };
  const withRelationships = (relationships: unknown) => ({
    ...org,
    relationships,
  });
  const entry = (kind?: string, extra: object = {}) => ({
    org: network,
    ...(kind ? { kind: { value: kind } } : {}),
    ...extra,
  });

  const accepted: Array<[string, object]> = [
    ["omits relationships and dbaNames", org],
    [
      "an entry with only org in every list",
      withRelationships(
        Object.fromEntries(LISTS.map(([list]) => [list, [{ org: network }]])),
      ),
    ],
    [
      "empty lists",
      withRelationships(Object.fromEntries(LISTS.map(([list]) => [list, []]))),
    ],
    ...LISTS.flatMap(([list, kinds]) =>
      kinds.map((kind): [string, object] => [
        `${list}: standard kind ${kind}`,
        withRelationships({ [list]: [entry(kind)] }),
      ]),
    ),
    ...LISTS.map(([list]): [string, object] => [
      `${list}: a custom kind without a description`,
      withRelationships({
        [list]: [
          { org: network, kind: { value: "custom", customValue: "region" } },
        ],
      }),
    ]),
    [
      "a custom kind with a description",
      withRelationships({
        otherRelationships: [
          {
            org: foundation,
            kind: {
              value: "custom",
              customValue: "networkMember",
              description: "Belongs to the network without being a chapter",
            },
          },
        ],
      }),
    ],
    [
      "a chapter parent and a fiscal sponsor in one parents list",
      withRelationships({
        parents: [
          entry("chapter"),
          {
            org: foundation,
            kind: { value: "fiscalSponsor" },
            startDate: "2024-07-01",
            status: "active",
          },
        ],
      }),
    ],
    [
      "a parent with no kind beside one with a kind",
      withRelationships({ parents: [{ org: foundation }, entry("chapter")] }),
    ],
    [
      "children only, with no parents stated",
      withRelationships({ children: [entry("chapter")] }),
    ],
    [
      "succeeds only, with no successor stated",
      withRelationships({ succeeds: [entry("merger")] }),
    ],
    [
      "recordReplaces only",
      withRelationships({ recordReplaces: [entry("duplicate")] }),
    ],
    [
      "two successors from a split",
      withRelationships({
        succeededBy: [
          entry("split", { startDate: "2026-01-01" }),
          {
            org: foundation,
            kind: { value: "split" },
            startDate: "2026-01-01",
          },
        ],
      }),
    ],
    [
      "every optional member of an entry",
      withRelationships({
        parents: [
          entry("fiscalSponsor", {
            startDate: "2024-07-01",
            endDate: "2026-06-30",
            status: "inactive",
          }),
        ],
      }),
    ],
    [
      "a past endDate with no status (status is never inferred)",
      withRelationships({
        parents: [entry("fiscalSponsor", { endDate: "2020-01-01" })],
      }),
    ],
    [
      "status active with a past endDate (no required combination)",
      withRelationships({
        parents: [
          entry("fiscalSponsor", { endDate: "2020-01-01", status: "active" }),
        ],
      }),
    ],
    [
      "an org that carries identifiers",
      withRelationships({
        parents: [
          {
            org: {
              ...network,
              identifiers: {
                "org:us:ein": {
                  registry: { code: "org:us:ein" },
                  id: "123456789",
                },
              },
            },
          },
        ],
      }),
    ],
    ["lists current DBA names", { ...org, dbaNames: ["Example Thrift"] }],
    ["lists no DBA names", { ...org, dbaNames: [] }],
  ];

  it.each(accepted)("accepts: %s", (_name, payload) => {
    expect(validate).toBeDefined();
    expect(validate!(payload), JSON.stringify(validate!.errors)).toBe(true);
  });

  const rejected: Array<[string, object]> = [
    ["relationships as a string", withRelationships("none")],
    ["relationships as an array", withRelationships([entry()])],
    [
      "a single entry where a list is required",
      withRelationships({ parents: entry("chapter") }),
    ],
    [
      "an entry without org",
      withRelationships({ parents: [{ kind: { value: "chapter" } }] }),
    ],
    ["a null org", withRelationships({ parents: [{ org: null }] })],
    [
      "an org without its name",
      withRelationships({ parents: [{ org: { id: network.id } }] }),
    ],
    [
      "an org without its id",
      withRelationships({ parents: [{ org: { name: network.name } }] }),
    ],
    ["a null entry", withRelationships({ parents: [null] })],
    [
      "a bare reference instead of an entry",
      withRelationships({ parents: [network] }),
    ],
    [
      "kind beside the reference's fields",
      withRelationships({
        parents: [{ ...network, kind: { value: "chapter" } }],
      }),
    ],
    [
      "an unknown member on an entry",
      withRelationships({
        parents: [entry("chapter", { category: "parent" })],
      }),
    ],
    [
      "parents grouped by kind",
      withRelationships({ parents: { chapter: [network] } }),
    ],
    [
      "an unknown relationship list",
      withRelationships({ fiscalSponsor: [entry()] }),
    ],
    [
      "otherRelationships keyed by label",
      withRelationships({ otherRelationships: { affiliate: [network] } }),
    ],
    [
      "a kind as a bare string",
      withRelationships({ parents: [{ org: network, kind: "chapter" }] }),
    ],
    [
      "a kind without a value",
      withRelationships({
        parents: [{ org: network, kind: { customValue: "region" } }],
      }),
    ],
    [
      "a generic parent kind",
      withRelationships({ parents: [entry("parent")] }),
    ],
    [
      "a division kind outside custom",
      withRelationships({ parents: [entry("division")] }),
    ],
    [
      "a succession kind in parents",
      withRelationships({ parents: [entry("merger")] }),
    ],
    [
      "a hierarchy kind in succeededBy",
      withRelationships({ succeededBy: [entry("chapter")] }),
    ],
    [
      "a record kind in succeededBy",
      withRelationships({ succeededBy: [entry("merged")] }),
    ],
    [
      "a succession kind in recordReplacedBy",
      withRelationships({ recordReplacedBy: [entry("merger")] }),
    ],
    [
      "a standard named-list kind in otherRelationships",
      withRelationships({ otherRelationships: [entry("chapter")] }),
    ],
    [
      "a status outside active and inactive",
      withRelationships({ parents: [entry("chapter", { status: "pending" })] }),
    ],
    [
      "a boolean status",
      withRelationships({ parents: [entry("chapter", { status: true })] }),
    ],
    [
      "a numeric startDate",
      withRelationships({ parents: [entry("chapter", { startDate: 2024 })] }),
    ],
    ["DBA names as a string", { ...org, dbaNames: "Example Thrift" }],
    ["a null DBA name", { ...org, dbaNames: [null] }],
  ];

  it.each(rejected)("rejects: %s", (_name, payload) => {
    expect(validate).toBeDefined();
    expect(validate!(payload)).toBe(false);
  });

  // `startDate` and `endDate` are `format: date`. The suites above skip
  // formats, as the published files are also used by validators that do, so
  // the dates are checked here with formats on.
  describe("relationship dates with formats checked", () => {
    const checked = loadJsonSchemas(true).getSchema("OrganizationBase.yaml")!;
    const dated = (startDate: string) =>
      withRelationships({ parents: [entry("fiscalSponsor", { startDate })] });

    it.each([["2024-07-01"], ["2024-02-29"]])("accepts %s", (date) => {
      expect(checked(dated(date)), JSON.stringify(checked.errors)).toBe(true);
    });

    it.each([
      ["2024-13-01"],
      ["2023-02-29"],
      ["2024-7-1"],
      ["07/01/2024"],
      ["2024-07-01T00:00:00Z"],
    ])("rejects %s", (date) => {
      expect(checked(dated(date))).toBe(false);
    });
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
    const checked = loadJsonSchemas(true);

    it("finds every titled example", () => {
      expect(blocks.filter(([kind]) => kind === "Organization")).toHaveLength(
        9,
      );
      expect(blocks.filter(([kind]) => kind === "Patch")).toHaveLength(3);
    });

    it.each(blocks)("%s: %s", (kind, _title, payload) => {
      const schema =
        kind === "Organization" ? "OrganizationBase.yaml" : "OrgPatchData.yaml";
      const check = checked.getSchema(schema)!;
      expect(check(payload), JSON.stringify(check.errors)).toBe(true);
    });
  });
});

/**
 * The same shapes in the published OpenAPI 3.0 document, which is what an
 * OpenAPI-validating client or server checks. OpenAPI 3.0 has no null
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
  const jsonSchemas = loadJsonSchemas();

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
    [
      "read: an entry with only org",
      "OrganizationBase",
      read({ parents: [{ org: target }] }),
      true,
    ],
    [
      "read: a fully stated entry",
      "OrganizationBase",
      read({
        parents: [
          {
            org: target,
            kind: { value: "fiscalSponsor" },
            startDate: "2024-07-01",
            endDate: "2026-06-30",
            status: "inactive",
          },
        ],
      }),
      true,
    ],
    [
      "read: relationships as a string",
      "OrganizationBase",
      read("none"),
      false,
    ],
    [
      "read: a list as a single entry",
      "OrganizationBase",
      read({ parents: { org: target } }),
      false,
    ],
    [
      "read: an org without its name",
      "OrganizationBase",
      read({ parents: [{ org: { id } }] }),
      false,
    ],
    [
      "read: a null org",
      "OrganizationBase",
      read({ parents: [{ org: null }] }),
      false,
    ],
    [
      "read: a kind from another category",
      "OrganizationBase",
      read({ succeededBy: [{ org: target, kind: { value: "chapter" } }] }),
      false,
    ],
    [
      "read: a status outside active and inactive",
      "OrganizationBase",
      read({ parents: [{ org: target, status: "pending" }] }),
      false,
    ],
    [
      "patch: an ID-only org with every optional member",
      "OrgPatchData",
      patch({
        parents: [
          {
            org: { id },
            kind: { value: "fiscalSponsor" },
            startDate: "2024-07-01",
            endDate: "2026-06-30",
            status: "inactive",
          },
        ],
      }),
      true,
    ],
    ["patch: relationships as a number", "OrgPatchData", patch(5), false],
    [
      "patch: a list as a single entry",
      "OrgPatchData",
      patch({ parents: { org: { id } } }),
      false,
    ],
    [
      "patch: an entry without org",
      "OrgPatchData",
      patch({ parents: [{ kind: { value: "chapter" } }] }),
      false,
    ],
    [
      "patch: an org without its id",
      "OrgPatchData",
      patch({ parents: [{ org: { name: "Example" } }] }),
      false,
    ],
    [
      "patch: a null org id",
      "OrgPatchData",
      patch({ parents: [{ org: { id: null } }] }),
      false,
    ],
  ];

  // A read never carries `null`. In a patch, `null` removes `relationships`,
  // one list, or `dbaNames`, as in JSON Merge Patch; an entry in a replaced
  // list has nothing to merge into, so its optional members are omitted
  // rather than `null`.
  const entryMembers = ["kind", "startDate", "endDate", "status"];
  const nullCases: typeof cases = [
    ["read: null relationships", "OrganizationBase", read(null), false],
    [
      "read: null dbaNames",
      "OrganizationBase",
      { ...read({}), dbaNames: null },
      false,
    ],
    ...LISTS.map(([list]): (typeof cases)[number] => [
      `read: null ${list}`,
      "OrganizationBase",
      read({ [list]: null }),
      false,
    ]),
    ...entryMembers.map((member): (typeof cases)[number] => [
      `read: null ${member} in an entry`,
      "OrganizationBase",
      read({ parents: [{ org: target, [member]: null }] }),
      false,
    ]),
    ["patch: remove all relationships", "OrgPatchData", patch(null), true],
    ["patch: remove dbaNames", "OrgPatchData", { dbaNames: null }, true],
    ...LISTS.map(([list]): (typeof cases)[number] => [
      `patch: remove ${list}`,
      "OrgPatchData",
      patch({ [list]: null }),
      true,
    ]),
    [
      "patch: remove every list",
      "OrgPatchData",
      patch(Object.fromEntries(LISTS.map(([list]) => [list, null]))),
      true,
    ],
    ...entryMembers.map((member): (typeof cases)[number] => [
      `patch: null ${member} in a replaced entry`,
      "OrgPatchData",
      patch({ parents: [{ org: { id }, [member]: null }] }),
      false,
    ]),
  ];

  it.each([...cases, ...nullCases])("%s", (_name, model, payload, valid) => {
    const check = component(model);
    expect(check(payload), JSON.stringify(check.errors)).toBe(valid);
    const json = jsonSchemas.getSchema(`${model}.yaml`)!;
    expect(json(payload), "JSON Schema agrees").toBe(valid);
  });

  // `status` is `active`, `inactive`, or absent in every list, in a read and
  // in an entry of a replaced list, and both dialects agree.
  const statuses: Array<[unknown, boolean]> = [
    ["active", true],
    ["inactive", true],
    [null, false],
    [undefined, true],
    ["pending", false],
    ["Active", false],
    ["", false],
    [true, false],
    [0, false],
  ];
  const statusCases = LISTS.flatMap(([list]) =>
    (["OrganizationBase", "OrgPatchData"] as const).flatMap((model) =>
      statuses.map(
        ([status, valid]): [string, typeof model, object, boolean] => {
          const org = model === "OrganizationBase" ? target : { id };
          const entry = status === undefined ? { org } : { org, status };
          const wrap = model === "OrganizationBase" ? read : patch;
          const label =
            status === undefined ? "omitted" : JSON.stringify(status);
          return [
            `${model} ${list}: status ${label}`,
            model,
            wrap({ [list]: [entry] }),
            valid,
          ];
        },
      ),
    ),
  );

  it.each(statusCases)("%s", (_name, model, payload, valid) => {
    const openApi = component(model);
    expect(
      jsonSchemas.getSchema(`${model}.yaml`)!(payload),
      "JSON Schema",
    ).toBe(valid);
    expect(openApi(payload), `OpenAPI ${JSON.stringify(openApi.errors)}`).toBe(
      valid,
    );
  });

  // An entry in a replaced list has nothing to merge into, so its org's
  // identifiers are stored as written: no `null` member or `id`, and the
  // same constraints as a read. Both dialects must agree.
  const populated = {
    "org:us:ein": { registry: { code: "org:us:ein" }, id: "123456789" },
    "org:us:uei": { id: "AB0123456789" },
    "org:xi:duns": { id: "123456789" },
    systemId: { id },
    otherIds: { "org:xi:foo": { id: "foo-1" } },
  };
  const scalarMembers = ["org:us:ein", "org:us:uei", "org:xi:duns", "systemId"];
  const write = (identifiers: unknown) =>
    patch({ parents: [{ org: { id, identifiers } }] });
  const identifierCases: Array<[string, object, boolean]> = [
    ["populated identifiers", write(populated), true],
    ...scalarMembers.map((member): [string, object, boolean] => [
      `null ${member}`,
      write({ [member]: null }),
      false,
    ]),
    ...scalarMembers.map((member): [string, object, boolean] => [
      `null ${member} id`,
      write({ [member]: { id: null } }),
      false,
    ]),
    ["null otherIds entry", write({ otherIds: { "org:xi:foo": null } }), false],
    [
      "an EIN id of eight digits",
      write({ "org:us:ein": { id: "12345678" } }),
      false,
    ],
    [
      "a lowercase UEI id",
      write({ "org:us:uei": { id: "ab0123456789" } }),
      false,
    ],
    [
      "a DUNS id with a letter",
      write({ "org:xi:duns": { id: "12345678A" } }),
      false,
    ],
    ["a numeric systemId id", write({ systemId: { id: 5 } }), false],
    ["an identifier as a string", write({ "org:us:ein": "123456789" }), false],
    [
      "an otherIds entry as a number",
      write({ otherIds: { "org:xi:foo": 5 } }),
      false,
    ],
  ];

  it.each(identifierCases)(
    "patch org identifiers: %s",
    (_name, payload, valid) => {
      const openApi = component("OrgPatchData");
      expect(
        jsonSchemas.getSchema("OrgPatchData.yaml")!(payload),
        "JSON Schema",
      ).toBe(valid);
      expect(
        openApi(payload),
        `OpenAPI ${JSON.stringify(openApi.errors)}`,
      ).toBe(valid);
    },
  );

  // OpenAPI 3.0 applies `nullable` only beside a `type`, so a nullable node
  // that also references a component still rejects `null`. None may be
  // reachable from the read or patch relationships, through any component.
  it("reaches no nullable reference from relationships", () => {
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
    for (const model of ["OrganizationBase", "OrgPatchData"]) {
      const schema = schemas[`CommonGrants.Models.${model}`] as {
        properties: { relationships: object };
      };
      walk(schema.properties.relationships, `${model}.relationships`);
    }

    expect(sites).toEqual([]);
    // Guards against a walk that never reaches the entries.
    expect(followed).toContain("CommonGrants.Models.OrgHierarchyRelationship");
    expect(followed).toContain(
      "CommonGrants.Patch.OrgPatchOrgTargetRefReplaceOnly",
    );
  });
});
