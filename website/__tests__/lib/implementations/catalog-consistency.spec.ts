/**
 * Guards the implementations catalog
 * (website/src/content/implementations/index.json) so a new listing can't
 * quietly break the page or drift from the protocol (ticket #1280):
 *
 * 1. Every entry has a URL-safe key, all required fields, and no unknown
 *    fields (a misspelled optional field would otherwise be dropped silently).
 * 2. Values follow the field reference on /implementations/overview/: scope
 *    comes from a fixed list, routes are "METHOD /path", URLs are https, and
 *    `apiUrl` ends in `/common-grants`.
 * 3. Every route exists in an OpenAPI document for protocol v0.4.0 or later,
 *    and every entry meets the listing condition: list and view routes for
 *    opportunities, awards, or both.
 * 4. Every custom field, plugin, and custom filter it references resolves, so
 *    the detail page's cross-links never point at nothing.
 *
 * The raw JSON is read directly rather than through the loader, because the
 * loader casts it to its TypeScript type and only logs unknown references.
 * OpenAPI versions are derived from the files in public/openapi, the way
 * award-route-status.spec.ts derives its own, so a new protocol version is
 * covered without editing this file.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import yaml from "js-yaml";
import implementationsIndex from "@/content/implementations/index.json";
import customFieldsIndex from "@/content/custom-fields/index.json";
import pluginsIndex from "@/content/plugins/index.json";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OPENAPI_DIR = path.resolve(HERE, "../../../public/openapi");

/** Fields every entry must have, matching the field reference table. */
const REQUIRED_FIELDS = [
  "name",
  "description",
  "maintainer",
  "scope",
  "sources",
  "routes",
  "apiUrl",
  "docsUrl",
  "auth",
] as const;

/** Every field an entry may have. Anything else is a typo. */
const ALLOWED_FIELDS = new Set<string>([
  ...REQUIRED_FIELDS,
  "note",
  "authUrl",
  "refresh",
  "sourceUrl",
  "license",
  "customFields",
  "sourceSpecificFields",
  "customFilters",
  "plugins",
]);

/** Value types a custom field may declare (CustomFieldType in the protocol). */
const ALLOWED_FIELD_TYPES = new Set([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
]);

/** Funder scope values listed in the field reference. */
const ALLOWED_SCOPES = new Set(["Federal", "State", "Local", "Private"]);

/** The list and view routes that satisfy the listing condition. */
const LISTING_ROUTE_PAIRS = [
  [
    "GET /common-grants/opportunities",
    "GET /common-grants/opportunities/{oppId}",
  ],
  ["GET /common-grants/awards", "GET /common-grants/awards/{awdId}"],
];

/** Oldest protocol version a listing may target. */
const MIN_VERSION = [0, 4, 0];

const HTTP_METHODS = ["get", "put", "post", "delete", "patch"];

type Entry = Record<string, unknown>;
const entries = Object.entries(implementationsIndex as Record<string, Entry>);

/** Compares two [major, minor, patch] versions. */
function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Collects "METHOD /path" for every operation in each OpenAPI document at or
 * above MIN_VERSION. Only files named exactly `openapi.X.Y.Z.yaml` count.
 */
function routesFromOpenApi(): Set<string> {
  const routes = new Set<string>();
  for (const file of readdirSync(OPENAPI_DIR)) {
    const match = /^openapi\.(\d+)\.(\d+)\.(\d+)\.yaml$/.exec(file);
    if (!match) continue;
    const version = match.slice(1).map(Number);
    if (compareVersions(version, MIN_VERSION) < 0) continue;
    const doc = yaml.load(
      readFileSync(path.join(OPENAPI_DIR, file), "utf-8"),
    ) as { paths?: Record<string, Record<string, unknown>> };
    for (const [routePath, operations] of Object.entries(doc.paths ?? {})) {
      for (const method of Object.keys(operations)) {
        if (HTTP_METHODS.includes(method)) {
          routes.add(`${method.toUpperCase()} ${routePath}`);
        }
      }
    }
  }
  return routes;
}

/** Collects every custom filter name a plugin declares, across resources. */
function filtersDeclaredBy(pluginId: string): Set<string> {
  const plugin = (
    pluginsIndex as Record<
      string,
      { filters?: Record<string, Record<string, Record<string, unknown>>> }
    >
  )[pluginId];
  const names = new Set<string>();
  for (const methods of Object.values(plugin?.filters ?? {})) {
    for (const filters of Object.values(methods)) {
      for (const name of Object.keys(filters)) names.add(name);
    }
  }
  return names;
}

/** Reads an entry's source-specific fields, keyed by field name. */
function sourceSpecificFields(
  entry: Entry,
): Record<string, { fieldType?: unknown; description?: unknown }> {
  const value = entry.sourceSpecificFields;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, { fieldType?: unknown; description?: unknown }>)
    : {};
}

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];

describe("implementations catalog", () => {
  it("has at least one entry", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  describe.each(entries)("%s", (id, entry) => {
    it("has a URL-safe key", () => {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    it("has every required field", () => {
      const missing = REQUIRED_FIELDS.filter((field) => {
        const value = entry[field];
        return Array.isArray(value)
          ? value.length === 0
          : typeof value !== "string" || value.trim() === "";
      });
      expect(missing).toEqual([]);
    });

    it("has no unknown fields", () => {
      const unknown = Object.keys(entry).filter((f) => !ALLOWED_FIELDS.has(f));
      expect(unknown).toEqual([]);
    });

    it("uses allowed funder scopes", () => {
      const invalid = asStrings(entry.scope).filter(
        (scope) => !ALLOWED_SCOPES.has(scope),
      );
      expect(invalid).toEqual([]);
    });

    it("names every data source, with https links", () => {
      const sources = Array.isArray(entry.sources) ? entry.sources : [];
      for (const source of sources as Array<Record<string, unknown>>) {
        expect(typeof source.name).toBe("string");
        if (source.url !== undefined) {
          expect(String(source.url)).toMatch(/^https:\/\//);
        }
      }
    });

    it("uses https URLs, with apiUrl ending in /common-grants", () => {
      expect(String(entry.apiUrl)).toMatch(/^https:\/\/.+\/common-grants$/);
      for (const field of ["docsUrl", "authUrl", "sourceUrl"]) {
        if (entry[field] !== undefined) {
          expect(String(entry[field])).toMatch(/^https:\/\//);
        }
      }
    });

    it("lists only routes that exist in protocol v0.4.0 or later", () => {
      const known = routesFromOpenApi();
      const unknown = asStrings(entry.routes).filter((r) => !known.has(r));
      expect(unknown).toEqual([]);
    });

    it("meets the listing condition: list and view for opportunities or awards", () => {
      const routes = new Set(asStrings(entry.routes));
      const meetsCondition = LISTING_ROUTE_PAIRS.some((pair) =>
        pair.every((route) => routes.has(route)),
      );
      expect(meetsCondition).toBe(true);
    });

    it("references only custom fields in the catalog", () => {
      const catalog = customFieldsIndex as Record<string, unknown>;
      const unknown = asStrings(entry.customFields).filter(
        (field) => !(field in catalog),
      );
      expect(unknown).toEqual([]);
    });

    it("doesn't list a field as both catalog and source-specific", () => {
      const catalogFields = new Set(asStrings(entry.customFields));
      const both = Object.keys(sourceSpecificFields(entry)).filter((field) =>
        catalogFields.has(field),
      );
      expect(both).toEqual([]);
    });

    it("gives every source-specific field a valid type and a description", () => {
      const incomplete = Object.entries(sourceSpecificFields(entry))
        .filter(
          ([, field]) =>
            !ALLOWED_FIELD_TYPES.has(String(field?.fieldType)) ||
            typeof field?.description !== "string" ||
            field.description.trim() === "",
        )
        .map(([name]) => name);
      expect(incomplete).toEqual([]);
    });

    it("references only plugins in the catalog", () => {
      const catalog = pluginsIndex as Record<string, unknown>;
      const unknown = asStrings(entry.plugins).filter(
        (plugin) => !(plugin in catalog),
      );
      expect(unknown).toEqual([]);
    });

    it("lists only custom filters its plugins declare", () => {
      const pluginIds = asStrings(entry.plugins);
      if (pluginIds.length === 0) return;
      const declared = new Set(
        pluginIds.flatMap((pluginId) => [...filtersDeclaredBy(pluginId)]),
      );
      const undeclared = asStrings(entry.customFilters).filter(
        (filter) => !declared.has(filter),
      );
      expect(undeclared).toEqual([]);
    });
  });
});
