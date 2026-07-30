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
        "clears the inherited systemId field",
        { identifiers: { systemId: null } },
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
    ];

    it.each(invalid)("%s", (_name, patch) => {
      expect(validate!(patch)).toBe(false);
    });
  });

  it("covers every writable OrganizationBase field (drift guard)", () => {
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
