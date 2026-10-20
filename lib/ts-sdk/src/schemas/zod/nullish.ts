/**
 * Helpers for properties the protocol describes as plain optional: absent or a
 * value, never `null`.
 *
 * The SDK accepts an explicit `null` for these properties on read, for
 * compatibility with implementations that send one, but parses it to
 * `undefined`, so a parsed value never carries `null` and `JSON.stringify`
 * omits the key.
 *
 * @internal
 */

import { z } from "zod";

/** Accepts a value, `null`, or absence; parses `null` to `undefined`. */
export const nullishAsOptional = <T extends z.ZodType>(schema: T) =>
  schema.nullish().overwrite(value => value ?? undefined);

/** Accepts a value, `null`, or absence; parses `null` and absence to `fallback`. */
export const nullishWithDefault = <T extends z.ZodType>(
  schema: T,
  fallback: z.util.NoUndefined<z.output<T>>
) =>
  schema
    .nullish()
    .overwrite(value => value ?? fallback)
    .default(fallback);
