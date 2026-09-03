/**
 * Ajv validator for the generated per-version protocol schemas.
 *
 * Each version's schema directory is overlaid on the unversioned set, because
 * the versioned directories are incomplete on their own. Known limitation: a
 * model missing from a version's directory silently falls back to today's
 * shape — which is why `requireVersioned` exists.
 *
 * `unevaluatedProperties` is stripped (ajv misreports declared properties on
 * `allOf` + sibling `properties`), so sealing is NOT enforced: an undeclared
 * property passes here. Formats are validated by an explicit map; `time`
 * deliberately follows the protocol's HH:mm:ss rather than RFC 3339 full-time.
 *
 * The versioned schemas are gitignored build output — run
 * `pnpm --filter website run build` first. Missing schemas raise, never skip.
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

/** The command that produces both directories. */
const GENERATE_HINT = "pnpm --filter website run build";

/**
 * Formats the protocol uses. Anything not listed is ignored by ajv under
 * `strict: false`.
 */
const FORMATS: Record<string, RegExp> = {
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  date: /^\d{4}-\d{2}-\d{2}$/,
  "date-time":
    /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})?$/,
  // The protocol's HH:mm:ss, not RFC 3339 full-time — see module docstring.
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

/** Whether the generated schema directories are present on disk. */
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

/** Recursively removes `unevaluatedProperties` — see module docstring. */
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
 * unversioned schemas overlaid with that version's. `strict: false` lets the
 * generated schemas' `examples` keywords through.
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
   * Require the schema to come from the versioned directory rather than the
   * unversioned fallback. Without it, a model the version lacks resolves to
   * today's shape and every assertion passes while checking the wrong thing.
   * Pass `true` whenever the version is supposed to have its own copy.
   */
  requireVersioned?: boolean;
}

/** Compiles one model's schema as a given protocol version defines it. */
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
