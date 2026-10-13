/**
 * Awards resource namespace for the CommonGrants API.
 */

import { z } from "zod";
import type { AwardBase, AwdFilters, AwdSearchRequest } from "../../types";
import {
  AwardBaseSchema,
  AwdFiltersSchema,
  FilteredSchema,
  OkSchema,
  PaginatedSchema,
} from "../../schemas";
import type { Client, FetchManyOptions } from "../client";
import {
  classifyFilters,
  type CustomFilterInput,
  validateRoutes,
} from "../../extensions/custom-filters";
import type { CustomFilterType, PluginRoutes } from "../../extensions/types";
import { parseBatch } from "../results";
import type { ListResult, OnParseError, SearchResult } from "../results";
import { Resource } from "./base";

/** Any schema whose parsed output satisfies the base award contract. */
type AwardSchema = z.ZodType<AwardBase, unknown>;

/** Raw `{ operator, value }` filter object accepted for ad-hoc filters. */
type RawFilter = { operator: string; value: unknown };

/** Filter declarations registered for `awards.search`. */
type AwardRouteFilters<R extends PluginRoutes> = R extends {
  awards: { search: { filters: infer Fs } };
}
  ? Fs
  : never;

/** Registered award filter names carried by a plugin routes type. */
type AwardCustomFilterNames<R extends PluginRoutes> = Extract<keyof AwardRouteFilters<R>, string>;

/** Typed filter bag for `awards.search({ filters })`. */
export type AwardCustomFilterBag<R extends PluginRoutes> = {
  [K in AwardCustomFilterNames<R>]?: AwardRouteFilters<R>[K] extends {
    filterType: infer FT extends CustomFilterType;
  }
    ? CustomFilterInput<FT>
    : RawFilter;
} & Record<string, RawFilter>;

/** Options for getting a single award. */
export interface AwardGetOptions<S extends AwardSchema = typeof AwardBaseSchema> {
  /** Zod schema to parse and type the response. Defaults to the bound base schema. */
  schema?: S;
}

/** Options for listing awards. */
export interface AwardListOptions<
  S extends AwardSchema = typeof AwardBaseSchema,
> extends FetchManyOptions<z.infer<S>> {
  /** Zod schema to parse and type each item. Defaults to the bound base schema. */
  schema?: S;
}

/** Options for searching awards. */
export interface AwardSearchOptions<
  S extends AwardSchema = typeof AwardBaseSchema,
  R extends PluginRoutes = PluginRoutes,
> extends FetchManyOptions<z.infer<S>> {
  /** Text query to search for in award titles and descriptions. */
  query?: string;
  /** Flat award filter bag, classified into named and custom filter fields. */
  filters?: AwardCustomFilterBag<R>;
  /** Zod schema to parse and type each item. Defaults to the bound base schema. */
  schema?: S;
}

/**
 * Awards resource - provides methods for interacting with awards.
 *
 * @example
 * ```ts
 * const client = new Client({ baseUrl: "https://api.example.org" });
 *
 * // Get a single award
 * const award = await client.awards.get("award-123");
 *
 * // List awards
 * const list = await client.awards.list();
 *
 * // Search awards
 * const results = await client.awards.search({ query: "research" });
 * ```
 */
export class Awards<
  R extends PluginRoutes = PluginRoutes,
  TItem extends AwardBase = AwardBase,
> extends Resource<TItem> {
  private readonly basePath = "/common-grants/awards";

  constructor(client: Client, boundSchema?: z.ZodType<TItem, unknown>, routes?: R) {
    super(client, boundSchema ?? (AwardBaseSchema as unknown as z.ZodType<TItem, unknown>), routes);
    // Backstop for direct construction (bypassing definePlugin): an invalid
    // registration, such as a filter named after a default field, throws here
    // instead of silently shadowing the default bucket at classification time.
    if (routes) validateRoutes(routes);
  }

  /** Per-call override wins; otherwise the bound base schema. */
  private resolveSchema<S extends AwardSchema>(override?: S): S {
    return override ?? (this.boundSchema as unknown as S);
  }

  /**
   * Get a specific award by ID.
   *
   * A single requested entity that does not parse is a real error, so `get()`
   * is fail-hard: a malformed response throws.
   *
   * @param id - The award ID
   * @param options - Optional settings; use `schema` to parse and type the response.
   * @returns The award data
   * @throws {Error} If the request fails or the response does not parse
   *
   * @example
   * ```ts
   * const award = await client.awards.get("123e4567-e89b-12d3-a456-426614174000");
   * console.log(award.title);
   * ```
   */
  async get<S extends AwardSchema = z.ZodType<TItem, unknown>>(
    id: string,
    options?: AwardGetOptions<S>
  ): Promise<z.infer<S>> {
    const schema = this.resolveSchema(options?.schema);
    const response = await this.client.get(`${this.basePath}/${encodeURIComponent(id)}`);

    if (!response.ok) {
      throw new Error(`Failed to get award ${id}: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const result = OkSchema(schema).parse(json) as { data: z.infer<S> };
    return result.data;
  }

  /**
   * List awards with auto-pagination by default.
   *
   * Rows are parsed individually: valid rows land in `items`, per-row failures
   * in `errors` (set `onParseError: "throw"` to fail hard on the first bad row).
   *
   * @param options - Pagination and schema options. If `page` is specified, fetches only that page.
   * @returns Paginated list of awards plus per-row parse failures
   * @throws {Error} If the request fails
   *
   * @example
   * ```ts
   * // Auto-paginate to fetch all awards (default)
   * const all = await client.awards.list();
   *
   * // Auto-paginate with custom limits
   * const limited = await client.awards.list({ maxItems: 500, pageSize: 50 });
   *
   * // Get a specific page (disables auto-pagination)
   * const page2 = await client.awards.list({ page: 2, pageSize: 10 });
   * ```
   */
  async list<S extends AwardSchema = z.ZodType<TItem, unknown>>(
    options?: AwardListOptions<S>
  ): Promise<ListResult<z.infer<S>>> {
    const schema = this.resolveSchema(options?.schema);

    if (options?.page !== undefined) {
      const params: Record<string, number> = { page: options.page };
      if (options.pageSize) params.pageSize = options.pageSize;

      const response = await this.client.get(this.basePath, {
        params,
        signal: options.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to list awards: ${response.status} ${response.statusText}`);
      }

      const envelope = PaginatedSchema(z.unknown()).parse(await response.json());
      const { items, errors } = parseBatch(
        schema,
        envelope.items as unknown[],
        options.onParseError ?? "collect"
      );
      return { ...envelope, items, errors } as ListResult<z.infer<S>>;
    }

    return this.client.fetchMany(this.basePath, {
      ...options,
      schema,
    }) as Promise<ListResult<z.infer<S>>>;
  }

  /**
   * Search for awards based on query text and filters.
   *
   * Supports auto-pagination by default. If `page` is specified, only fetches that page.
   *
   * Filter validation is fail-fast: an invalid value on any filter (standard,
   * registered custom, or ad-hoc) throws `FilterError` before the request is
   * sent. A caught `FilterError`'s `.sourceValue` may carry PII; redact before
   * logging. `filterInfo.errors` on the response carries server-returned errors only.
   * Rows are parsed individually: valid rows land in `items`, per-row failures
   * in `errors` (set `onParseError: "throw"` to fail hard on the first bad row).
   *
   * @param options - Search options including query text, filters, pagination, and schema
   * @returns Filtered list of awards plus per-row parse failures
   * @throws {FilterError} If a filter value is invalid (before any request)
   * @throws {Error} If the request fails
   *
   * @example
   * ```ts
   * // Search with query text (auto-paginates)
   * const results = await client.awards.search({ query: "research" });
   *
   * // Search with a standard filter
   * const awarded = await client.awards.search({ filters: { status: F.in(["awarded"]) } });
   *
   * // Get a specific page (disables auto-pagination)
   * const page2 = await client.awards.search({ query: "grants", page: 2, pageSize: 10 });
   * ```
   */
  async search<S extends AwardSchema = z.ZodType<TItem, unknown>>(
    options?: AwardSearchOptions<S, R>
  ): Promise<SearchResult<z.infer<S>, AwdFilters>> {
    const schema = this.resolveSchema(options?.schema);

    // Build the base search body (without pagination). Invalid filter values
    // throw FilterError here, before any request is sent.
    const searchBody = this.buildSearchBody(options);

    if (options?.page !== undefined) {
      return this.fetchSearchPage(
        searchBody,
        options.page,
        options.pageSize,
        options.signal,
        schema,
        options.onParseError
      );
    }

    // Auto-paginate using fetchMany with POST method. fetchMany preserves the
    // first page's full response envelope, so sortInfo and filterInfo pass
    // through without an extra request.
    const result = await this.client.fetchMany(`${this.basePath}/search`, {
      ...options,
      method: "POST",
      body: searchBody as Record<string, unknown>,
      schema,
    });

    return result as unknown as SearchResult<z.infer<S>, AwdFilters>;
  }

  /**
   * Builds the award search request body from options.
   *
   * Filter classification is fail-fast: `classifyFilters` throws `FilterError`
   * on the first invalid value, so a body is only produced for valid input.
   */
  private buildSearchBody(options?: AwardSearchOptions<AwardSchema, R>): AwdSearchRequest {
    const body: AwdSearchRequest = {};
    if (options?.query) body.search = options.query;
    if (options?.filters) {
      body.filters = classifyFilters(this.routes ?? {}, "awards", "search", options.filters);
    }
    return body;
  }

  /** Fetches a single award search page. */
  private async fetchSearchPage<S extends AwardSchema>(
    searchBody: AwdSearchRequest,
    page: number,
    pageSize: number | undefined,
    signal: AbortSignal | undefined,
    schema: S,
    onParseError?: OnParseError
  ): Promise<SearchResult<z.infer<S>, AwdFilters>> {
    const requestBody: AwdSearchRequest = {
      ...searchBody,
      pagination: {
        page,
        ...(pageSize && { pageSize }),
      },
    };

    const response = await this.client.post(`${this.basePath}/search`, requestBody, { signal });
    if (!response.ok) {
      throw new Error(`Failed to search awards: ${response.status} ${response.statusText}`);
    }

    // Validate the envelope with raw rows, then partition rows individually.
    // filterInfo passes through exactly as the server returned it.
    const envelope = FilteredSchema(z.unknown(), AwdFiltersSchema).parse(await response.json());
    const { items, errors } = parseBatch(
      schema,
      envelope.items as unknown[],
      onParseError ?? "collect"
    );
    return { ...envelope, items, errors } as unknown as SearchResult<z.infer<S>, AwdFilters>;
  }
}
