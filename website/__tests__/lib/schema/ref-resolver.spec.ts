import { describe, it, expect } from "vitest";
import Ajv2020 from "ajv/dist/2020";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import {
  resolveSchemaRefs,
  dereferenceSchema,
} from "@/lib/schema/ref-resolver";
import { Paths } from "@/lib/schema/paths";

/**
 * Regression tests for the multi-composite shared-$ref AJV failure.
 *
 * Uses OppTimeline.yaml as the fixture: it references Event.yaml three
 * times (postDate, closeDate, otherDates), which transitively pulls in
 * isoDate.yaml multiple times. This is the same structural pattern that
 * multi-composite forms produce (e.g. SF424Mandatory composing three QB
 * questions that each include QuestionAddress).
 *
 * The pair of tests below isolates the root cause: the failure is not
 * about having multiple $refs to the same schema — it's about what
 * happens when those refs are fully resolved before being handed to AJV.
 */
describe("dereferenceSchema — multi-composite AJV safety", () => {
  const schemaPath = path.join(Paths.SCHEMAS_DIR, "OppTimeline.yaml");

  it("raw YAML (unresolved $refs) is accepted by AJV — multiple $refs are fine", () => {
    // Contrast case: the same schema shape, but $refs are strings pointing
    // to other files rather than inlined subtrees. AJV registers the top-
    // level schema by $id and lazily resolves references to other
    // registered schemas. No duplicate $id conflict.
    const raw = yaml.load(fs.readFileSync(schemaPath, "utf-8")) as {
      $id: string;
    };
    const ajv = new Ajv2020({ strict: false });
    expect(() => ajv.addSchema(raw, raw.$id)).not.toThrow();
  });

  it("fully dereferenced output (without stripping $id) throws — pins the underlying bug", async () => {
    // Baseline: $RefParser deep-clones each resolved $ref, so a schema
    // with three $refs to Event.yaml produces a tree with three distinct
    // sub-schemas all carrying the same $id. AJV walks the tree on
    // addSchema, sees duplicates, and throws.
    //
    // If this test ever stops throwing, $RefParser changed its semantics
    // and the stripIds step in dereferenceSchema may no longer be needed.
    const resolved = (await resolveSchemaRefs(schemaPath)) as {
      $id: string;
    };
    const ajv = new Ajv2020({ strict: false });
    expect(() => ajv.addSchema(resolved, resolved.$id)).toThrow(
      /resolves to more than one schema/,
    );
  });

  it("dereferenceSchema output is accepted by AJV — the fix", async () => {
    // dereferenceSchema strips $ids from the tree after inlining, so every
    // downstream AJV consumer (JsonFormRenderer's internal AJV, direct
    // ajv.addSchema, etc.) is safe regardless of how many shared sub-
    // schemas a form composes.
    const schema = (await dereferenceSchema(schemaPath)) as {
      $id?: string;
    };
    const ajv = new Ajv2020({ strict: false });
    expect(() => ajv.addSchema(schema, schema.$id ?? "test")).not.toThrow();
  });
});
