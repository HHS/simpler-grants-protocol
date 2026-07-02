/**
 * Per-row parse partitioning for list/search responses.
 *
 * `parseBatch` validates each response row against a schema and partitions the
 * outcome: valid rows land in `items`, failures in `errors` (each carrying its
 * row index and raw payload). One malformed row never aborts the batch unless
 * the caller opts into `"throw"`.
 */

import { z } from "zod";
import { Filtered, OppFilters, Paginated } from "../types";

/** One response row that failed schema validation, with its position and raw payload. */
export interface ParseFailure {
  index: number;
  raw: unknown;
  error: z.ZodError;
}

/** Thrown by `parseBatch` under `onParseError: "throw"`; carries the first failure's detail. */
export class BatchParseError extends Error {
  constructor(public readonly failure: ParseFailure) {
    super(`Row ${failure.index} failed to parse: ${failure.error.message}`);
    this.name = "BatchParseError";
  }
}

/** Row-parse failure handling: partition into `errors` (default) or throw on first failure. */
export type OnParseError = "collect" | "throw";

export function parseBatch<T>(
  schema: { safeParse(data: unknown): z.SafeParseReturnType<unknown, T> },
  rows: unknown[],
  onParseError: OnParseError = "collect"
): { items: T[]; errors: ParseFailure[] } {
  const items: T[] = [];
  const errors: ParseFailure[] = [];
  rows.forEach((raw, index) => {
    const parsed = schema.safeParse(raw);
    if (parsed.success) {
      items.push(parsed.data);
      return;
    }
    const failure: ParseFailure = { index, raw, error: parsed.error };
    if (onParseError === "throw") throw new BatchParseError(failure);
    errors.push(failure);
  });
  return { items, errors };
}

/** Paginated result whose `items` are valid rows only; per-row failures land in `errors`. */
export type ListResult<T> = Paginated<T> & { errors: ParseFailure[] };

/** Search result: filtered envelope plus per-row parse failures. */
export type SearchResult<T, F = OppFilters> = Filtered<T, F> & { errors: ParseFailure[] };
