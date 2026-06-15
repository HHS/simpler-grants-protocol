/**
 * Example script demonstrating bidirectional transforms through `definePlugin()`.
 *
 * Runs real data through each authoring path and verifies the round trip. It does
 * not call `buildTransforms()` directly — `definePlugin()` compiles the declarative
 * `mappings` internally. (The schema-only path, plus the schema-only / XOR
 * compile-time guarantees, are covered in `__tests__/extensions/define-plugin.spec.ts`.)
 *
 * Paths shown:
 *   1. Custom fields + declarative `mappings`   → definePlugin compiles them
 *   2. Custom fields + hand-written functions    → `ToCommon` / `FromCommon`
 *   3. Transforms with no custom fields          → base CommonGrants schema
 *   X. `mappings` + functions on one entry       → rejected (mappings XOR functions)
 *
 * Run with: `pnpm example:transforms`
 *
 * @remarks
 * The mappings path validates `toCommon` output against the extended common
 * schema, so date strings are parsed into `Date` objects on the common side.
 * The round-trip checks below therefore assert on fields that survive verbatim
 * (ids, the three-state `source` null), not on the parsed date fields.
 */

import { z } from "zod";

import { CustomFieldType } from "../src/constants";
import {
  definePlugin,
  type FromCommon,
  type ToCommon,
  type TransformResult,
} from "../src/extensions";

// ############################################################################
// Shared setup — source schema, sample data, custom fields
// ############################################################################

// Stands in for a real grants.gov payload schema. In a real plugin this would be
// imported from wherever the source-system types live.
const GrantsGovOpportunity = z.object({
  data: z.object({
    opportunity_uuid: z.string().uuid(),
    opportunity_id: z.number().int(),
    opportunity_title: z.string(),
    opportunity_description: z.string(),
    opportunity_status: z.string(),
    // `source_url: null` below is the publisher actively asserting "doesn't
    // apply" (three-state null). The transforms preserve it as `null` end to end
    // rather than collapsing it to absent.
    source_url: z.string().url().nullish(),
    created_at: z.string(),
    last_modified_at: z.string(),
  }),
});
type GrantsGovSource = z.infer<typeof GrantsGovOpportunity>;

const SOURCE_DATA: GrantsGovSource = {
  data: {
    opportunity_uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    opportunity_id: 12345,
    opportunity_title: "Research into conservation techniques",
    opportunity_description: "Funding to advance conservation research.",
    opportunity_status: "posted",
    source_url: null,
    created_at: "2025-01-15T09:00:00Z",
    last_modified_at: "2025-04-01T12:30:00Z",
  },
};

// Declared inline at each call below, but kept here too for the hand-written
// path, which needs `typeof customFields` for its helper-type annotations.
const customFields = {
  legacyId: {
    fieldType: CustomFieldType.integer,
    value: z.number().int(),
    description: "Numeric ID from the legacy system (round-trip preserved).",
  },
} as const;

// ############################################################################
// Path 1 — custom fields + declarative mappings
// ############################################################################

// definePlugin() compiles these mappings into toCommon / fromCommon using the
// built-in handlers (`field`, `match`, `const`). No buildTransforms() call here.
const mappingsPlugin = definePlugin({
  meta: { name: "grants.gov (mappings)", sourceSystem: "grants.gov" },
  schemas: {
    Opportunity: {
      customFields,
      sourceSchema: GrantsGovOpportunity,
      mappings: {
        toCommon: {
          id: { field: "data.opportunity_uuid" },
          title: { field: "data.opportunity_title" },
          description: { field: "data.opportunity_description" },
          // Three-state null: a terminal `null` is preserved as a real null.
          source: { field: "data.source_url" },
          createdAt: { field: "data.created_at" },
          lastModifiedAt: { field: "data.last_modified_at" },
          status: {
            value: {
              match: {
                field: "data.opportunity_status",
                case: { posted: "open", archived: "closed" },
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
          },
        },
        fromCommon: {
          data: {
            opportunity_uuid: { field: "id" },
            opportunity_title: { field: "title" },
            opportunity_description: { field: "description" },
            source_url: { field: "source" },
            created_at: { field: "createdAt" },
            last_modified_at: { field: "lastModifiedAt" },
            opportunity_status: { const: "posted" },
            opportunity_id: { field: "customFields.legacyId.value" },
          },
        },
      },
    },
  },
});

// ############################################################################
// Path 2 — custom fields + hand-written functions
// ############################################################################

// The author annotates the functions with `ToCommon` / `FromCommon`, passing the
// same inputs `definePlugin()` uses — `model`, `sourceSchema`, and the
// `customFields` specs they already have. The SDK resolves the common type from
// those (no need to build or borrow a `commonSchema`). One common type is used
// for both directions: the common date schemas accept either a string or a
// `Date`, so the author builds and returns real `Date` values here, and reads
// `Date` values back in `fromCommon`.
type OpportunityTransform = {
  model: "Opportunity";
  sourceSchema: typeof GrantsGovOpportunity;
  customFields: typeof customFields;
};

// The functions path is the override path for logic the declarative mappings
// can't express — here, a status flag derived in code rather than via `match`.
const toCommon: ToCommon<OpportunityTransform> = source => ({
  result: {
    id: source.data.opportunity_uuid,
    title: source.data.opportunity_title,
    description: source.data.opportunity_description,
    source: source.data.source_url,
    status: { value: source.data.opportunity_status === "posted" ? "open" : "custom" },
    createdAt: new Date(source.data.created_at),
    lastModifiedAt: new Date(source.data.last_modified_at),
    customFields: {
      legacyId: { name: "legacyId", fieldType: "integer", value: source.data.opportunity_id },
    },
  },
  errors: [],
});

const fromCommon: FromCommon<OpportunityTransform> = common => ({
  result: {
    data: {
      opportunity_uuid: common.id,
      opportunity_id: common.customFields?.legacyId?.value ?? 0,
      opportunity_title: common.title,
      opportunity_description: common.description,
      opportunity_status: "posted",
      source_url: common.source ?? null,
      // `createdAt` / `lastModifiedAt` arrive as `Date`; render back to strings.
      created_at: common.createdAt.toISOString(),
      last_modified_at: common.lastModifiedAt.toISOString(),
    },
  },
  errors: [],
});

const functionsPlugin = definePlugin({
  meta: { name: "grants.gov (functions)", sourceSystem: "grants.gov" },
  schemas: {
    Opportunity: { customFields, sourceSchema: GrantsGovOpportunity, toCommon, fromCommon },
  },
});

// ############################################################################
// Path 3 — transforms with no custom fields
// ############################################################################

// Omit `customFields`; the common schema is the base CommonGrants Opportunity.
const noCustomFieldsPlugin = definePlugin({
  meta: { name: "grants.gov (no custom fields)", sourceSystem: "grants.gov" },
  schemas: {
    Opportunity: {
      sourceSchema: GrantsGovOpportunity,
      mappings: {
        toCommon: {
          id: { field: "data.opportunity_uuid" },
          title: { field: "data.opportunity_title" },
          description: { field: "data.opportunity_description" },
          source: { field: "data.source_url" },
          createdAt: { field: "data.created_at" },
          lastModifiedAt: { field: "data.last_modified_at" },
          status: {
            value: {
              match: {
                field: "data.opportunity_status",
                case: { posted: "open", archived: "closed" },
                default: "custom",
              },
            },
          },
        },
        fromCommon: {
          data: {
            opportunity_uuid: { field: "id" },
            opportunity_title: { field: "title" },
            opportunity_description: { field: "description" },
            source_url: { field: "source" },
            created_at: { field: "createdAt" },
            last_modified_at: { field: "lastModifiedAt" },
            opportunity_status: { const: "posted" },
          },
        },
      },
    },
  },
});

// ############################################################################
// Path X — mappings + functions on one entry is rejected (XOR)
// ############################################################################

// Providing both `mappings` and explicit callables is a compile error and a
// runtime error. Wrapped here so the runtime backstop can be demonstrated
// without aborting the script.
function demonstrateXorIsRejected(): void {
  try {
    definePlugin({
      schemas: {
        Opportunity: {
          sourceSchema: GrantsGovOpportunity,
          mappings: { toCommon: {}, fromCommon: {} },
          // @ts-expect-error — mappings XOR functions: cannot provide both on one entry
          toCommon,
        },
      },
    });
    fail("path X: expected definePlugin to reject mappings + functions");
  } catch {
    console.log("path X (XOR): mappings + functions rejected at runtime, too");
  }
}

// ############################################################################
// Run the round trips and report
// ############################################################################

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function check(label: string, condition: boolean): void {
  if (!condition) fail(`✗ ${label}`);
  console.log(`✓ ${label}`);
}

function reportErrors(label: string, result: TransformResult<unknown>): void {
  // Source data here is fixed and PII-free, so printing messages is safe.
  // Production adopters: `TransformError.message` can carry source values on the
  // Zod-validation path — see the README PII warning before copying this shape.
  if (result.errors.length > 0) {
    fail(
      `${label} produced errors: ${result.errors.map(e => `[${e.path ?? "?"}] ${e.message}`).join("; ")}`
    );
  }
}

function roundTrip(
  label: string,
  plugin: { schemas: { Opportunity: { toCommon?: unknown; fromCommon?: unknown } } },
  opts: { expectLegacyId: boolean }
): void {
  // The harness drives every plugin through one shape; the resolved common
  // output type read off a built plugin is fine here (this is test plumbing, not
  // the author-facing annotation the functions path above demonstrates).
  type HarnessCommon = z.output<typeof mappingsPlugin.schemas.Opportunity.commonSchema>;
  const opp = plugin.schemas.Opportunity;
  const toCommonFn = opp.toCommon as (s: GrantsGovSource) => TransformResult<HarnessCommon>;
  const fromCommonFn = opp.fromCommon as (c: HarnessCommon) => TransformResult<GrantsGovSource>;

  const common = toCommonFn(SOURCE_DATA);
  reportErrors(`${label} toCommon`, common);

  const back = fromCommonFn(common.result);
  reportErrors(`${label} fromCommon`, back);

  // The uuid round-trips verbatim in every path (unlike the parsed date fields).
  check(
    `${label}: opportunity_uuid round-trips`,
    back.result.data.opportunity_uuid === SOURCE_DATA.data.opportunity_uuid
  );
  // Three-state null survives both directions as a real null, not undefined.
  check(
    `${label}: source_url null ('doesn't apply') preserved`,
    back.result.data.source_url === null
  );
  // The legacy id only round-trips when a custom field carries it across.
  if (opts.expectLegacyId) {
    check(`${label}: legacy opportunity_id round-trips`, back.result.data.opportunity_id === 12345);
  }
}

function main(): void {
  console.log("=== Transforms via definePlugin ===\n");

  console.log("--- Path 1: declarative mappings ---");
  // `mappings` is kept on the entry for inspection (absent on the functions path).
  check("mappings inspectable", mappingsPlugin.schemas.Opportunity.mappings !== undefined);
  roundTrip("mappings", mappingsPlugin, { expectLegacyId: true });

  console.log("\n--- Path 2: hand-written functions ---");
  check(
    "mappings absent (functions path)",
    functionsPlugin.schemas.Opportunity.mappings === undefined
  );
  roundTrip("functions", functionsPlugin, { expectLegacyId: true });

  console.log("\n--- Path 3: no custom fields ---");
  check("customFields absent", noCustomFieldsPlugin.schemas.Opportunity.customFields === undefined);
  roundTrip("base", noCustomFieldsPlugin, { expectLegacyId: false });

  console.log("\n--- Path X: mappings XOR functions ---");
  demonstrateXorIsRejected();

  console.log("\n=== Example complete ===");
}

main();
