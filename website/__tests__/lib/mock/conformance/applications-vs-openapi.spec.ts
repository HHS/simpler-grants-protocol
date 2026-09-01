/**
 * Checks the shaped application records against the per-version OpenAPI
 * documents rather than the JSON Schemas.
 *
 * The sibling `fixtures-vs-schemas` suite cannot cover this: the versioned
 * JSON Schema generator applies `@added`/`@removed` but not `@renamedFrom`, so
 * every version's `ApplicationBase.yaml` still calls the title field `title`,
 * and sealing is stripped there, so an undeclared property passes. The OpenAPI
 * documents are what Swagger UI renders beside the live response, so they are
 * the contract a visitor actually compares against.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import {
  APPLICATION_FIXTURES,
  shapeApplicationForVersion,
} from "@/lib/mock/data/applications";
import { versionsServing } from "@/lib/mock/data/availability";
import type { Version } from "@/lib/mock/data/fixtures";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_DIR = path.resolve(HERE, "../../../../public/openapi");

/** The `ApplicationBase` component as one version's OpenAPI document declares it. */
interface ApplicationSchema {
  required: string[];
  properties: Record<string, unknown>;
}

/** Reads `CommonGrants.Models.ApplicationBase` out of a version's document. */
function applicationSchemaFor(version: Version): ApplicationSchema {
  const file = path.join(OPENAPI_DIR, `openapi.${version}.yaml`);
  const document = yaml.load(readFileSync(file, "utf-8")) as {
    components?: { schemas?: Record<string, ApplicationSchema | undefined> };
  };

  const schema =
    document.components?.schemas?.["CommonGrants.Models.ApplicationBase"];
  if (!schema) {
    throw new Error(
      `openapi.${version}.yaml declares no CommonGrants.Models.ApplicationBase`,
    );
  }
  return schema;
}

/** The versions whose routes the mock actually serves applications from. */
const SERVED = versionsServing("applications");

describe("shaped applications against the per-version OpenAPI documents", () => {
  it("serves applications in more than one version, or these tests prove nothing", () => {
    expect(SERVED.length).toBeGreaterThan(1);
  });

  it.each(SERVED)(
    "carries every field v%s marks required, on every fixture",
    (version) => {
      const { required } = applicationSchemaFor(version);

      for (const fixture of APPLICATION_FIXTURES) {
        const shaped = shapeApplicationForVersion(fixture, version) as Record<
          string,
          unknown
        >;

        for (const field of required) {
          expect(
            Object.hasOwn(shaped, field),
            `${fixture.id} is missing required field \`${field}\` at v${version}`,
          ).toBe(true);
        }
      }
    },
  );

  it.each(SERVED)(
    "carries no field v%s does not declare, on every fixture",
    (version) => {
      const { properties } = applicationSchemaFor(version);

      for (const fixture of APPLICATION_FIXTURES) {
        const shaped = shapeApplicationForVersion(fixture, version) as Record<
          string,
          unknown
        >;

        for (const field of Object.keys(shaped)) {
          expect(
            Object.hasOwn(properties, field),
            `${fixture.id} carries \`${field}\`, which v${version} does not declare`,
          ).toBe(true);
        }
      }
    },
  );

  // The two differences the shaping exists for, named outright so a future
  // reader sees what would otherwise be buried in the loops above.
  it("names the title field per version, and gates opportunityId at v0.3", () => {
    const titleFieldByVersion = Object.fromEntries(
      SERVED.map((version) => [
        version,
        Object.hasOwn(applicationSchemaFor(version).properties, "title")
          ? "title"
          : "name",
      ]),
    );

    expect(titleFieldByVersion).toEqual({
      "0.2.0": "name",
      "0.3.0": "name",
      "0.4.0": "title",
    });

    const hasOpportunityId = Object.fromEntries(
      SERVED.map((version) => [
        version,
        Object.hasOwn(
          applicationSchemaFor(version).properties,
          "opportunityId",
        ),
      ]),
    );

    expect(hasOpportunityId).toEqual({
      "0.2.0": false,
      "0.3.0": true,
      "0.4.0": true,
    });
  });
});
