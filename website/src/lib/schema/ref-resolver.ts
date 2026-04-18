import $RefParser from "@apidevtools/json-schema-ref-parser";
import mergeAllOf from "json-schema-merge-allof";
import { stripIds } from "./strip-ids";

/**
 * Loads a schema by file path, resolves all $ref references, and returns
 * the raw dereferenced result. Uses `@apidevtools/json-schema-ref-parser`.
 */
export async function resolveSchemaRefs(
  schemaPath: string,
): Promise<Record<string, unknown>> {
  return (await $RefParser.dereference(schemaPath)) as Record<string, unknown>;
}

/**
 * Fully dereferences a schema file: resolves all $ref references, merges
 * allOf entries (from TypeSpec "extends" patterns), strips $schema (which
 * can confuse downstream AJV consumers like JSON Forms), and strips all
 * $id fields from the inlined tree.
 *
 * Why strip $ids: $RefParser.dereference() deep-clones each resolved $ref,
 * so a schema that pulls in the same sub-schema through multiple paths
 * (e.g. a form composing three QB questions that each include
 * QuestionAddress) produces a tree with N distinct sub-schemas all
 * carrying the same $id. Any AJV consumer that walks that tree via
 * addSchema / compile throws "reference X resolves to more than one
 * schema". Stripping $ids at this boundary makes the result safe for
 * every downstream consumer — JsonFormRenderer's internal AJV,
 * openapi-sampler validation, direct ajv.addSchema, etc.
 *
 * See __tests__/lib/schema/ref-resolver.spec.ts for the regression test
 * that pins this behavior.
 *
 * This is the main entry point for preparing a schema for rendering.
 */
export async function dereferenceSchema(
  schemaPath: string,
): Promise<Record<string, unknown>> {
  const resolved = await resolveSchemaRefs(schemaPath);
  // For allOf merges, the base schema (child) comes first and allOf entries
  // (parent) come after. For custom extension keys (x-tags, x-ui-schema,
  // x-mapping-*), the child's values should override the parent's.
  const merged = mergeAllOf(resolved, {
    resolvers: {
      defaultResolver: (values) => values[0],
    },
  }) as Record<string, unknown>;
  delete merged.$schema;
  return stripIds(merged);
}
