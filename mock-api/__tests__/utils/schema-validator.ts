/**
 * Ajv validator for the generated per-version protocol schemas (#1077-T4).
 *
 * Follows the whole-directory `addSchema` approach in
 * `website/src/lib/validation.ts:createAjvWithSchemas` and
 * `lib/ts-sdk/__tests__/utils/ajv-validator.ts`: load every schema into one Ajv
 * instance and let ajv resolve `$ref`s by `$id` rather than pre-dereferencing.
 *
 * Why not `$RefParser.dereference` (the approach in
 * `website/src/lib/schema/ref-resolver.ts`): the versioned output directories are
 * incomplete on their own, so dereferencing dies with ENOENT. `uuid.yaml` is
 * absent from all four versioned directories, and dereferencing v0.1.0's
 * `OpportunityBase` fails on `OppStatus.yaml`. Overlaying the versioned directory
 * on top of the unversioned `public/schemas/yaml/` set fills those gaps while
 * letting the versioned copy win wherever it exists.
 *
 * KNOWN LIMITATION of that overlay — a `$ref` target missing from a version's
 * directory falls back to the *current* schema, so it is validated against
 * today's shape rather than a genuine historical one. For invariant scalars
 * (`uuid.yaml`, no changelog entries) that is harmless. It is not harmless for
 * models: `ApplicantType`, `OppStatus`, `CompetitionStatus`, `AppStatus`, and
 * `FormResponseStatus` are emitted *only* into `versions/v0.4.0/` even though the
 * changelog records them as added in 0.2.0 or earlier. Because v0.2.0's
 * `OpportunityBase` does `$ref: ApplicantType.yaml`, this suite checks v0.2.0 and
 * v0.3.0 `acceptedApplicantTypes` (and every version's `status`) against the
 * current shape. The cause is upstream in
 * `website/src/lib/schema/version-generator.ts` (`getSchemaExistence` skips its
 * "stop past the target version" check when a version has no changelog entry, so
 * a duplicate "Added" log at 0.4.0 overwrites the true added-version), not
 * something this suite can correct. So: this catches drift in the opportunity
 * models' own fields, and does NOT catch drift in the enum/status models they
 * reference. #1077-T7 should record that split.
 *
 * The schema directories are gitignored build output, so they must be generated
 * before this runs — `pnpm --filter @common-grants/mock-api run schemas`, which
 * `ci` does for you. Missing schemas raise here rather than skipping: a skipped
 * conformance suite reads as a green CI run that validated nothing.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import yaml from "js-yaml";
import type { ShapeVariant, Version } from "../../src/data/fixtures";

const UTILS_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Unversioned (current) protocol schemas — the fallback layer. */
const SCHEMAS_DIR = path.resolve(UTILS_DIR, "../../../website/public/schemas/yaml");

/** Per-version schemas, one directory per version (`v0.3.0/`). */
const VERSIONS_DIR = path.join(SCHEMAS_DIR, "versions");

/** The command that produces both directories, quoted in the error path below. */
const GENERATE_HINT = "pnpm --filter @common-grants/mock-api run schemas";

/** A compiled validator for one (version, variant) pair. */
export interface OpportunityValidator {
  /** File name of the schema actually used, e.g. `"OpportunityDetails.yaml"`. */
  schemaName: string;
  /** True when the version has no `OpportunityDetails` and `OpportunityBase` stood in. */
  isFallback: boolean;
  /** Validates `data`, returning whether it conforms. */
  validate(data: unknown): boolean;
  /** Readable errors from the most recent `validate()` call ("" when it passed). */
  errorText(): string;
}

/**
 * Whether the generated schema directories are present on disk.
 *
 * @returns True when both the unversioned and versioned schema sets exist.
 */
export function schemasAvailable(): boolean {
  if (!existsSync(SCHEMAS_DIR) || !existsSync(VERSIONS_DIR)) {
    return false;
  }
  return readdirSync(VERSIONS_DIR, { withFileTypes: true }).some(
    entry => entry.isDirectory() && entry.name.startsWith("v")
  );
}

/** Loads every `*.yaml` in a directory, keyed by file name. */
function loadSchemaDir(dir: string): Map<string, object> {
  const schemas = new Map<string, object>();
  if (!existsSync(dir)) {
    return schemas;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) {
      continue;
    }
    const parsed = yaml.load(readFileSync(path.join(dir, entry.name), "utf-8"));
    if (parsed !== null && typeof parsed === "object") {
      schemas.set(entry.name, parsed);
    }
  }

  return schemas;
}

/**
 * Builds an Ajv instance holding one version's view of the protocol: the
 * unversioned schemas, overlaid with that version's generated schemas.
 *
 * `strict: false` is what lets the generated schemas' `examples` keywords through,
 * matching `createAjvWithSchemas` in `website/src/lib/validation.ts`. Formats are
 * validated for real via `ajv-formats`, following
 * `lib/ts-sdk/__tests__/utils/ajv-validator.ts` rather than the website's
 * permissive `formats` map: the website is a renderer that must not reject a
 * documented example over a format technicality, whereas this suite exists to
 * catch drift, and a non-UUID id or malformed `date-time` is drift worth failing on.
 *
 * `time` is the one format overridden back to the protocol's own definition.
 * `isoTime.yaml` emits `format: time` but describes itself as "a time on a clock,
 * without a timezone, in ISO 8601 format HH:mm:ss" and publishes `17:00:00` as its
 * example — while JSON Schema's `time` is RFC 3339 `full-time`, which requires a
 * UTC offset. Strict `ajv-formats` therefore rejects the protocol's own documented
 * example (and `Fields.Event`'s, at `lib/core/lib/core/fields/event.tsp:137`), so
 * every conformant implementation would fail here, not just this fixture. The
 * override matches the declared intent; the mismatch itself is a protocol finding
 * for #1077-T7, not something to paper over silently.
 */
function buildAjv(version: Version): Ajv2020 {
  const merged = loadSchemaDir(SCHEMAS_DIR);
  for (const [name, schema] of loadSchemaDir(path.join(VERSIONS_DIR, `v${version}`))) {
    merged.set(name, schema);
  }

  const ajv = new Ajv2020({
    allErrors: true,
    verbose: true,
    strict: false,
    validateFormats: true,
  });
  addFormats(ajv);
  // Must follow addFormats, which registers the strict RFC 3339 `time` this replaces.
  ajv.addFormat("time", /^\d{2}:\d{2}:\d{2}$/);

  for (const [name, schema] of merged) {
    try {
      ajv.addSchema(schema, name);
    } catch (cause) {
      throw new Error(`Could not register schema ${name} for v${version}`, { cause });
    }
  }

  return ajv;
}

/** One Ajv instance per version — building it parses ~150 YAML files. */
const ajvByVersion = new Map<Version, Ajv2020>();

function ajvFor(version: Version): Ajv2020 {
  const cached = ajvByVersion.get(version);
  if (cached) {
    return cached;
  }

  if (!schemasAvailable()) {
    throw new Error(
      `Generated schemas not found under ${VERSIONS_DIR}. Run \`${GENERATE_HINT}\` first.`
    );
  }

  const ajv = buildAjv(version);
  ajvByVersion.set(version, ajv);
  return ajv;
}

/** Formats ajv errors as one `instancePath: message` per line. */
function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) {
    return "";
  }
  return errors.map(err => `${err.instancePath || "<root>"}: ${err.message}`).join("; ");
}

/**
 * Compiles the schema a given endpoint variant emits for a given version.
 *
 * The list endpoint emits `OpportunityBase` and the single-item read emits
 * `OpportunityDetails` — except for v0.1.0, which predates
 * `OpportunityDetails`; there the detail variant falls back to
 * `OpportunityBase`, which is what the mock actually serves for v0.1.
 *
 * @param version - Target protocol version.
 * @param variant - `"list"` (OpportunityBase) or `"detail"` (OpportunityDetails).
 * @returns A validator carrying the resolved schema name and last-error text.
 */
export function getOpportunityValidator(
  version: Version,
  variant: ShapeVariant
): OpportunityValidator {
  const ajv = ajvFor(version);

  const preferred = variant === "list" ? "OpportunityBase.yaml" : "OpportunityDetails.yaml";
  const versionedPath = path.join(VERSIONS_DIR, `v${version}`, preferred);
  const isFallback = !existsSync(versionedPath);
  const schemaName = isFallback ? "OpportunityBase.yaml" : preferred;

  const validate = ajv.getSchema(schemaName) as ValidateFunction | undefined;
  if (!validate) {
    throw new Error(`Schema ${schemaName} is not registered for v${version}`);
  }

  return {
    schemaName,
    isFallback,
    validate: (data: unknown) => validate(data) as boolean,
    errorText: () => formatErrors(validate.errors),
  };
}
