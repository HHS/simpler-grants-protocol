import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import Ajv2020 from "ajv/dist/2020";
import { Paths } from "./paths";

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
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  for (const file of fs.readdirSync(Paths.SCHEMAS_DIR)) {
    if (!file.endsWith(".yaml")) continue;
    const schema = yaml.load(
      fs.readFileSync(path.join(Paths.SCHEMAS_DIR, file), "utf-8"),
    ) as { $id?: string };
    ajv.addSchema(schema, schema.$id ?? file);
  }
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
