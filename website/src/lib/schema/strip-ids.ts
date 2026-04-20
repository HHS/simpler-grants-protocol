/**
 * Recursively removes all `$id` fields from a schema object.
 *
 * After full $ref inlining, the same $id (e.g. "QuestionAddress.yaml") can
 * appear multiple times in the schema tree — once per composite that references
 * it. AJV (used internally by JsonForms) throws "resolves to more than one
 * schema" when it encounters duplicate $id values. Stripping them prevents
 * that error while leaving the structural schema intact.
 */
export function stripIds<T>(schema: T): T {
  return JSON.parse(
    JSON.stringify(schema, (key, value) =>
      key === "$id" && typeof value === "string" ? undefined : value,
    ),
  ) as T;
}
