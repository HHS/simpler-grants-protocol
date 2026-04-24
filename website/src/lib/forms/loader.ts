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
import {
  composeUiSchema,
  composeMappingFromCg,
  composeMappingToCg,
  deepMergeInto,
} from "./compose";

// Import the forms index
import formIndex from "@/content/forms/typespec-index.json";

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

/** Cache for loaded form items */
let formCache: FormItemMap | null = null;

/** Pulls the three section maps (uiSchema, mappingFromCg, mappingToCg) out of an `x-overrides` block. */
function readOverrideBlock(raw: unknown): FormOverrides {
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

/** Adds entries from `additions` into `target`, prepending `prefix` to each path. */
function mergePrefixedInto(
  target: OverrideMap,
  additions: OverrideMap | undefined,
  prefix: string,
): void {
  if (!additions) return;
  for (const [path, patch] of Object.entries(additions)) {
    const fullPath = prefix ? `${prefix}.${path}` : path;
    target[fullPath] = patch;
  }
}

/**
 * Aggregates overrides declared on the form model itself plus overrides
 * declared on individual properties.
 *
 * Authors prefer field-level overrides for patches into a property's
 * composed type (e.g. `@extension("x-overrides", #{ uiSchema: #{ name: #{ label: "..." } } })`
 * on `org: QuestionOrgName` becomes `org.name` at the form level). The
 * model-level `x-overrides` block remains supported for top-level or
 * cross-cutting patches.
 */
function extractOverrides(schema: Record<string, unknown>): FormOverrides {
  const aggregated: Required<FormOverrides> = {
    uiSchema: {},
    mappingFromCg: {},
    mappingToCg: {},
  };

  // Model-level overrides keep their paths as written.
  const modelLevel = readOverrideBlock(schema["x-overrides"]);
  mergePrefixedInto(aggregated.uiSchema, modelLevel.uiSchema, "");
  mergePrefixedInto(aggregated.mappingFromCg, modelLevel.mappingFromCg, "");
  mergePrefixedInto(aggregated.mappingToCg, modelLevel.mappingToCg, "");

  // Field-level overrides have their paths re-keyed with the property name.
  const properties = schema.properties;
  if (typeof properties === "object" && properties !== null) {
    for (const [propName, propSchema] of Object.entries(properties)) {
      if (typeof propSchema !== "object" || propSchema === null) continue;
      const propBlock = readOverrideBlock(
        (propSchema as Record<string, unknown>)["x-overrides"],
      );
      mergePrefixedInto(aggregated.uiSchema, propBlock.uiSchema, propName);
      mergePrefixedInto(
        aggregated.mappingFromCg,
        propBlock.mappingFromCg,
        propName,
      );
      mergePrefixedInto(
        aggregated.mappingToCg,
        propBlock.mappingToCg,
        propName,
      );
    }
  }

  // Drop empty section maps so the FormOverrides shape mirrors what was authored.
  const result: FormOverrides = {};
  if (Object.keys(aggregated.uiSchema).length > 0) {
    result.uiSchema = aggregated.uiSchema;
  }
  if (Object.keys(aggregated.mappingFromCg).length > 0) {
    result.mappingFromCg = aggregated.mappingFromCg;
  }
  if (Object.keys(aggregated.mappingToCg).length > 0) {
    result.mappingToCg = aggregated.mappingToCg;
  }
  return result;
}

/** Returns a non-null object value at `schema[key]`, or `undefined` if absent / not an object. */
function getOptionalObject(
  schema: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = schema[key];
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Extracts form data from a resolved JSON schema, composes any missing
 * sections from the form's properties, and then applies `x-overrides`
 * patches on top.
 *
 * Form schemas use standard JSON Schema properties (title, description,
 * properties, examples) plus the same x-* extensions used by the question
 * bank (x-tags, x-mapping-from-cg, x-mapping-to-cg, x-ui-schema), with
 * an additional x-overrides block.
 *
 * For x-ui-schema and the two x-mapping-* sections: if the form spec
 * declares one explicitly, it is used as-is; otherwise the loader composes
 * one by walking the form's properties (typically QB questions referenced
 * via $ref) and stitching their respective extensions together. This is
 * what lets a form spec be just a list of composed properties without
 * redeclaring the inherited UI schema or mapping tree.
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
  });

  const explicitUi = getOptionalObject(schema, "x-ui-schema");
  const explicitFromCg = getOptionalObject(schema, "x-mapping-from-cg");
  const explicitToCg = getOptionalObject(schema, "x-mapping-to-cg");

  const composedUi = explicitUi ?? composeUiSchema(base.properties);
  const composedFromCg =
    explicitFromCg ?? composeMappingFromCg(base.properties);
  const baseToCg = composeMappingToCg(base.properties);
  if (explicitToCg) deepMergeInto(baseToCg, explicitToCg);
  const composedToCg = baseToCg;

  const overrides = extractOverrides(schema);

  return {
    ...base,
    uiSchema: applyUiOverrides(composedUi, overrides.uiSchema),
    mappingFromCg: applyMappingOverrides(
      composedFromCg,
      overrides.mappingFromCg,
    ),
    mappingToCg: applyMappingOverrides(composedToCg, overrides.mappingToCg),
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
