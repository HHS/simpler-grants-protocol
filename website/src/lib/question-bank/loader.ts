import { extensionsAjv } from "../validation";
import { createAjvLookup, dereferenceSchema } from "../schema/ref-resolver";
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

const lookup = createAjvLookup(extensionsAjv);

/** Normalizes an array from schema extension (may be string[] from JSON) */
function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Loads and fully dereferences a schema by name from the AJV registry */
async function loadSchema(
  schemaName: string,
): Promise<Record<string, unknown> | null> {
  const schemaId = schemaName.endsWith(".yaml")
    ? schemaName
    : `${schemaName}.yaml`;
  const raw = await lookup(schemaId);
  if (!raw) return null;
  return dereferenceSchema(raw, lookup);
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
  const uiSchema = (schema["x-ui-schema"] as Record<string, unknown>) ?? {};

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
export async function loadQuestionBankItem(
  itemId: string,
): Promise<QuestionBankItem | null> {
  const indexEntry = (
    questionBankIndex as Record<string, QuestionBankIndexEntry>
  )[itemId];

  if (!indexEntry) {
    return null;
  }

  try {
    const schema = await loadSchema(indexEntry.schema);
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
export async function loadAllQuestionBankItems(): Promise<QuestionBankMap> {
  if (questionBankCache) {
    return questionBankCache;
  }

  const items: QuestionBankMap = {};
  const index = questionBankIndex as Record<string, QuestionBankIndexEntry>;

  for (const itemId of Object.keys(index)) {
    const item = await loadQuestionBankItem(itemId);
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
export async function getFilterOptions(): Promise<QuestionBankFilterOptions> {
  const allItems = await loadAllQuestionBankItems();
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
