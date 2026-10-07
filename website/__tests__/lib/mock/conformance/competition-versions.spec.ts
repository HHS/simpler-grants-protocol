/**
 * Pins the v0.5 competition and form changes (#1225) in every artifact a
 * consumer reads per version: the OpenAPI documents and the downloadable
 * versioned JSON Schemas. v0.5 replaces `CompetitionBase.opportunityId` with an
 * `opportunity` reference and `FormBase.name` with `title`; every earlier
 * version keeps `opportunityId` and `name`, examples included, down to the
 * forms nested in competitions.
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
import { resolveSchemaRefs } from "@/lib/schema/ref-resolver";
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

/** How each version labels a form. */
const FORM_KEY: Record<string, { key: string; stale: string }> = {
  "0.2.0": { key: "name", stale: "title" },
  "0.3.0": { key: "name", stale: "title" },
  "0.4.0": { key: "name", stale: "title" },
  "0.5.0": { key: "title", stale: "name" },
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

/**
 * Asserts every form in a `CompetitionForms` value is exactly the version's
 * direct form example: same keys, in order, and same values, opaque schemas
 * and mappings included. Core's examples embed that one form.
 */
function expectVersionedForms(
  competitionForms: unknown,
  formExample: Record<string, unknown>,
) {
  const forms = Object.values(
    (competitionForms as { forms: Record<string, Record<string, unknown>> })
      .forms,
  );
  expect(forms.length).toBeGreaterThan(0);
  for (const form of forms) {
    expect(Object.keys(form)).toEqual(Object.keys(formExample));
    expect(form).toEqual(formExample);
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
    const form = FORM_KEY[version];
    const formExample = () =>
      exampleOf(requireSchema(artifact, version, formModel(version)));

    it(`requires CompetitionBase.${key} and lacks ${stale}`, () => {
      const competition = requireSchema(artifact, version, "CompetitionBase");

      expect(competition.required).toContain(key);
      expect(competition.properties).toHaveProperty(key);
      expect(competition.required).not.toContain(stale);
      expect(competition.properties).not.toHaveProperty(stale);
      expect(refOf(competition.properties?.[key])).toMatch(ref);
    });

    it(`requires ${formModel(version)}.${form.key}, not ${form.stale}`, () => {
      const schema = requireSchema(artifact, version, formModel(version));

      expect(schema.required).toContain(form.key);
      expect(schema.properties).toHaveProperty(form.key);
      expect(schema.required).not.toContain(form.stale);
      expect(schema.properties).not.toHaveProperty(form.stale);
    });

    it(`gives the ${formModel(version)} example ${form.key} alone`, () => {
      const example = formExample();

      expect(example[form.key]).toBe("Form A");
      expect(example).not.toHaveProperty(form.stale);
      expect(Object.keys(example)).toEqual([
        "id",
        form.key,
        "description",
        "instructions",
        "jsonSchema",
        "uiSchema",
        "mappingToCommonGrants",
        "mappingFromCommonGrants",
        "createdAt",
        "lastModifiedAt",
      ]);
    });

    it("keeps the form example's opaque schemas and mappings whole", () => {
      const example = formExample();
      const latest = exampleOf(requireSchema(artifact, "0.5.0", "FormBase"));
      for (const field of [
        "jsonSchema",
        "uiSchema",
        "mappingToCommonGrants",
        "mappingFromCommonGrants",
      ]) {
        expect(example[field]).toEqual(latest[field]);
      }
      // The opaque form schema uses `name` as a field of its own.
      expect(
        (example.jsonSchema as { properties: object }).properties,
      ).toHaveProperty("name");
    });

    it(`gives the CompetitionBase example ${key} alone, with ${form.key}d forms`, () => {
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
      expectVersionedForms(example.forms, formExample());
    });

    it(`gives the CompetitionForms example ${form.key}d forms`, () => {
      expectVersionedForms(
        exampleOf(requireSchema(artifact, version, "CompetitionForms")),
        formExample(),
      );
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

// The unversioned TypeSpec model declares every version's fields at once, so
// its JSON Schema requires both `name` and `title`, and Core's source example
// must supply both with the same value. No single version's payload has both.
describe("the unversioned FormBase authoring schema", () => {
  const aggregate = yaml.load(
    readFileSync(path.join(PUBLIC_DIR, "schemas/yaml/FormBase.yaml"), "utf-8"),
  ) as Schema;

  it("requires both name and title", () => {
    expect(aggregate.required).toEqual(
      expect.arrayContaining(["name", "title"]),
    );
  });

  it("gives its example equal name and title values", () => {
    const example = exampleOf(aggregate);
    expect(example.name).toBe("Form A");
    expect(example.title).toBe(example.name);
  });
});

// The Form page shows the v0.5 payload in its table and literal example (a
// file-based example would sample the unversioned schema, which carries both
// keys), while its JSON Schema tab and download stay the unversioned
// authoring schema, whose references resolve where it is served.
describe("the Form and Competition docs pages", () => {
  const REPO_ROOT = path.resolve(HERE, "../../../../..");
  const page = readFileSync(
    path.join(REPO_ROOT, "website/src/content/docs/protocol/models/form.mdx"),
    "utf-8",
  );
  const { form } = yaml.load(page.split("---")[1]) as {
    form: {
      example: { code: string };
      table: { file: { path: string } };
      jsonSchema: { file: { path: string } };
    };
  };
  const load = (repoPath: string) =>
    yaml.load(readFileSync(path.join(REPO_ROOT, repoPath), "utf-8")) as Schema;

  it("shows exactly the v0.5 FormBase example", () => {
    expect(JSON.parse(form.example.code)).toEqual(
      exampleOf(requireSchema("jsonSchema", "0.5.0", "FormBase")),
    );
  });

  it("renders the table from the v0.5 schema, which requires title alone", () => {
    expect(page).toContain(
      "<SchemaTable filePath={frontmatter.form.table.file.path} />",
    );
    expect(form.table.file.path).toBe(
      "website/public/schemas/yaml/versions/v0.5.0/FormBase.yaml",
    );
    const table = load(form.table.file.path);
    expect(table.required).toContain("title");
    expect(table.required).not.toContain("name");
  });

  it("renders the Competition table from the v0.5 schema, which requires opportunity alone", () => {
    const competitionPage = readFileSync(
      path.join(
        REPO_ROOT,
        "website/src/content/docs/protocol/models/competition.mdx",
      ),
      "utf-8",
    );
    const { competition } = yaml.load(competitionPage.split("---")[1]) as {
      competition: { table: { file: { path: string } } };
    };
    expect(competitionPage).toContain(
      "<SchemaTable filePath={frontmatter.competition.table.file.path} />",
    );
    expect(competition.table.file.path).toBe(
      "website/public/schemas/yaml/versions/v0.5.0/CompetitionBase.yaml",
    );
    const table = load(competition.table.file.path);
    expect(table.required).toContain("opportunity");
    expect(table.required).not.toContain("opportunityId");
  });

  it("keeps the JSON Schema tab on the unversioned authoring schema", () => {
    expect(form.jsonSchema.file.path).toBe(
      "website/public/schemas/yaml/FormBase.yaml",
    );
    expect(form.jsonSchema.file.path).not.toBe(form.table.file.path);
    expect(load(form.jsonSchema.file.path).required).toEqual(
      expect.arrayContaining(["name", "title"]),
    );
  });

  /** The served file a model page tells readers to validate payloads with. */
  const validationTarget = (model: string) => {
    const text = readFileSync(
      path.join(
        REPO_ROOT,
        `website/src/content/docs/protocol/models/${model}.mdx`,
      ),
      "utf-8",
    );
    const target = text.match(
      /To validate a payload, use [^`]*`(\/[^`]+)`/,
    )?.[1];
    expect(target, `${model}.mdx names no validation target`).toBeDefined();
    return path.join("website/public", target!);
  };

  it("links and recommends only files a normal resolver can follow", async () => {
    for (const download of [
      form.jsonSchema.file.path,
      validationTarget("form"),
      validationTarget("competition"),
    ]) {
      const resolved = await resolveSchemaRefs(path.join(REPO_ROOT, download));
      expect(resolved, download).toBeTypeOf("object");
    }
  });
});
