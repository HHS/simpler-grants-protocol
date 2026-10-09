/**
 * Pins ticket #1222-T1: the award routes (`Awards_list`, `Awards_read`,
 * `Awards_search`) are promoted from `experimental` to `optional`.
 *
 * OpenAPI tags are not versioned in TypeSpec: `@added`/`@removed` project
 * operations and properties, not decorators, so the promotion necessarily
 * lands in the regenerated v0.4.0 document as well as v0.5.0. That is
 * intended, not a regression: awards only exist from v0.4.0 onward, so both
 * documents that carry award routes gain the new status tag together.
 *
 * The second suite below is a standing guard, not specific to this ticket: it
 * checks that every operation in every version's document still carries
 * exactly one of the three status tags, so a future change can't leave an
 * operation with none or with more than one. That is the failure this very
 * diff could have produced, by adding an operation-level `optional` while a
 * namespace-level `experimental` survived, and the sibling namespaces
 * (Organizations, Competitions, Applications, Forms) are the next promotions.
 *
 * Both version lists are derived rather than written out, the way
 * `applications-vs-openapi.spec.ts` derives its own, so a new protocol version
 * is covered without editing this file.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import { versionsServing } from "@/lib/mock/data/availability";
import { SUPPORTED_VERSIONS, type Version } from "@/lib/mock/data/fixtures";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_DIR = path.resolve(HERE, "../../../../public/openapi");

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "patch",
  "options",
  "head",
  "trace",
]);

const STATUS_TAGS = new Set(["required", "optional", "experimental"]);

/** The slice of an OpenAPI operation this suite asserts on. */
interface Operation {
  operationId?: string;
  tags?: string[];
}

interface OpenApiDoc {
  paths?: Record<string, Record<string, Operation | undefined>>;
}

/** Reads a version's OpenAPI document off disk. */
function openApiDocFor(version: Version): OpenApiDoc {
  const file = path.join(OPENAPI_DIR, `openapi.${version}.yaml`);
  return yaml.load(readFileSync(file, "utf-8")) as OpenApiDoc;
}

/**
 * Every operation declared across a document's paths.
 *
 * This walks `paths` x HTTP methods directly rather than going through
 * `operationsById`, so the guard below sees operations that declare no
 * `operationId` instead of silently skipping them.
 */
function allOperations(doc: OpenApiDoc): Operation[] {
  const operations: Operation[] = [];
  for (const pathItem of Object.values(doc.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!HTTP_METHODS.has(method) || !operation) continue;
      operations.push(operation);
    }
  }
  return operations;
}

/** The operations that declare an `operationId`, keyed by it. */
function operationsById(doc: OpenApiDoc): Map<string, Operation> {
  const byId = new Map<string, Operation>();
  for (const operation of allOperations(doc)) {
    if (operation.operationId) byId.set(operation.operationId, operation);
  }
  return byId;
}

const AWARD_OPERATION_IDS = ["Awards_list", "Awards_read", "Awards_search"];

/** The versions whose documents carry award routes (v0.4.0 onward). */
const AWARD_VERSIONS = versionsServing("awards");

const ALL_VERSIONS: Version[] = [...SUPPORTED_VERSIONS];

describe("award route status tags (#1222-T1)", () => {
  it("carries award routes in more than one version, or these tests prove nothing", () => {
    expect(AWARD_VERSIONS.length).toBeGreaterThan(1);
  });

  it.each(AWARD_VERSIONS)(
    "tags Awards_list, Awards_read, and Awards_search as [Awards, optional] at v%s",
    (version) => {
      const doc = openApiDocFor(version);
      const byId = operationsById(doc);

      for (const operationId of AWARD_OPERATION_IDS) {
        const operation = byId.get(operationId);
        expect(
          operation,
          `openapi.${version}.yaml declares no operation with operationId ${operationId}`,
        ).toBeDefined();

        expect(
          operation?.tags,
          `${operationId} at v${version} does not carry [Awards, optional]`,
        ).toEqual(["Awards", "optional"]);
      }
    },
  );

  it.each(ALL_VERSIONS)(
    "carries exactly one status tag on every operation at v%s",
    (version) => {
      const doc = openApiDocFor(version);

      for (const operation of allOperations(doc)) {
        const statusTags = (operation.tags ?? []).filter((tag) =>
          STATUS_TAGS.has(tag),
        );
        const label =
          operation.operationId ?? "an operation with no operationId";

        expect(
          statusTags,
          `${label} at v${version} carries ${statusTags.length} status tag(s) (${statusTags.join(", ") || "none"}), expected exactly one`,
        ).toHaveLength(1);
      }
    },
  );
});
