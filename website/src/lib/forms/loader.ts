import { dereferenceSchema } from "../schema/ref-resolver";
import {
  schemaFilePath,
  extractFromSchema,
  getString,
  getStringArray,
  getObject,
  getArray,
} from "../catalog";
import type {
  FormItem,
  FormItemIndexEntry,
  FormItemMap,
  FormItemSchemaData,
  FormOverrides,
  OverrideMap,
} from "./types";
import { applyUiOverrides, applyMappingOverrides } from "./overrides";

// Import the forms index
import formIndex from "@/content/forms/typespec-index.json";

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

/** Cache for loaded form items */
let formCache: FormItemMap | null = null;

/** Pulls the per-section maps out of the schema's `x-overrides` block. */
function extractOverrides(schema: Record<string, unknown>): FormOverrides {
  const raw = schema["x-overrides"];
  if (typeof raw !== "object" || raw === null) {
    return {};
  }
  const block = raw as Record<string, unknown>;
  const pickMap = (key: string): OverrideMap | undefined => {
    const value = block[key];
    return typeof value === "object" && value !== null
      ? (value as OverrideMap)
      : undefined;
  };
  return {
    uiSchema: pickMap("uiSchema"),
    mappingFromCg: pickMap("mappingFromCg"),
    mappingToCg: pickMap("mappingToCg"),
  };
}

/**
 * Extracts form data from a resolved JSON schema and applies any
 * `x-overrides` patches on top of the base UI schema and mappings.
 *
 * Form schemas use standard JSON Schema properties (title, description,
 * properties, examples) plus the same x-* extensions used by the question
 * bank (x-tags, x-mapping-from-cg, x-mapping-to-cg, x-ui-schema), with
 * an additional x-overrides block that lets a form patch individual
 * labels / mapping leaves without re-declaring the whole inherited tree.
 */
function extractSchemaData(
  schema: Record<string, unknown>,
): FormItemSchemaData {
  const base = extractFromSchema(schema, {
    name: getString("title"),
    description: getString("description"),
    tags: getStringArray("x-tags"),
    properties: getObject("properties"),
    examples: getArray("examples"),
    mappingFromCg: getObject("x-mapping-from-cg"),
    mappingToCg: getObject("x-mapping-to-cg"),
    uiSchema: getObject("x-ui-schema"),
  });
  const overrides = extractOverrides(schema);
  return {
    ...base,
    uiSchema: applyUiOverrides(base.uiSchema, overrides.uiSchema),
    mappingFromCg: applyMappingOverrides(
      base.mappingFromCg,
      overrides.mappingFromCg,
    ),
    mappingToCg: applyMappingOverrides(base.mappingToCg, overrides.mappingToCg),
    overrides,
    rawSchema: schema,
  };
}

// =============================================================================
// CORE LOADERS
// =============================================================================

/**
 * Loads a single form item by ID.
 *
 * Returns null when the ID is not present in the index, or when schema
 * dereferencing fails (the underlying error is logged for diagnosis).
 */
export async function loadFormItem(itemId: string): Promise<FormItem | null> {
  const indexEntry = (formIndex as Record<string, FormItemIndexEntry>)[itemId];

  if (!indexEntry) {
    return null;
  }

  try {
    const schema = await dereferenceSchema(schemaFilePath(indexEntry.schema));
    const schemaData = extractSchemaData(schema);

    return {
      id: itemId,
      ...indexEntry,
      ...schemaData,
    };
  } catch (error) {
    console.error(`Failed to load form ${itemId}:`, error);
    return null;
  }
}

/**
 * Loads all form items from the index.
 *
 * Results are cached in module scope because this function is called by
 * multiple Astro pages during the static build (the catalog page and each
 * detail page). The cache avoids redundant schema dereferencing and YAML
 * parsing across those pages. Since schemas are generated before the Astro
 * build starts and nothing changes mid-build, the cache cannot get out of
 * sync.
 */
export async function loadAllFormItems(): Promise<FormItemMap> {
  if (formCache) {
    return formCache;
  }

  const items: FormItemMap = {};
  const index = formIndex as Record<string, FormItemIndexEntry>;

  for (const itemId of Object.keys(index)) {
    const item = await loadFormItem(itemId);
    if (item) {
      items[itemId] = item;
    }
  }

  formCache = items;
  return items;
}

// =============================================================================
// STATIC PATH GENERATION
// =============================================================================

/**
 * Gets all form IDs for static path generation.
 */
export function getFormIds(): string[] {
  return Object.keys(formIndex);
}
