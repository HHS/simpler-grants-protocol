/**
 * Round-trip validation using the @common-grants/cg-grants-gov plugin.
 *
 * Fetches a real opportunity from Simpler.Grants.gov, transforms it to
 * CommonGrants format via `toCommon`, then back to the source format via
 * `fromCommon`, and validates that key fields were preserved.
 *
 * Run with: pnpm example:grants-gov [opportunityId]
 *   or set GRANTS_GOV_OPP_ID and run: pnpm example:grants-gov
 */

import plugin, { GrantsGovOpportunitySchema } from "@common-grants/cg-grants-gov";
import { Client, Auth } from "@common-grants/sdk/client";

// ============================================================================
// Config
// ============================================================================

const oppId = process.argv[2] ?? process.env.GRANTS_GOV_OPP_ID;
const apiKey = "two_org_user_key";
const baseUrl = "http://localhost:8080";
const config = {
  baseUrl,
  auth: Auth.apiKey(apiKey),
  timeout: 5000,
};
const client = new Client(config);

if (!oppId) {
  console.error("Usage: pnpm example:grants-gov <opportunityId>");
  console.error("       or set GRANTS_GOV_OPP_ID env var");
  process.exit(1);
}

// ============================================================================
// Helpers
// ============================================================================

function fail(label: string, detail?: string): never {
  console.error(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`);
  process.exit(1);
}

function pass(label: string): void {
  console.log(`  PASS  ${label}`);
}

function check(label: string, condition: boolean, detail?: string): void {
  if (!condition) fail(label, detail);
  pass(label);
}

function toJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

type Diff = { path: string; raw: unknown; back: unknown };

function deepDiff(a: unknown, b: unknown, path = "", diffs: Diff[] = []): Diff[] {
  if (
    a !== null &&
    b !== null &&
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
    for (const k of [...keys].sort()) {
      deepDiff(aObj[k], bObj[k], path ? `${path}.${k}` : k, diffs);
    }
  } else if (Array.isArray(a) && Array.isArray(b)) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      deepDiff(a[i], b[i], `${path}[${i}]`, diffs);
    }
    if (a.length !== b.length) {
      diffs.push({ path: `${path}[len]`, raw: a.length, back: b.length });
    }
  } else if (a !== b) {
    diffs.push({ path, raw: a, back: b });
  }
  return diffs;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log(`=== Grants.gov Round-Trip Transform ===`);
  console.log(`Opportunity: ${oppId}`);
  console.log(`Base URL:    ${baseUrl}\n`);

  // 1. Fetch raw opportunity from Simpler.Grants.gov
  console.log("Fetching opportunity...");
  const path = `/v1/opportunities/${oppId}`;
  const response = await client.get(path);

  if (!response.ok) {
    fail(`HTTP ${response.status} from ${path}`, await response.text());
  }

  const body = (await response.json()) as { data: unknown };
  console.log("  fetched OK\n");
  console.log(`=== [1] RAW API RESPONSE ===\n${toJson(body.data)}\n`);

  // 2. Validate raw response shape
  console.log("Validating raw response...");
  const parseResult = GrantsGovOpportunitySchema.safeParse(body.data);
  if (!parseResult.success) {
    fail("GrantsGovOpportunitySchema.parse(body.data)", parseResult.error.message);
  }
  const raw = parseResult.data;
  console.log("  validated OK\n");

  // 3. toCommon
  console.log("Running toCommon...");
  const { result: common, errors: toErrors } = plugin.schemas.Opportunity.toCommon(raw);
  if (toErrors.length > 0) {
    fail(
      "toCommon produced errors",
      toErrors.map(e => `[${e.path ?? "?"}] ${e.message}`).join("; ")
    );
  }
  console.log("  toCommon OK\n");
  console.log(`=== [2] COMMON (toCommon output) ===\n${toJson(common)}\n`);

  // 4. fromCommon
  console.log("Running fromCommon...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { result: back, errors: fromErrors } = plugin.schemas.Opportunity.fromCommon(common as any);
  if (fromErrors.length > 0) {
    fail(
      "fromCommon produced errors",
      fromErrors.map(e => `[${e.path ?? "?"}] ${e.message}`).join("; ")
    );
  }
  console.log("  fromCommon OK\n");
  console.log(`=== [3] BACK (fromCommon output) ===\n${toJson(back)}\n`);

  // 5. Validate round-trip field preservation
  console.log("Validating round-trip field preservation...");

  // --- Exact match ---
  check(
    "opportunity_id round-trips",
    back.opportunity_id === raw.opportunity_id,
    `expected ${raw.opportunity_id}, got ${back.opportunity_id}`
  );

  check(
    "opportunity_number round-trips",
    back.opportunity_number === raw.opportunity_number,
    `expected ${raw.opportunity_number}, got ${back.opportunity_number}`
  );

  check(
    "agency_code round-trips",
    back.agency_code === raw.agency_code,
    `expected ${raw.agency_code}, got ${back.agency_code}`
  );

  check(
    "agency_name round-trips",
    back.agency_name === raw.agency_name,
    `expected ${raw.agency_name}, got ${back.agency_name}`
  );

  // --- Semantic match ---
  // Status: posted→open→posted, archived→closed→closed, forecasted→forecasted→forecasted
  const expectedStatus: Record<string, string> = {
    posted: "posted",
    archived: "closed",
    forecasted: "forecasted",
    closed: "closed",
  };
  const expectedBack = expectedStatus[raw.opportunity_status] ?? "posted";
  check(
    `opportunity_status semantic (${raw.opportunity_status} → ... → ${expectedBack})`,
    back.opportunity_status === expectedBack,
    `expected ${expectedBack}, got ${back.opportunity_status}`
  );

  // Funding amounts (skip if null in source)
  const rawFloor = raw.summary?.award_floor;
  const rawCeiling = raw.summary?.award_ceiling;

  if (rawFloor != null) {
    check(
      `award_floor round-trips (${rawFloor})`,
      back.summary?.award_floor === rawFloor,
      `expected ${rawFloor}, got ${back.summary?.award_floor}`
    );
  } else {
    pass("award_floor (null in source — skipped)");
  }

  if (rawCeiling != null) {
    check(
      `award_ceiling round-trips (${rawCeiling})`,
      back.summary?.award_ceiling === rawCeiling,
      `expected ${rawCeiling}, got ${back.summary?.award_ceiling}`
    );
  } else {
    pass("award_ceiling (null in source — skipped)");
  }

  // --- Presence check ---
  check(
    "opportunity_title preserved",
    back.opportunity_title === raw.opportunity_title,
    `expected ${raw.opportunity_title}, got ${back.opportunity_title}`
  );

  check(
    "created_at non-null",
    typeof back.created_at === "string" && back.created_at.length > 0,
    `got: ${back.created_at}`
  );

  check(
    "updated_at non-null",
    typeof back.updated_at === "string" && back.updated_at.length > 0,
    `got: ${back.updated_at}`
  );

  check(
    "assistance_listings count preserved",
    (back.opportunity_assistance_listings?.length ?? 0) ===
      (raw.opportunity_assistance_listings?.length ?? 0),
    `expected ${raw.opportunity_assistance_listings?.length ?? 0}, got ${back.opportunity_assistance_listings?.length ?? 0}`
  );

  // --- Full deep comparison: raw vs back ---
  console.log("\nRunning deepDiff (raw vs fromCommon)...");
  const diffs = deepDiff(raw, back);
  if (diffs.length > 0) {
    console.log(`  ${diffs.length} field(s) differ after round-trip:`);
    for (const { path, raw: aVal, back: bVal } of diffs) {
      console.log(`    ${path}`);
      console.log(`      raw:  ${JSON.stringify(aVal)}`);
      console.log(`      back: ${JSON.stringify(bVal)}`);
    }
  } else {
    pass("all fields identical after round-trip");
  }

  console.log("\n=== All checks passed ===");
}

main().catch(err => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
