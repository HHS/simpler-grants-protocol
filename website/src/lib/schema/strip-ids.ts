/**
 * Recursively removes `$id` and `unevaluatedProperties` fields from a schema
 * object.
 *
 * After full $ref inlining, the same $id (e.g. "QuestionAddress.yaml") can
 * appear multiple times in the schema tree — once per composite that references
 * it. AJV (used internally by JsonForms) throws "resolves to more than one
 * schema" when it encounters duplicate $id values. Stripping them prevents
 * that error while leaving the structural schema intact.
 *
 * TypeSpec generates `unevaluatedProperties: not: {}` on every model. After
 * merging and inlining, AJV incorrectly flags defined properties as
 * unevaluated on complex schemas, producing spurious validation errors in
 * JsonForms. Stripping the constraint at all levels avoids this.
 */
export function stripIds<T>(schema: T): T {
  return JSON.parse(
    JSON.stringify(schema, (key, value) => {
      if (key === "$id" && typeof value === "string") return undefined;
      if (key === "unevaluatedProperties") return undefined;
      return value;
    }),
  ) as T;
}
