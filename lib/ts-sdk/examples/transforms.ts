/**
 * Example script demonstrating bidirectional transforms (ADR-0022 PoC).
 *
 * Mirrors `lib/python-sdk/examples/transforms.py` so the two PoCs share a
 * runnable shape. Shows:
 *   1. Defining `toCommon` / `fromCommon` mappings in ADR-0017 format.
 *   2. Registering a custom mapping handler (`join`) for this call only.
 *   3. Validating `toCommon` output against the fully extended Zod schema
 *      (`withCustomFields(OpportunityBaseSchema, ...)`) — passing the base
 *      schema would silently weaken validation of typed custom fields.
 *   4. Exposing the compiled transform via `definePlugin({ transformSchemas })`.
 *   5. Round-tripping `native → common → native` and printing both directions.
 *
 * Run with: `pnpm example:transforms`
 *
 * @remarks
 * Zod's default `.parse()` strips unknown keys, so source-system fields that
 * have no home in the CommonGrants schema must round-trip through
 * `customFields` (declared on the extended schema). The example treats
 * `opportunity_number` this way.
 */

import { z } from "zod";

import { CustomFieldType } from "../src/constants";
import {
  buildTransforms,
  definePlugin,
  getFromPath,
  withCustomFields,
  type Handler,
} from "../src/extensions";
import { OpportunityBaseSchema } from "../src/schemas/zod/models";

// ############################################################################
// Step 1 — Sample grants.gov source data
// ############################################################################

// Note the `source_url: null` below — this is the publisher actively asserting
// "doesn't apply" for the source URL (ADR-0024 three-state). The transforms
// preserve it as `null` end-to-end rather than collapsing to absent, so a
// downstream consumer can distinguish "publisher said N/A" from "publisher
// didn't supply this."
const SOURCE_DATA = {
  data: {
    agency_name: "Department of Examples",
    created_at: "2025-01-15T09:00:00Z",
    last_modified_at: "2025-04-01T12:30:00Z",
    opportunity_description:
      "Funding to advance research into conservation techniques for endangered ecosystems.",
    opportunity_id: 12345,
    opportunity_number: "ABC-123-XYZ-001",
    opportunity_status: "posted",
    opportunity_title: "Research into conservation techniques",
    opportunity_uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    source_url: null,
    summary: {
      applicant_types: ["state_governments"],
    },
  },
};

// ############################################################################
// Step 2 — Custom handlers (joined-label round trip)
// ############################################################################

const joinFields: Handler = (data, spec) => {
  const s = (spec ?? {}) as { fields?: string[]; sep?: string };
  const sep = s.sep ?? " ";
  const parts = (s.fields ?? [])
    .map(path => getFromPath(data, path))
    .filter(v => v !== undefined && v !== null)
    .map(String);
  return parts.length > 0 ? parts.join(sep) : undefined;
};

const splitField: Handler = (data, spec) => {
  const s = (spec ?? {}) as { field?: string; sep?: string; index?: number };
  const value = getFromPath(data, s.field ?? "");
  if (value === undefined || value === null) return undefined;
  const parts = String(value).split(s.sep ?? " ");
  const idx = s.index ?? 0;
  return idx < parts.length ? parts[idx] : undefined;
};

// ############################################################################
// Step 3 — Custom field declarations + extended schema for validation
// ############################################################################

const customFieldSpecs = {
  legacyId: {
    name: "legacyId",
    fieldType: CustomFieldType.integer,
    value: z.number().int(),
    description: "Numeric ID from the legacy database (round-trip preserved).",
  },
  agencyName: {
    name: "agencyName",
    fieldType: CustomFieldType.string,
    value: z.string(),
    description: "Name of the agency hosting this opportunity.",
  },
  applicantTypes: {
    name: "applicantTypes",
    fieldType: CustomFieldType.array,
    value: z.array(z.string()),
    description: "Types of applicants eligible for this opportunity.",
  },
  // Derived field composed by the `join` handler; the `split` handler in
  // fromCommon recovers opportunity_number from this value. Survives Zod
  // validation because it's declared on the extended schema as a custom field.
  compositeLabel: {
    name: "compositeLabel",
    fieldType: CustomFieldType.string,
    value: z.string(),
    description: "Composite label '<opportunity_number> — <opportunity_title>'.",
  },
} as const;

const ExtendedOpportunitySchema = withCustomFields(OpportunityBaseSchema, customFieldSpecs);

// ############################################################################
// Step 4 — Compile bidirectional transforms
// ############################################################################

const { toCommon, fromCommon } = buildTransforms({
  toCommonMapping: {
    id: { field: "data.opportunity_uuid" },
    title: { field: "data.opportunity_title" },
    description: { field: "data.opportunity_description" },
    createdAt: { field: "data.created_at" },
    lastModifiedAt: { field: "data.last_modified_at" },
    // Three-state demo (ADR-0024): native `source_url: null` carries the
    // publisher's "doesn't apply" assertion. The `field` handler preserves
    // the terminal null; the walker places it on the output as a real null
    // (distinct from an absent key). Zod's `.nullish()` accepts it.
    source: { field: "data.source_url" },
    status: {
      value: {
        match: {
          field: "data.opportunity_status",
          case: {
            posted: "open",
            archived: "closed",
            forecasted: "forecasted",
          },
          default: "custom",
        },
      },
    },
    customFields: {
      legacyId: {
        value: { field: "data.opportunity_id" },
        name: "legacyId",
        fieldType: "integer",
      },
      agencyName: {
        value: { field: "data.agency_name" },
        name: "agencyName",
        fieldType: "string",
      },
      applicantTypes: {
        value: { field: "data.summary.applicant_types" },
        name: "applicantTypes",
        fieldType: "array",
      },
      // Compose a derived label via the `join` custom handler; fromCommon
      // recovers opportunity_number from it via `split`.
      // NOTE: the separator must not appear inside any of the constituent
      // field values, or `split` will produce a wrong result on the way back.
      compositeLabel: {
        value: {
          join: {
            fields: ["data.opportunity_number", "data.opportunity_title"],
            sep: " — ",
          },
        },
        name: "compositeLabel",
        fieldType: "string",
      },
    },
  },
  fromCommonMapping: {
    data: {
      opportunity_uuid: { field: "id" },
      opportunity_title: { field: "title" },
      opportunity_description: { field: "description" },
      created_at: { field: "createdAt" },
      last_modified_at: { field: "lastModifiedAt" },
      // Recover opportunity_number from the joined label via `split`. The
      // separator (` — `) must match what the `toCommon` side used to join,
      // and it must not appear inside any constituent field value, or the
      // split index will land on the wrong segment. See the join side above.
      opportunity_number: {
        split: { field: "customFields.compositeLabel.value", sep: " — ", index: 0 },
      },
      opportunity_id: { field: "customFields.legacyId.value" },
      agency_name: { field: "customFields.agencyName.value" },
      // Round-trip the "doesn't apply" assertion back to native: the null
      // sourced from `source` on the CG side becomes `source_url: null` again.
      source_url: { field: "source" },
      summary: {
        applicant_types: { field: "customFields.applicantTypes.value" },
      },
    },
  },
  handlers: { join: joinFields, split: splitField },
  commonModel: ExtendedOpportunitySchema,
});

// ############################################################################
// Step 5 — Plug the compiled transforms into a plugin definition
// ############################################################################

// Consolidated per-object input: customFields, toCommon, and fromCommon all live
// on the same transformSchemas[Opportunity] entry, so authors add one entry per
// object rather than two. See the `customFields` note on ObjectSchemasInput in
// extensions/types.ts for the cross-package-merge trade-off this involves.
const grantsGovPlugin = definePlugin({
  meta: {
    name: "grants.gov",
    version: "0.1.0",
    sourceSystem: "grants.gov",
    capabilities: ["customFields", "transforms"],
  },
  transformSchemas: {
    Opportunity: { customFields: customFieldSpecs, toCommon, fromCommon },
  },
} as const);

// ############################################################################
// Step 6 — Run the round trip and report
// ############################################################################

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const toCommonResult = grantsGovPlugin.transformSchemas?.Opportunity?.toCommon?.(SOURCE_DATA);
if (!toCommonResult) fail("transformSchemas.Opportunity.toCommon missing");
if (toCommonResult.errors.length > 0) {
  // The source data in this example is fixed and PII-free, so embedding
  // `e.message` here is safe. Production adopters: `PluginError.message` can
  // carry source values on the Zod-validation path (Zod's default error map
  // embeds runtime values). See the README PII warning before copying this
  // logging shape.
  fail(
    `toCommon failed: ${toCommonResult.errors
      .map(e => `[${e.path ?? "?"}] ${e.message}`)
      .join("; ")}`
  );
}

// The console output below dumps the entire transform result for demonstration.
// Production callers should not log `result` without a PII review — applicant
// records, EINs, and free-text fields routinely flow through `customFields`.
console.log("=== toCommon (native → CommonGrants) ===");
console.log(JSON.stringify(toCommonResult.result, null, 2));

const fromCommonResult = grantsGovPlugin.transformSchemas?.Opportunity?.fromCommon?.(
  toCommonResult.result
);
if (!fromCommonResult) fail("transformSchemas.Opportunity.fromCommon missing");
if (fromCommonResult.errors.length > 0) {
  // Same PII caveat as the toCommon error block above — `e.message` may carry
  // source values on the Zod path. Safe here because the example data is fixed.
  fail(
    `fromCommon failed: ${fromCommonResult.errors
      .map(e => `[${e.path ?? "?"}] ${e.message}`)
      .join("; ")}`
  );
}

console.log("\n=== fromCommon (CommonGrants → native) ===");
console.log(JSON.stringify(fromCommonResult.result, null, 2));

// Spot-check a covered field round-trips.
const native = fromCommonResult.result as {
  data: { opportunity_number: string; source_url: string | null | undefined };
};
if (native.data.opportunity_number !== SOURCE_DATA.data.opportunity_number) {
  fail(
    `round-trip mismatch on opportunity_number: ${native.data.opportunity_number} ≠ ${SOURCE_DATA.data.opportunity_number}`
  );
}

// ADR-0024 three-state pin: an explicit `null` ("doesn't apply") on the
// source side must survive both transforms as a real `null`, not collapse
// to undefined ("not provided"). A future regression that put `undefined`
// here instead of `null` would fail this check.
if (native.data.source_url !== null) {
  fail(
    `three-state mismatch on source_url: expected explicit null ("doesn't apply"), got ${JSON.stringify(
      native.data.source_url
    )}`
  );
}

console.log("\n✓ round-trip verified for fields covered by both mappings");
console.log("✓ ADR-0024 three-state preserved: source_url null ('doesn't apply') round-tripped");
