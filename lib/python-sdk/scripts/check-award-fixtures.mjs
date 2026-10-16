#!/usr/bin/env node
/**
 * Validates serialized Python award fixtures against the emitted Core JSON Schemas.
 *
 * This is the independent oracle for the Python award models: it never looks at
 * Pydantic's own generated schema. Each fixture case names an emitted schema `$id`,
 * the wire JSON a Python model produced (or an explicit invalid control), and the
 * expected result:
 *
 *   [{ "name": "...", "schemaId": "AwardBase.yaml", "data": {...}, "expect": "valid" }]
 *
 * `expect` is one of:
 * - `valid` / `invalid`: the strict, unmodified emitted schemas must agree.
 * - `plain-time`: a documented upstream discrepancy. Core declares `isoTime` as a
 *   plain (zone-less) clock time, but the emitted `format: time` is RFC 3339
 *   full-time, which requires an offset. The case must FAIL strict validation and
 *   PASS a second validator whose only change is a plain-time `time` format.
 *
 * Usage:
 *   node check-award-fixtures.mjs --schemas <dir of emitted *.yaml> \
 *     --fixtures <cases.json> [--route-schemas <TypeSpec bundle schemas.yaml>]
 *
 * The route bundle (lib/ts-sdk tsp-output) supplies only the concrete award route
 * adapters; any `$id` already loaded from --schemas wins, so award models are always
 * checked against the pinned public schemas.
 *
 * AJV, ajv-formats and js-yaml resolve through the TS SDK's existing locked
 * dev dependencies, so this script adds no dependency of its own.
 */

import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, "../../ts-sdk/package.json"));

function fail(message) {
  console.error(`check-award-fixtures: ${message}`);
  process.exit(1);
}

let Ajv2020, addFormats, yaml;
try {
  ({ Ajv2020 } = require("ajv/dist/2020.js"));
  addFormats = require("ajv-formats");
  yaml = require("js-yaml");
} catch (err) {
  fail(
    `cannot load AJV/ajv-formats/js-yaml from lib/ts-sdk (${err.message}). ` +
      "Install them with `pnpm --filter @common-grants/sdk... install --frozen-lockfile`."
  );
}

const { values: args } = parseArgs({
  options: {
    schemas: { type: "string" },
    fixtures: { type: "string" },
    "route-schemas": { type: "string" },
  },
});
if (!args.schemas || !args.fixtures) {
  fail("--schemas and --fixtures are required");
}

// Core `plainTime`: HH:mm:ss with optional fraction and no offset.
const PLAIN_TIME = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?$/;

function loadSchemas() {
  if (!existsSync(args.schemas)) fail(`schema directory not found: ${args.schemas}`);
  const byId = new Map();
  for (const file of readdirSync(args.schemas).filter(f => f.endsWith(".yaml"))) {
    const schema = yaml.load(readFileSync(join(args.schemas, file), "utf-8"));
    byId.set(schema.$id ?? file, schema);
  }
  if (byId.size === 0) fail(`no *.yaml schemas in ${args.schemas}`);
  const routeBundle = args["route-schemas"];
  if (routeBundle) {
    if (!existsSync(routeBundle)) fail(`route schema bundle not found: ${routeBundle}`);
    const { $defs = {} } = yaml.load(readFileSync(routeBundle, "utf-8"));
    for (const [name, schema] of Object.entries($defs)) {
      const id = schema.$id ?? name;
      if (!byId.has(id)) byId.set(id, schema);
    }
  }
  return byId;
}

function buildAjv(schemas, { plainTime = false } = {}) {
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: true });
  addFormats(ajv);
  if (plainTime) ajv.addFormat("time", PLAIN_TIME);
  for (const [id, schema] of schemas) ajv.addSchema(schema, id);
  // An unenforced format is a silent no-op in AJV, so prove each one bites.
  for (const [format, bad] of [
    ["uuid", "not-a-uuid"],
    ["uri", "not a uri"],
    ["date-time", "2026-01-01T00:00:00"],
    ["date", "2026-13-01"],
    ["time", "25:00:00"],
  ]) {
    if (ajv.validate({ type: "string", format }, bad)) {
      fail(`format "${format}" is not enforced (accepted ${JSON.stringify(bad)})`);
    }
  }
  return ajv;
}

function validatorFor(ajv, id) {
  let validate;
  try {
    validate = ajv.getSchema(id);
  } catch (err) {
    fail(`schema ${id} does not compile (unresolved $ref?): ${err.message}`);
  }
  if (!validate) fail(`schema ${id} is not loaded`);
  return validate;
}

function describe(errors) {
  return (errors ?? []).map(e => `${e.instancePath || "/"} ${e.message}`).join("; ");
}

const schemas = loadSchemas();
const strict = buildAjv(schemas);
const sourceAligned = buildAjv(schemas, { plainTime: true });

if (!existsSync(args.fixtures)) fail(`fixtures file not found: ${args.fixtures}`);
const cases = JSON.parse(readFileSync(args.fixtures, "utf-8"));
if (!Array.isArray(cases) || cases.length === 0) fail("fixtures must be a non-empty array");

const names = new Set();
let mismatches = 0;
for (const c of cases) {
  if (typeof c.name !== "string" || typeof c.schemaId !== "string" || !("data" in c)) {
    fail(`malformed case: ${JSON.stringify(c).slice(0, 200)}`);
  }
  if (names.has(c.name)) fail(`duplicate case name: ${c.name}`);
  names.add(c.name);

  const validate = validatorFor(strict, c.schemaId);
  const strictOk = validate(c.data);
  let ok;
  let note = describe(validate.errors);
  if (c.expect === "valid") ok = strictOk;
  else if (c.expect === "invalid") ok = !strictOk;
  else if (c.expect === "plain-time") {
    const aligned = validatorFor(sourceAligned, c.schemaId);
    const alignedOk = aligned(c.data);
    ok = !strictOk && alignedOk;
    note = `strict=${strictOk ? "pass" : "fail"} plain-time=${alignedOk ? "pass" : "fail"}`;
    if (!alignedOk) note += ` (${describe(aligned.errors)})`;
  } else fail(`case ${c.name}: unknown expect ${JSON.stringify(c.expect)}`);

  if (ok) {
    console.log(`ok   [${c.expect}] ${c.name}`);
  } else {
    mismatches += 1;
    console.log(`FAIL [${c.expect}] ${c.name} -> ${c.schemaId}: ${note || "validated"}`);
  }
}

const tally = ["valid", "invalid", "plain-time"]
  .map(kind => `${cases.filter(c => c.expect === kind).length} ${kind}`)
  .join(", ");
console.log(`\n${cases.length} cases (${tally}); ${mismatches} mismatches`);
process.exit(mismatches === 0 ? 0 : 1);
