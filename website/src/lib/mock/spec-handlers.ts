import { fromOpenApi } from "@mswjs/source/open-api";
import type { HttpHandler, ResponseResolver } from "msw";

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

/** A cached response snapshot, replayed as a fresh `Response` on cache hits. */
interface CachedResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: ArrayBuffer;
}

/**
 * Cache key: method + pathname + sorted query string + body text (read via a
 * clone, so the original request stream is untouched for the real resolver).
 * The body must be part of the key — several generated endpoints (e.g. `POST
 * /common-grants/applications/start`) take their real input via a JSON body
 * at a fixed path with no distinguishing query params, so keying on the URL
 * alone would replay one body's cached response for a different body.
 */
async function requestCacheKey(request: Request): Promise<string> {
  const url = new URL(request.url);
  const sortedQuery = new URLSearchParams(
    [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
  const body = request.body ? await request.clone().text() : "";
  return `${request.method} ${url.pathname}?${sortedQuery.toString()}\n${body}`;
}

async function snapshotResponse(response: Response): Promise<CachedResponse> {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body: await response.clone().arrayBuffer(),
  };
}

/** Statuses that forbid a response body (the `Response` constructor throws if given one). */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

function replayResponse(cached: CachedResponse): Response {
  const body = NULL_BODY_STATUSES.has(cached.status)
    ? null
    : cached.body.slice(0);
  return new Response(body, {
    status: cached.status,
    statusText: cached.statusText,
    headers: cached.headers,
  });
}

/**
 * Wraps each handler's resolver so a repeat request to the same method+path+query
 * replays a byte-identical cached response instead of re-invoking the resolver —
 * `fromOpenApi`-generated resolvers reseed `@faker-js/faker` on every call, so
 * without this, repeat "Try it out" calls return different bodies each time.
 * Mutates each handler's `resolver` in place (a plain instance property; not
 * accessible off the public `HttpHandler` type, hence the cast) and returns the
 * same array. The cache lives in this closure, so a fresh call to
 * `buildHandlersFromSpec` (e.g. on a version swap) starts a fresh cache.
 *
 * Exported for tests — production code reaches it through
 * `buildHandlersFromSpec`.
 */
export function memoize(handlers: HttpHandler[]): HttpHandler[] {
  const cache = new Map<string, Promise<CachedResponse | undefined>>();

  for (const handler of handlers) {
    const target = handler as unknown as { resolver: ResponseResolver };
    const original = target.resolver;

    target.resolver = async (info) => {
      const key = await requestCacheKey(info.request);
      let cached = cache.get(key);
      if (!cached) {
        cached = Promise.resolve(original(info)).then(
          (result) =>
            result instanceof Response ? snapshotResponse(result) : undefined,
          (error: unknown) => {
            // Don't let a one-off resolver failure poison the key: evict it so
            // the next request retries, and rethrow so MSW reports it as it
            // would without memoization.
            cache.delete(key);
            throw error;
          },
        );
        cache.set(key, cached);
      }
      const snapshot = await cached;
      return snapshot ? replayResponse(snapshot) : undefined;
    };
  }

  return handlers;
}

/**
 * Generates MSW request handlers for every operation in a parsed OpenAPI
 * document via `@mswjs/source`'s `fromOpenApi`. Response bodies are seeded from
 * each operation's response JSON Schema, so they are schema-valid by
 * construction (example/schema fidelity, not request validation — per the ADR).
 * Each handler is memoized (see `memoize`) so repeat calls are deterministic.
 *
 * Base-URL note (the spike's central question): our specs declare no `servers:`
 * block, so `@mswjs/source` falls back to a `/` base and emits handlers with
 * same-origin **relative** paths (e.g. `/common-grants/opportunities`) — exactly
 * the origin Swagger UI's "Try it out" targets. No base-URL patching is needed.
 * If a `@server` is ever added upstream, handlers would gain that absolute base
 * and this assumption must be revisited.
 *
 * @param spec - A parsed OpenAPI document (YAML already loaded to an object).
 * @returns A promise resolving to the generated, memoized MSW handlers.
 */
export async function buildHandlersFromSpec(
  spec: OpenApiSpec,
): Promise<HttpHandler[]> {
  const handlers = await fromOpenApi(spec as Parameters<typeof fromOpenApi>[0]);
  return memoize(handlers);
}
