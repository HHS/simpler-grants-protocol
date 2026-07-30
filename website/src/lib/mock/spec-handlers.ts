import { fromOpenApi } from "@mswjs/source/open-api";
import type { HttpHandler } from "msw";

/**
 * Minimal shape of a parsed OpenAPI document. Kept loose (index signature)
 * because we hand the whole document to `@mswjs/source`, which dereferences
 * and walks it itself.
 */
export interface OpenApiSpec {
  paths?: Record<string, unknown>;
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Generates MSW request handlers for every operation in a parsed OpenAPI
 * document via `@mswjs/source`'s `fromOpenApi`. Response bodies are seeded from
 * each operation's response JSON Schema, so they are schema-valid by
 * construction (example/schema fidelity, not request validation — per the ADR).
 *
 * Base-URL note (the spike's central question): our specs declare no `servers:`
 * block, so `@mswjs/source` falls back to a `/` base and emits handlers with
 * same-origin **relative** paths (e.g. `/common-grants/opportunities`) — exactly
 * the origin Swagger UI's "Try it out" targets. No base-URL patching is needed.
 * If a `@server` is ever added upstream, handlers would gain that absolute base
 * and this assumption must be revisited.
 *
 * @param spec - A parsed OpenAPI document (YAML already loaded to an object).
 * @returns A promise resolving to the generated MSW handlers.
 */
export function buildHandlersFromSpec(
  spec: OpenApiSpec,
): Promise<HttpHandler[]> {
  return fromOpenApi(spec as Parameters<typeof fromOpenApi>[0]);
}
