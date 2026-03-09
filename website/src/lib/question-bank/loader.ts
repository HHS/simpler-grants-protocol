import { questionBankAjv } from "../validation";
import type {
  QuestionBankItem,
  QuestionBankIndexEntry,
  QuestionBankMap,
  QuestionBankSchemaData,
  QuestionBankFilterOptions,
} from "./types";

// Import the question bank index
import questionBankIndex from "@/content/question-bank/index.json";

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

/** Cache for loaded question bank items */
let questionBankCache: QuestionBankMap | null = null;

/** Normalizes an array from schema extension (may be string[] from JSON) */
function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Loads a raw schema by name from the AJV registry */
function loadRawSchema(schemaName: string): Record<string, unknown> | null {
  const schemaId = schemaName.endsWith(".yaml")
    ? schemaName
    : `${schemaName}.yaml`;
  const validator = questionBankAjv.getSchema(schemaId);

  if (!validator?.schema) {
    console.warn(`Schema ${schemaId} not found in AJV registry`);
    return null;
  }

  return validator.schema as Record<string, unknown>;
}

/**
 * Resolves a local $ref (e.g., "#/$defs/RecordUnknown") against the schema's $defs.
 */
function resolveLocalRef(
  ref: string,
  defs: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (!ref.startsWith("#/$defs/") || !defs) return null;
  const defName = ref.slice("#/$defs/".length);
  return (defs[defName] as Record<string, unknown>) ?? null;
}

/**
 * Resolves $ref in a single property value, handling both external and local refs.
 */
function resolvePropertyRef(
  prop: Record<string, unknown>,
  defs: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (typeof prop.$ref !== "string") return prop;

  const ref = prop.$ref as string;
  const { $ref: _, ...rest } = prop;

  // Try local ref first
  const localDef = resolveLocalRef(ref, defs);
  if (localDef) {
    return { ...stripMetaProps(localDef), ...rest };
  }

  // Try external ref from AJV registry
  const refSchema = loadRawSchema(ref);
  if (refSchema) {
    return { ...stripMetaProps(refSchema), ...rest };
  }

  // Can't resolve - return without $ref to avoid JSON Forms errors
  return { type: "object", ...rest };
}

/**
 * Strips $schema, $id, and $defs from a schema to make it safe for JSON Forms.
 */
function stripMetaProps(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const { $schema: _, $id: _id, $defs: _defs, ...rest } = schema;
  return rest;
}

/**
 * Resolves a schema by inlining $ref references from allOf and property $refs.
 * Strips $schema/$id/$defs so JSON Forms can render without external refs.
 */
function resolveSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const defs = schema.$defs as Record<string, unknown> | undefined;
  const resolved = stripMetaProps(schema);

  // Resolve allOf with $ref (e.g., extends patterns)
  if (Array.isArray(resolved.allOf)) {
    const mergedProperties: Record<string, unknown> = {
      ...((resolved.properties as Record<string, unknown>) ?? {}),
    };
    const mergedRequired: string[] = [
      ...((resolved.required as string[]) ?? []),
    ];

    for (const entry of resolved.allOf as Record<string, unknown>[]) {
      if (typeof entry.$ref === "string") {
        const refSchema = loadRawSchema(entry.$ref as string);
        if (refSchema) {
          const refDefs = refSchema.$defs as
            | Record<string, unknown>
            | undefined;
          const refProps =
            (refSchema.properties as Record<
              string,
              Record<string, unknown>
            >) ?? {};
          // Resolve $refs within the referenced schema's properties
          for (const [key, prop] of Object.entries(refProps)) {
            mergedProperties[key] = resolvePropertyRef(
              prop,
              refDefs ?? defs,
            );
          }
          if (Array.isArray(refSchema.required)) {
            mergedRequired.push(...(refSchema.required as string[]));
          }
        }
      }
    }

    resolved.properties = mergedProperties;
    if (mergedRequired.length > 0) {
      resolved.required = [...new Set(mergedRequired)];
    }
    delete resolved.allOf;
    delete resolved.unevaluatedProperties;
  }

  // Resolve $ref in individual properties
  const properties = resolved.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (properties) {
    for (const [key, prop] of Object.entries(properties)) {
      properties[key] = resolvePropertyRef(prop, defs);
    }
    resolved.properties = properties;
  }

  return resolved;
}

/** Loads and resolves a schema using the question-bank schemas AJV registry */
function loadSchema(schemaName: string): Record<string, unknown> | null {
  const raw = loadRawSchema(schemaName);
  if (!raw) return null;
  return resolveSchema(raw);
}

/** Extracts question bank data from a resolved JSON schema */
function extractSchemaData(
  schema: Record<string, unknown>,
): QuestionBankSchemaData {
  const name = typeof schema.title === "string" ? schema.title : "";
  const description =
    typeof schema.description === "string" ? schema.description : "";
  const tags = parseStringArray(schema["x-tags"]);
  const properties = (schema.properties as Record<string, unknown>) ?? {};
  const examples = Array.isArray(schema.examples) ? schema.examples : [];
  const mappingFromCg =
    (schema["x-mapping-from-cg"] as Record<string, unknown>) ?? {};
  const mappingToCg =
    (schema["x-mapping-to-cg"] as Record<string, unknown>) ?? {};
  const uiSchema =
    (schema["x-ui-schema"] as Record<string, unknown>) ?? {};

  return {
    name,
    description,
    tags,
    properties,
    examples,
    mappingFromCg,
    mappingToCg,
    uiSchema,
    rawSchema: schema,
  };
}

// =============================================================================
// CORE LOADERS
// =============================================================================

/**
 * Loads a single question bank item by ID
 */
export function loadQuestionBankItem(
  itemId: string,
): QuestionBankItem | null {
  const indexEntry = (
    questionBankIndex as Record<string, QuestionBankIndexEntry>
  )[itemId];

  if (!indexEntry) {
    return null;
  }

  try {
    const schema = loadSchema(indexEntry.schema);
    if (!schema) {
      return null;
    }

    const schemaData = extractSchemaData(schema);

    return {
      id: itemId,
      ...indexEntry,
      ...schemaData,
    };
  } catch (error) {
    console.error(`Failed to load question bank item ${itemId}:`, error);
    return null;
  }
}

/**
 * Loads all question bank items from the index (with caching)
 */
export function loadAllQuestionBankItems(): QuestionBankMap {
  if (questionBankCache) {
    return questionBankCache;
  }

  const items: QuestionBankMap = {};
  const index = questionBankIndex as Record<string, QuestionBankIndexEntry>;

  for (const itemId of Object.keys(index)) {
    const item = loadQuestionBankItem(itemId);
    if (item) {
      items[itemId] = item;
    }
  }

  questionBankCache = items;
  return items;
}

// =============================================================================
// STATIC PATH GENERATION
// =============================================================================

/**
 * Gets all question bank IDs for static path generation
 */
export function getQuestionBankIds(): string[] {
  return Object.keys(questionBankIndex);
}

// =============================================================================
// FILTER OPTIONS
// =============================================================================

/**
 * Gets all unique filter options for dropdowns
 */
export function getFilterOptions(): QuestionBankFilterOptions {
  const allItems = loadAllQuestionBankItems();
  const tagSet = new Set<string>();

  for (const item of Object.values(allItems)) {
    for (const tag of item.tags) {
      tagSet.add(tag);
    }
  }

  return {
    tags: Array.from(tagSet).sort(),
  };
}
