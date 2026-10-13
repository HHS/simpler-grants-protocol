/**
 * Pins the mock organizations to the ids the spec's examples publish. A
 * reader who copies an organization id out of a documented example and asks
 * the mock API for it gets that organization back, with the same name and
 * EIN, not some other record that happens to sit under the id.
 */

import { describe, it, expect } from "vitest";
import {
  CANONICAL_ORGANIZATION_ID,
  getOrganizationById,
} from "@/lib/mock/data/organizations";
import { loadRawSchema, schemasAvailable } from "./schema-validator";

// Matches the sibling conformance suites: the versioned schemas are gitignored
// build output, so their absence is a setup error to report, never a skip.
if (!schemasAvailable()) {
  throw new Error(
    "Generated schemas not found. Run `pnpm --filter website run build` " +
      "(or its `typespec` + `generate` steps) before running this suite.",
  );
}

/** The parts of a published organization or reference this spec checks. */
interface OrgExample {
  id: string;
  name: string;
  identifiers?: { "org:us:ein"?: { id?: string } };
}

/** The first published example of a v0.5.0 schema. */
function firstExample(schemaName: string): Record<string, unknown> {
  const schema = loadRawSchema("0.5.0", schemaName);
  const examples = schema?.examples as Record<string, unknown>[] | undefined;
  expect(examples?.[0], `${schemaName} publishes no example`).toBeDefined();
  return examples![0]!;
}

/** Asserts the mock record under an example's id is the same organization. */
function expectMockMatches(example: OrgExample): void {
  const record = getOrganizationById(example.id);
  expect(record, `no mock organization under ${example.id}`).toBeDefined();
  expect(record!.name).toBe(example.name);

  const ein = example.identifiers?.["org:us:ein"]?.id;
  if (ein !== undefined) {
    expect(record!.identifiers?.["org:us:ein"]?.id).toBe(ein);
  }
}

describe("mock organizations under the spec's published example ids", () => {
  it("serves the canonical record under the OrganizationBase example's id", () => {
    const example = firstExample(
      "OrganizationBase.yaml",
    ) as unknown as OrgExample;
    expectMockMatches(example);

    expect(getOrganizationById(example.id)).toEqual({
      ...getOrganizationById(CANONICAL_ORGANIZATION_ID),
      id: example.id,
    });
  });

  it("serves the AwardBase example's funder and recipient under their ids", () => {
    const award = firstExample("AwardBase.yaml") as {
      funders: { primary: OrgExample };
      recipientOrganizations: { primary: OrgExample };
    };

    expectMockMatches(award.funders.primary);
    expectMockMatches(award.recipientOrganizations.primary);
  });
});
