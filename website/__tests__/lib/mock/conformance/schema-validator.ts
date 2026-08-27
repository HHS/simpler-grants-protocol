/**
 * Ajv validator for the generated per-version protocol schemas.
 *
 * Ported from the 3A standalone Worker's `mock-api/__tests__/utils/schema-validator.ts`
 * (#1077-T4, branch `karina/1077-cloudflareworkermock`), which #1078-T1's port to
 * this site left behind — the conformance suite was the one piece of the Worker's
 * test surface that did not come across. #3C-2-T1 brings it over and generalizes
 * it from "the opportunity schemas" to "any model, any version", because the new
 * resources need the same guard and there is no reason for two mechanisms.
 *
 * Follows the whole-directory `addSchema` approach in
 * `src/lib/validation.ts:createAjvWithSchemas` and
 * `lib/ts-sdk/__tests__/utils/ajv-validator.ts`: load every schema into one Ajv
 * instance and let ajv resolve `$ref`s by `$id` rather than pre-dereferencing.
 *
 * Why not `$RefParser.dereference` (the approach in `src/lib/schema/ref-resolver.ts`):
 * the versioned output directories are incomplete on their own, so dereferencing
 * dies with ENOENT — `uuid.yaml` is absent from all four versioned directories,
 * and dereferencing v0.1.0's `OpportunityBase` fails on `OppStatus.yaml`.
 * Overlaying the versioned directory on top of the unversioned
 * `public/schemas/yaml/` set fills those gaps while letting the versioned copy
 * win wherever it exists.
 *
 * KNOWN LIMITATION of that overlay, carried over verbatim from #1077-T4 because
 * the cause is still upstream: a `$ref` target missing from a version's
 * directory falls back to the *current* schema, so it is validated against
 * today's shape rather than a genuine historical one. For invariant scalars
 * (`uuid.yaml`, no changelog entries) that is harmless. It is not harmless for
 * models: `ApplicantType`, `OppStatus`, `CompetitionStatus`, `AppStatus`, and
 * `FormResponseStatus` are emitted *only* into `versions/v0.4.0/` even though the
 * changelog records them as added in 0.2.0 or earlier. The cause is in
 * `src/lib/schema/version-generator.ts` (`getSchemaExistence` skips its "stop
 * past the target version" check when a version has no changelog entry, so a
 * duplicate "Added" log at 0.4.0 overwrites the true added-version), not
 * something this suite can correct. So: this catches drift in the resource
 * models' own fields, and does NOT catch drift in the enum/status models they
 * reference.
 *
 * **Two deliberate configuration choices, both departures from a sibling:**
 *
 * 1. `unevaluatedProperties` is stripped, matching
 *    `createAjvWithSchemas`. TypeSpec emits `unevaluatedProperties: {not: {}}`
 *    on every model to seal it, but ajv cannot evaluate that correctly on the
 *    schemas here that combine `allOf: [$ref]` with sibling `properties` —
 *    `AwdIds` and `OrgIds` both do, extending `IdentifierCollection` — and it
 *    then reports *declared* properties as unevaluated. Keeping it would fail
 *    every award and organization fixture for a reason that is about ajv rather
 *    than about the data. The cost is real and worth naming: sealing is not
 *    enforced, so a fixture carrying a property the model does not declare
 *    passes here. The per-resource handler suites are what pin the shape;
 *    this suite pins the *types and required fields* of what is declared.
 *
 * 2. Formats are validated for real, but by an explicit map rather than
 *    `ajv-formats`. The 3A version used `ajv-formats` plus a `time` override;
 *    this one skips the dependency (it is not in `website`'s tree and adding it
 *    for one test helper is not worth a lockfile change) and defines the six
 *    formats the protocol actually uses. That is strictly stronger than
 *    `createAjvWithSchemas`, which maps every format to `true` — a renderer must
 *    not reject a documented example over a format technicality, whereas this
 *    suite exists to catch drift, and a non-UUID id or a malformed `date-time`
 *    is drift worth failing on.
 *
 *    `time` is defined as the protocol defines it, not as JSON Schema does:
 *    `isoTime.yaml` emits `format: time` while describing itself as "a time on a
 *    clock, without a timezone, in ISO 8601 format HH:mm:ss" and publishing
 *    `17:00:00` as its example — whereas JSON Schema's `time` is RFC 3339
 *    `full-time`, which requires a UTC offset. A strict reading would reject the
 *    protocol's own documented example (and `Fields.Event`'s, at
 *    `lib/core/lib/core/fields/event.tsp:137`), so every conformant
 *    implementation would fail here, not just this fixture. The mismatch itself
 *    is a protocol finding, not something to paper over silently.
 *
 * The versioned schema directory is gitignored build output
 * (`website/.gitignore`: `public/schemas/yaml/versions/**`), so it must be
 * generated before this runs — `pnpm --filter website run build`, or just the
 * `typespec` + `generate` steps. Missing schemas raise rather than skip: a
 * skipped conformance suite reads as a green CI run that validated nothing.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import yaml from "js-yaml";
import type { Version } from "@/lib/mock/data/fixtures";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Unversioned (current) protocol schemas — the fallback layer. */
const SCHEMAS_DIR = path.resolve(HERE, "../../../../public/schemas/yaml");

/** Per-version schemas, one directory per version (`v0.3.0/`). */
const VERSIONS_DIR = path.join(SCHEMAS_DIR, "versions");

/** The command that produces both directories, quoted in the error path below. */
const GENERATE_HINT = "pnpm --filter website run build";

/**
 * Formats the protocol actually uses, validated for real. Anything not listed
 * is ignored by ajv under `strict: false` — which is correct, since a format
 * this map doesn't know is a format the protocol didn't ask for.
 */
const FORMATS: Record<string, RegExp> = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  date: /^\d{4}-\d{2}-\d{2}$/,
  "date-time":
    /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})?$/,
  // The protocol's own definition (HH:mm:ss), not RFC 3339 full-time — see the
  // module docstring.
  time: /^\d{2}:\d{2}:\d{2}$/,
  email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
  uri: /^[a-z][a-z0-9+.-]*:/i,
};

/** A compiled validator for one (version, schema) pair. */
export interface SchemaValidator {
  /** File name of the schema used, e.g. `"AwardBase.yaml"`. */
  schemaName: string;
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
    (entry) => entry.isDirectory() && entry.name.startsWith("v"),
  );
}

/** Whether a version's generated schema set contains a given model. */
export function schemaExistsForVersion(
  version: Version,
  schemaName: string,
): boolean {
  return existsSync(path.join(VERSIONS_DIR, `v${version}`, schemaName));
}

/** Loads every `*.yaml` in a directory, keyed by file name. */
function loadSchemaDir(dir: string): Map<string, Record<string, unknown>> {
  const schemas = new Map<string, Record<string, unknown>>();
  if (!existsSync(dir)) {
    return schemas;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) {
      continue;
    }
    const parsed = yaml.load(readFileSync(path.join(dir, entry.name), "utf-8"));
    if (parsed !== null && typeof parsed === "object") {
      schemas.set(entry.name, parsed as Record<string, unknown>);
    }
  }

  return schemas;
}

/**
 * Recursively removes `unevaluatedProperties` from a schema. See choice 1 in the
 * module docstring for why, and what it costs.
 */
function stripUnevaluated(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(stripUnevaluated);
  }
  if (node === null || typeof node !== "object") {
    return node;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "unevaluatedProperties") continue;
    result[key] = stripUnevaluated(value);
  }
  return result;
}

/**
 * Builds an Ajv instance holding one version's view of the protocol: the
 * unversioned schemas, overlaid with that version's generated schemas.
 *
 * `strict: false` is what lets the generated schemas' `examples` keywords
 * through, matching `createAjvWithSchemas` in `src/lib/validation.ts`.
 */
function buildAjv(version: Version): Ajv2020 {
  const merged = loadSchemaDir(SCHEMAS_DIR);
  for (const [name, schema] of loadSchemaDir(
    path.join(VERSIONS_DIR, `v${version}`),
  )) {
    merged.set(name, schema);
  }

  const ajv = new Ajv2020({
    allErrors: true,
    verbose: true,
    strict: false,
    validateFormats: true,
  });
  for (const [name, pattern] of Object.entries(FORMATS)) {
    ajv.addFormat(name, pattern);
  }

  for (const [name, schema] of merged) {
    const prepared = stripUnevaluated({ ...schema, $id: name }) as Record<
      string,
      unknown
    >;
    try {
      ajv.addSchema(prepared, name);
    } catch (cause) {
      throw new Error(`Could not register schema ${name} for v${version}`, {
        cause,
      });
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
      `Generated schemas not found under ${VERSIONS_DIR}. Run \`${GENERATE_HINT}\` first.`,
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
  return errors
    .map((err) => `${err.instancePath || "<root>"}: ${err.message}`)
    .join("; ");
}

/** Options for `getValidator`. */
export interface GetValidatorOptions {
  /**
   * Require the schema to come from the *versioned* directory rather than the
   * unversioned fallback layer.
   *
   * This exists because the overlay is load-bearing and dangerous in equal
   * measure. It is load-bearing: `uuid.yaml` is absent from every versioned
   * directory, so without a fallback nothing would resolve at all. It is
   * dangerous: a model that a version genuinely lacks — or that went missing
   * from the generated output — still resolves, to *today's* shape, and every
   * assertion against it would pass while checking the wrong thing. That is
   * precisely the "green CI over a downgraded schema" failure #1077-T4 flagged.
   *
   * So the choice is made per call rather than globally. Pass `true` when the
   * version is supposed to have its own copy (every resource model in the
   * conformance suite). Leave it off for the deliberate fallbacks — v0.1's
   * detail read, which really is served as `OpportunityBase`, and the invariant
   * scalars.
   */
  requireVersioned?: boolean;
}

/**
 * Compiles one model's schema as a given protocol version defines it.
 *
 * @param version - Target protocol version.
 * @param schemaName - Schema file name, e.g. `"AwardBase.yaml"`.
 * @param options - See `GetValidatorOptions`.
 * @returns A validator carrying the schema name and last-error text.
 * @throws When the schema is registered nowhere, or when `requireVersioned` is
 * set and the version's own directory does not contain it.
 */
export function getValidator(
  version: Version,
  schemaName: string,
  options: GetValidatorOptions = {},
): SchemaValidator {
  const ajv = ajvFor(version);

  if (
    options.requireVersioned === true &&
    !schemaExistsForVersion(version, schemaName)
  ) {
    throw new Error(
      `Schema ${schemaName} is not registered for v${version} (absent from ${path.join(
        VERSIONS_DIR,
        `v${version}`,
      )}; the unversioned fallback would have supplied today's shape instead)`,
    );
  }

  const validate = ajv.getSchema(schemaName) as ValidateFunction | undefined;
  if (!validate) {
    throw new Error(`Schema ${schemaName} is not registered for v${version}`);
  }

  return {
    schemaName,
    validate: (data: unknown) => validate(data) as boolean,
    errorText: () => formatErrors(validate.errors),
  };
}
