/**
 * Pins the ADR 0030 organization-relationships slice of #1256: the v0.5.0
 * schemas gain `aliases` and `relationships` on `OrganizationBase` and
 * `OrgPatchData`, plus the relationship lists, entries, and subtype options,
 * while v0.4.0 and earlier are left unchanged. `OrgRef` itself does not
 * change; the writable reference to the other organization lives only inside
 * the patch schema.
 *
 * The emitter does not version `@example` values, so the absence checks also
 * walk every example and local `$defs` in the v0.1.0-v0.4.0 artifacts. They are
 * scoped to the relationship fields and models; other v0.5 fields are out of
 * scope here.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import type { Version } from "@/lib/mock/data/fixtures";
import { loadRawSchema, schemasAvailable } from "./schema-validator";

// Matches the sibling conformance suites: the versioned schemas are gitignored
// build output, so their absence is a setup error to report, never a skip.
if (!schemasAvailable()) {
  throw new Error(
    "Generated schemas not found. Run `pnpm --filter website run build` " +
      "(or its `typespec` + `generate` steps) before running this suite.",
  );
}

/** The parts of a generated model schema this spec asserts on. */
interface ModelSchema {
  properties?: Record<string, unknown>;
  required?: string[];
}

function modelSchema(
  version: Version,
  schemaName: string,
): ModelSchema | undefined {
  return loadRawSchema(version, schemaName) as ModelSchema | undefined;
}

const ADDED = ["aliases", "relationships"];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_VERSIONS_DIR = path.resolve(
  HERE,
  "../../../../public/schemas/yaml/versions",
);
const OPENAPI_DIR = path.resolve(HERE, "../../../../public/openapi");

const OLDER_VERSIONS = ["0.1.0", "0.2.0", "0.3.0", "0.4.0"] as const;

/** Names of the v0.5 relationship models, including `Patch.OrgTargetRef`,
 * and the `nonEmptyString` scalar that `aliases` items use. */
const RELATIONSHIP_MODEL =
  /OrgTargetRef|OrgRelationship|Org(Hierarchy|Succession|Record|Other)(Relationship|Kind)|nonEmptyString/;

/** Collects every `example` and `examples` value anywhere in a document. */
function collectExamples(node: unknown, found: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    for (const item of node) collectExamples(item, found);
  } else if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "example" || key === "examples") found.push(value);
      else collectExamples(value, found);
    }
  }
  return found;
}

/** Whether `aliases` or `relationships` appears as a key at any depth. */
function hasAddedKey(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(hasAddedKey);
  if (node === null || typeof node !== "object") return false;
  return Object.entries(node).some(
    ([key, value]) => ADDED.includes(key) || hasAddedKey(value),
  );
}

/** Every `$defs` key and `$ref` target anywhere in a document. */
function collectDefsAndRefs(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectDefsAndRefs(item, found);
  } else if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") found.push(value);
      if (key === "$defs" && value !== null && typeof value === "object") {
        found.push(...Object.keys(value));
      }
      collectDefsAndRefs(value, found);
    }
  }
  return found;
}

function loadYaml(file: string): unknown {
  return yaml.load(readFileSync(file, "utf-8"));
}

describe("organization relationships at v0.5.0 (ADR 0030)", () => {
  it("adds optional aliases and relationships to OrganizationBase and OrgPatchData", () => {
    for (const schemaName of ["OrganizationBase.yaml", "OrgPatchData.yaml"]) {
      const schema = modelSchema("0.5.0", schemaName);
      expect(schema, `v0.5.0/${schemaName} does not exist`).toBeDefined();
      for (const field of ADDED) {
        expect(
          schema?.properties?.[field],
          `v0.5.0/${schemaName} lacks ${field}`,
        ).toBeDefined();
        expect(schema?.required ?? []).not.toContain(field);
      }
    }
  });

  it("publishes the relationship models only from v0.5.0", () => {
    for (const schemaName of [
      "OrgRelationships.yaml",
      "OrgHierarchyRelationship.yaml",
      "OrgSuccessionRelationship.yaml",
      "OrgRecordRelationship.yaml",
      "OrgOtherRelationship.yaml",
      "OrgHierarchyKindOptions.yaml",
      "OrgSuccessionKindOptions.yaml",
      "OrgRecordKindOptions.yaml",
      "OrgOtherKindOptions.yaml",
    ]) {
      expect(
        modelSchema("0.5.0", schemaName),
        `v0.5.0/${schemaName} does not exist`,
      ).toBeDefined();
      expect(
        modelSchema("0.4.0", schemaName),
        `v0.4.0/${schemaName} unexpectedly exists`,
      ).toBeUndefined();
    }
  });

  it.each(["0.2.0", "0.3.0", "0.4.0"] as const)(
    "leaves OrganizationBase and OrgPatchData unchanged at v%s",
    (version) => {
      for (const schemaName of ["OrganizationBase.yaml", "OrgPatchData.yaml"]) {
        const schema = modelSchema(version, schemaName);
        if (schema === undefined) continue; // OrgPatchData starts at v0.4.0
        for (const field of ADDED) {
          expect(
            schema.properties?.[field],
            `v${version}/${schemaName} unexpectedly gained ${field}`,
          ).toBeUndefined();
        }
      }
    },
  );

  it("finds the relationship models in the v0.5.0 artifacts it checks below", () => {
    // Guards the absence checks below against a matcher that never matches.
    const patch = loadYaml(
      path.join(SCHEMA_VERSIONS_DIR, "v0.5.0", "OrgPatchData.yaml"),
    );
    expect(
      collectDefsAndRefs(patch).some((name) => RELATIONSHIP_MODEL.test(name)),
    ).toBe(true);
    expect(hasAddedKey(patch)).toBe(true);
  });

  it.each(OLDER_VERSIONS)(
    "keeps the relationship fields and models out of every v%s schema's examples and $defs",
    (version) => {
      const dir = path.join(SCHEMA_VERSIONS_DIR, `v${version}`);
      const files = readdirSync(dir).filter((file) => file.endsWith(".yaml"));
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        const schema = loadYaml(path.join(dir, file));
        expect(
          hasAddedKey(collectExamples(schema)),
          `v${version}/${file} has an example with aliases or relationships`,
        ).toBe(false);
        expect(
          collectDefsAndRefs(schema).filter((name) =>
            RELATIONSHIP_MODEL.test(name),
          ),
          `v${version}/${file} references a v0.5 relationship model`,
        ).toEqual([]);
      }
    },
  );

  it.each(OLDER_VERSIONS)(
    "keeps the relationship fields and models out of the v%s OpenAPI document",
    (version) => {
      const document = loadYaml(
        path.join(OPENAPI_DIR, `openapi.${version}.yaml`),
      ) as { components?: { schemas?: Record<string, unknown> } };
      expect(
        hasAddedKey(collectExamples(document)),
        `openapi.${version}.yaml has an example with aliases or relationships`,
      ).toBe(false);
      expect(
        [
          ...Object.keys(document.components?.schemas ?? {}),
          ...collectDefsAndRefs(document),
        ].filter((name) => RELATIONSHIP_MODEL.test(name)),
        `openapi.${version}.yaml declares or references a v0.5 relationship model`,
      ).toEqual([]);
    },
  );

  it.each([...OLDER_VERSIONS, "0.5.0"])(
    "has no dbaNames, the pre-rename name of aliases, in any v%s artifact",
    (version) => {
      const dir = path.join(SCHEMA_VERSIONS_DIR, `v${version}`);
      const texts = [
        ...readdirSync(dir)
          .filter((file) => file.endsWith(".yaml"))
          .map((file) => readFileSync(path.join(dir, file), "utf-8")),
        readFileSync(
          path.join(OPENAPI_DIR, `openapi.${version}.yaml`),
          "utf-8",
        ),
      ];
      expect(texts.filter((text) => text.includes("dbaNames"))).toEqual([]);
    },
  );

  it("does not change the read OrgRef between v0.4.0 and v0.5.0", () => {
    expect(modelSchema("0.5.0", "OrgRef.yaml")).toEqual(
      modelSchema("0.4.0", "OrgRef.yaml"),
    );
  });
});
