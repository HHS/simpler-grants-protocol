/**
 * Guards the identifier registry catalog
 * (website/src/content/registries/index.json) against the TypeSpec source it
 * documents, so the two cannot drift apart silently (ticket #1219-T4):
 *
 * 1. Every registry code TypeSpec pins as a base identifier (the `Code`
 *    argument of `Fields.IdentifierT<..., "code">`) has a catalog entry with
 *    `status: "base"` naming the matching model.
 * 2. Every `status: "base"` catalog entry has a matching typed TypeSpec
 *    identifier (catalog-only `status: "extension"` entries are exempt).
 * 3. Every `registry.url` a TypeSpec `Examples.*` object declares points at
 *    the slug `registryCodeToSlug` would derive for that example's code.
 *
 * TypeSpec is scanned as text with regex rather than compiled, matching the
 * sibling conformance suites under __tests__/lib/mock/conformance: it keeps
 * this suite fast and independent of the TypeSpec compiler toolchain, and
 * the two shapes it looks for (a generic instantiation's quoted type
 * argument, an example object's `code`/`url` pair) are simple enough that a
 * text scan is both sufficient and easier to reason about than an AST walk.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { loadAllRegistries, registryCodeToSlug } from "@/lib/registries/loader";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../../..");

/**
 * The prefix-to-model mapping this ticket pins, restated here so the suite
 * has its own oracle. Asserting against the loader's derived `schema` alone
 * would compare `SCHEMA_BY_OBJECT` (loader.ts:16-20) against itself.
 */
const EXPECTED_SCHEMA_BY_PREFIX: Record<string, string> = {
  org: "Organization",
  opp: "Opportunity",
  awd: "Award",
};

/**
 * The four TypeSpec files that declare base identifiers or exemplify them.
 * `identifier.tsp` defines the `IdentifierT` template itself and its generic
 * examples; the three model files declare the registry-specific
 * instantiations.
 */
const SOURCE_FILES = [
  "lib/core/lib/core/fields/identifier.tsp",
  "lib/core/lib/core/models/organization.tsp",
  "lib/core/lib/core/models/award.tsp",
  "lib/core/lib/core/models/opportunity/base.tsp",
];

/** Reads the four TypeSpec source files as plain text. */
function readSources(): string[] {
  return SOURCE_FILES.map((file) =>
    readFileSync(path.join(REPO_ROOT, file), "utf-8"),
  );
}

/**
 * Extracts the registry codes TypeSpec pins as the `Code` argument of
 * `Fields.IdentifierT<Id, "code">`. Requiring a quoted string literal
 * naturally excludes the generic, non-registry-specific forms:
 * `IdentifierT<string, string>` (used by `Identifier`) and
 * `IdentifierT<Types.uuid>` (used by `SystemId`), neither of which quotes a
 * `Code` argument.
 */
function extractTypedIdentifierCodes(sources: string[]): Set<string> {
  const codes = new Set<string>();
  const pattern = /IdentifierT<[^,>]+,\s*"([^"]+)">/g;
  for (const text of sources) {
    for (const match of text.matchAll(pattern)) {
      codes.add(match[1]);
    }
  }
  return codes;
}

/** A `registry.code`/`registry.url` pair as declared in a TypeSpec example. */
interface ExampleUrl {
  code: string;
  url: string;
}

/**
 * Extracts `code`/`url` pairs from `Examples.*` registry objects, of the
 * form `registry: #{ code: "...", url: "..." }`. The separator is `\s*` so
 * the pair is caught whether `tsp format` leaves it across two lines or
 * collapses it onto one, and the url is captured whatever it says, so a
 * wrong host is a failure rather than a silent skip.
 */
function extractExampleUrls(sources: string[]): ExampleUrl[] {
  const pairs: ExampleUrl[] = [];
  const pattern = /code:\s*"([^"]+)",\s*url:\s*"([^"]+)"/g;
  for (const text of sources) {
    for (const match of text.matchAll(pattern)) {
      pairs.push({ code: match[1], url: match[2] });
    }
  }
  return pairs;
}

const sources = readSources();
const typedIdentifierCodes = extractTypedIdentifierCodes(sources);
const exampleUrls = extractExampleUrls(sources);
const registries = loadAllRegistries();
const baseCatalogCodes = Object.values(registries)
  .filter((registry) => registry.status === "base")
  .map((registry) => registry.code);

describe("registry catalog against TypeSpec identifier declarations (#1219-T4)", () => {
  // A silently-empty regex match is the main failure mode of a text-scraping
  // test: it would make every assertion below vacuously true.
  it("extracts at least one typed identifier and one example url, or this suite proves nothing", () => {
    expect(typedIdentifierCodes.size).toBeGreaterThan(0);
    expect(exampleUrls.length).toBeGreaterThan(0);
  });

  // =============================================================================
  // Criterion 1: every typed TypeSpec identifier has a matching base catalog entry
  // =============================================================================

  describe(`every Fields.IdentifierT<..., "code"> has a base catalog entry`, () => {
    it.each(Array.from(typedIdentifierCodes))("%s", (code) => {
      const registry = registries[code];
      const prefix = code.split(":")[0];
      const expectedSchema = EXPECTED_SCHEMA_BY_PREFIX[prefix];

      expect(
        registry,
        `TypeSpec declares a typed identifier for "${code}", but ` +
          `website/src/content/registries/index.json has no entry for it`,
      ).toBeDefined();

      expect(
        expectedSchema,
        `"${code}" uses the object prefix "${prefix}", which is not one of ` +
          `${JSON.stringify(Object.keys(EXPECTED_SCHEMA_BY_PREFIX))}`,
      ).toBeDefined();

      expect(
        registry?.status,
        `"${code}" is a typed TypeSpec identifier, so its catalog entry ` +
          `must be status: "base" (found status: "${registry?.status}")`,
      ).toBe("base");

      expect(
        registry?.models,
        `"${code}" belongs to the ${expectedSchema} model, but its catalog ` +
          `"models" (${JSON.stringify(registry?.models)}) does not include it`,
      ).toContain(expectedSchema);

      // Catches drift in the loader's own SCHEMA_BY_OBJECT map, which every
      // registry page renders as `schemaLabel`.
      expect(
        registry?.schema,
        `SCHEMA_BY_OBJECT in src/lib/registries/loader.ts resolves the ` +
          `prefix "${prefix}" to "${registry?.schema}", not "${expectedSchema}"`,
      ).toBe(expectedSchema);
    });
  });

  // =============================================================================
  // Criterion 2: every base catalog entry has a matching typed TypeSpec identifier
  // =============================================================================

  describe(`every status: "base" catalog entry has a typed TypeSpec identifier`, () => {
    it.each(baseCatalogCodes)("%s", (code) => {
      expect(
        typedIdentifierCodes.has(code),
        `"${code}" is status: "base" in website/src/content/registries/index.json, ` +
          `but no TypeSpec model declares Fields.IdentifierT<..., "${code}">`,
      ).toBe(true);
    });
  });

  // =============================================================================
  // Criterion 3: every example registry.url matches registryCodeToSlug(code)
  // =============================================================================

  describe("every Examples.* registry.url matches registryCodeToSlug(code)", () => {
    it.each(exampleUrls)("$code -> $url", ({ code, url }) => {
      const expected = `https://commongrants.org/registries/${registryCodeToSlug(code)}`;

      expect(
        url,
        `TypeSpec example for "${code}" declares url "${url}", but ` +
          `registryCodeToSlug("${code}") expects "${expected}"`,
      ).toBe(expected);
    });
  });
});
