/**
 * Pins the v0.5 competition change (#1225) in every artifact a consumer reads
 * per version: the OpenAPI documents and the downloadable versioned JSON
 * Schemas. v0.5 replaces `CompetitionBase.opportunityId` with an `opportunity`
 * reference; every earlier version keeps `opportunityId`, examples included.
 * Forms keep `name` in every version, including those nested in competitions.
 *
 * Key presence and absence are asserted outright, because the conformance
 * validator strips `unevaluatedProperties` and so would accept a stale key.
 *
 * Reads generated files — run `pnpm --filter website run build` first.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import type { Version } from "@/lib/mock/data/fixtures";
import { getValidator } from "./schema-validator";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(HERE, "../../../../public");
const OPENAPI_DIR = path.join(PUBLIC_DIR, "openapi");
const VERSIONS_DIR = path.join(PUBLIC_DIR, "schemas/yaml/versions");

/** A schema as either artifact declares it, narrowed to what these tests read. */
interface Schema {
  required?: string[];
  properties?: Record<string, Schema>;
  $ref?: string;
  allOf?: Schema[];
  example?: Record<string, unknown>;
  examples?: Record<string, unknown>[];
}

type Artifact = "openapi" | "jsonSchema";

const ARTIFACTS: Artifact[] = ["openapi", "jsonSchema"];

/** The versions that have competitions at all. */
const VERSIONS: Version[] = ["0.2.0", "0.3.0", "0.4.0", "0.5.0"];

/** How each version links a competition to its opportunity. */
const LINK: Record<string, { key: string; stale: string; ref: RegExp }> = {
  "0.2.0": { key: "opportunityId", stale: "opportunity", ref: /uuid/ },
  "0.3.0": { key: "opportunityId", stale: "opportunity", ref: /uuid/ },
  "0.4.0": { key: "opportunityId", stale: "opportunity", ref: /uuid/ },
  "0.5.0": { key: "opportunity", stale: "opportunityId", ref: /OppRef/ },
};

/** The form model was `Form` at v0.2 and `FormBase` from v0.3. */
function formModel(version: Version): string {
  return version === "0.2.0" ? "Form" : "FormBase";
}

const openApiCache = new Map<string, Record<string, Schema>>();

/** Every component schema in a version's OpenAPI document. */
function openApiSchemas(version: string): Record<string, Schema> {
  const cached = openApiCache.get(version);
  if (cached) return cached;
  const file = path.join(OPENAPI_DIR, `openapi.${version}.yaml`);
  const doc = yaml.load(readFileSync(file, "utf-8")) as {
    components: { schemas: Record<string, Schema> };
  };
  openApiCache.set(version, doc.components.schemas);
  return doc.components.schemas;
}

/** A model as one artifact publishes it for a version, or undefined. */
function schemaFor(
  artifact: Artifact,
  version: string,
  name: string,
): Schema | undefined {
  if (artifact === "openapi") {
    return openApiSchemas(version)[`CommonGrants.Models.${name}`];
  }
  const file = path.join(VERSIONS_DIR, `v${version}`, `${name}.yaml`);
  return existsSync(file)
    ? (yaml.load(readFileSync(file, "utf-8")) as Schema)
    : undefined;
}

/** A model, failing loudly when the artifact lacks it. */
function requireSchema(artifact: Artifact, version: string, name: string) {
  const schema = schemaFor(artifact, version, name);
  if (!schema) {
    throw new Error(`${artifact} v${version} publishes no ${name}`);
  }
  return schema;
}

/** The first example, from `example` (OpenAPI) or `examples[0]` (JSON Schema). */
function exampleOf(schema: Schema): Record<string, unknown> {
  const example = schema.example ?? schema.examples?.[0];
  if (!example) throw new Error("schema has no example");
  return example;
}

/** The `$ref` a property points at, whether bare or wrapped in `allOf`. */
function refOf(property: Schema | undefined): string | undefined {
  return property?.$ref ?? property?.allOf?.[0]?.$ref;
}

/** Asserts every form in a `CompetitionForms` value is named, not titled. */
function expectNamedForms(competitionForms: unknown) {
  const forms = Object.values(
    (competitionForms as { forms: Record<string, Record<string, unknown>> })
      .forms,
  );
  expect(forms.length).toBeGreaterThan(0);
  for (const form of forms) {
    expect(typeof form.name).toBe("string");
    expect(form).not.toHaveProperty("title");
  }
}

describe("the models' presence per version", () => {
  it.each(ARTIFACTS)("v0.1.0's %s has neither model", (artifact) => {
    for (const name of ["CompetitionBase", "Form", "FormBase"]) {
      expect(schemaFor(artifact, "0.1.0", name)).toBeUndefined();
    }
  });

  it.each(ARTIFACTS)("names the form model per version in %s", (artifact) => {
    expect(schemaFor(artifact, "0.2.0", "Form")).toBeDefined();
    expect(schemaFor(artifact, "0.2.0", "FormBase")).toBeUndefined();
    for (const version of ["0.3.0", "0.4.0", "0.5.0"]) {
      expect(schemaFor(artifact, version, "FormBase")).toBeDefined();
      expect(schemaFor(artifact, version, "Form")).toBeUndefined();
    }
  });
});

describe.each(ARTIFACTS)("%s contract", (artifact) => {
  describe.each(VERSIONS)("v%s", (version) => {
    const { key, stale, ref } = LINK[version];

    it(`requires CompetitionBase.${key} and lacks ${stale}`, () => {
      const competition = requireSchema(artifact, version, "CompetitionBase");

      expect(competition.required).toContain(key);
      expect(competition.properties).toHaveProperty(key);
      expect(competition.required).not.toContain(stale);
      expect(competition.properties).not.toHaveProperty(stale);
      expect(refOf(competition.properties?.[key])).toMatch(ref);
    });

    it(`requires ${formModel(version)}.name, not title`, () => {
      const form = requireSchema(artifact, version, formModel(version));

      expect(form.required).toContain("name");
      expect(form.properties).toHaveProperty("name");
      expect(form.properties).not.toHaveProperty("title");
    });

    it(`gives the CompetitionBase example ${key} alone, with named forms`, () => {
      const example = exampleOf(
        requireSchema(artifact, version, "CompetitionBase"),
      );

      expect(example).toHaveProperty(key);
      expect(example).not.toHaveProperty(stale);
      if (key === "opportunity") {
        const reference = example.opportunity as Record<string, unknown>;
        expect(reference.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(typeof reference.title).toBe("string");
      } else {
        expect(example.opportunityId).toMatch(/^[0-9a-f-]{36}$/);
      }
      expectNamedForms(example.forms);
    });

    it(`gives the CompetitionForms and ${formModel(version)} examples a name`, () => {
      expectNamedForms(
        exampleOf(requireSchema(artifact, version, "CompetitionForms")),
      );

      const form = exampleOf(
        requireSchema(artifact, version, formModel(version)),
      );
      expect(typeof form.name).toBe("string");
      expect(form).not.toHaveProperty("title");
    });

    it("declares every key its examples use and supplies every required one", () => {
      for (const name of ["CompetitionBase", formModel(version)]) {
        const schema = requireSchema(artifact, version, name);
        const example = exampleOf(schema);
        for (const field of schema.required ?? []) {
          expect(example, `${name} example lacks ${field}`).toHaveProperty(
            field,
          );
        }
        for (const field of Object.keys(example)) {
          expect(
            schema.properties,
            `${name} example carries undeclared ${field}`,
          ).toHaveProperty(field);
        }
      }
    });
  });
});

describe("versioned JSON Schema examples validate against their own version", () => {
  it.each(VERSIONS)("v%s", (version) => {
    for (const name of [
      "CompetitionBase",
      "CompetitionForms",
      formModel(version),
    ]) {
      const schemaName = `${name}.yaml`;
      const { validate, errorText } = getValidator(version, schemaName, {
        requireVersioned: true,
      });
      const example = exampleOf(requireSchema("jsonSchema", version, name));
      expect(validate(example), `${schemaName}: ${errorText()}`).toBe(true);
    }
  });
});
