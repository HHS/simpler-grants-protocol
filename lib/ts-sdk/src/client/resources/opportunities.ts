/**
 * Opportunities resource namespace for the CommonGrants API.
 */

import { z } from "zod";
import type { Client, FetchManyOptions } from "../client";
import type { OpportunityBase, OppStatusOptions, OppFilters, OppSearchRequest } from "../../types";
import {
  OkSchema,
  PaginatedSchema,
  FilteredSchema,
  OpportunityBaseSchema,
  OppFiltersSchema,
} from "../../schemas";
import { ArrayOperator } from "../../constants";
import { classifyFilters, validateRoutes } from "../../extensions/custom-filters";
import type { CustomFilterInput } from "../../extensions/custom-filters";
import { FilterError } from "../../extensions/types";
import type { CustomFilterType, PluginRoutes } from "../../extensions/types";
import { parseBatch } from "../results";
import type { ListResult, OnParseError, SearchResult } from "../results";
import { Resource } from "./base";

// =============================================================================
// Schema type constraint
// =============================================================================

/**
 * Constrains the schema parameter to any Zod schema whose `.parse()` output
 * is at least an `OpportunityBase`.
 *
 * We intentionally constrain on the OUTPUT type (`OpportunityBase`) rather than
 * the concrete schema type (`typeof OpportunityBaseSchema`). This is because
 * `withCustomFields()` returns a schema with a different internal Zod type tree
 * (e.g. a typed `ZodOptional` for `customFields` instead of `ZodNullable<ZodRecord>`),
 * even though its parsed output is still a superset of `OpportunityBase`. Constraining
 * on the output type accepts both the base schema and any extended variant.
 */
type OppSchema = z.ZodType<OpportunityBase, unknown>;

// =============================================================================
// Custom-filter bag typing (routes-driven)
// =============================================================================

/** Raw `{ operator, value }` filter object, as produced by the `F.*` helpers. */
type RawFilter = { operator: string; value: unknown };

/**
 * The declared filter specs for `opportunities.search` in a routes type.
 * `definePlugin` preserves the literal `routes` type (its `const TRoutes` generic),
 * so a plugin defined inline yields concrete filter-name and filterType literals here.
 */
type RouteFilters<R extends PluginRoutes> = R extends {
  opportunities: { search: { filters: infer Fs } };
}
  ? Fs
  : never;

/** The declared custom-filter names for `opportunities.search` in a routes type. */
type CustomFilterNames<R extends PluginRoutes> = Extract<keyof RouteFilters<R>, string>;

/**
 * Typed filter bag for `search({ filters })`.
 *
 * Declared filter names surface in editor autocomplete with the value typed by
 * their declared `filterType` (a wrong value family is a compile error), while
 * arbitrary keys remain accepted — the spec supports ad-hoc (escape-hatch) filters,
 * so an unknown key cannot be rejected at the type level without dropping ad-hoc
 * support (a typo is structurally an intentional ad-hoc key). Runtime validation
 * backstops both cases.
 */
export type CustomFilterBag<R extends PluginRoutes> = {
  [K in CustomFilterNames<R>]?: RouteFilters<R>[K] extends {
    filterType: infer FT extends CustomFilterType;
  }
    ? CustomFilterInput<FT>
    : RawFilter;
} & Record<string, RawFilter>;

// =============================================================================
// Options types (schema in options for consistent API)
// =============================================================================

/** Options for getting a single opportunity */
export interface GetOptions<S extends OppSchema = typeof OpportunityBaseSchema> {
  /** Zod schema to parse and type the response. Defaults to the bound (plugin or base) schema. */
  schema?: S;
}

/** Options for listing opportunities */
export interface ListOptions<
  S extends OppSchema = typeof OpportunityBaseSchema,
> extends FetchManyOptions<z.infer<S>> {
  /** Zod schema to parse and type each item. Defaults to the bound (plugin or base) schema. */
  schema?: S;
}

/** Options for searching opportunities */
export interface SearchOptions<
  S extends OppSchema = typeof OpportunityBaseSchema,
  R extends PluginRoutes = PluginRoutes,
> extends FetchManyOptions<z.infer<S>> {
  /** Text query to search for in opportunity titles and descriptions */
  query?: string;
  /**
   * Filter by opportunity statuses (shorthand for the `status` filter).
   * @deprecated Pass status through `filters` instead; this shorthand will be
   * removed in a future release.
   */
  statuses?: OppStatusOptions[];
  /**
   * Flat custom-filter bag (filter name → `{ operator, value }`, e.g. built with `F.*`).
   * Classified into the `OppFilters` request body via `classifyFilters` when present;
   * an invalid value on any key throws `FilterError` before the request is sent.
   */
  filters?: CustomFilterBag<R>;
  /** Zod schema to parse and type each item. Defaults to the bound (plugin or base) schema. */
  schema?: S;
}

/**
 * Opportunities resource - provides methods for interacting with opportunities.
 *
 * @example
 * ```ts
 * const client = new Client({ baseUrl: "https://api.example.org" });
 *
 * // Get a single opportunity
 * const opp = await client.opportunities.get("opp-123");
 *
 * // List opportunities
 * const list = await client.opportunities.list();
 * ```
 */
export class Opportunities<
  R extends PluginRoutes = PluginRoutes,
  TItem extends OpportunityBase = OpportunityBase,
> extends Resource<TItem> {
  private readonly basePath = "/common-grants/opportunities";

  constructor(client: Client, boundSchema?: z.ZodType<TItem, z.ZodTypeDef, unknown>, routes?: R) {
    super(
      client,
      boundSchema ?? (OpportunityBaseSchema as unknown as z.ZodType<TItem, z.ZodTypeDef, unknown>),
      routes
    );
    // Backstop for direct construction (bypassing definePlugin): an invalid
    // registration — e.g. a filter named after a default field — throws here
    // instead of silently shadowing the default bucket at classification time.
    if (routes) validateRoutes(routes);
  }

  /** Per-call override wins; otherwise the bound (plugin or base) schema. */
  private resolveSchema<S extends OppSchema>(override?: S): S {
    return override ?? (this.boundSchema as unknown as S);
  }

  // ############################################################################
  // View opportunity details
  // ############################################################################

  /**
   * Get a specific opportunity by ID.
   *
   * A single requested entity that does not parse is a real error, so `get()`
   * is fail-hard: a malformed response throws.
   *
   * @param id - The opportunity ID
   * @param options - Optional settings; use `schema` for typed custom field access.
   * @returns The opportunity data
   * @throws {Error} If the request fails or the response does not parse
   *
   * @example
   * ```ts
   * // Default usage
   * const opp = await client.opportunities.get("123e4567-e89b-12d3-a456-426614174000");
   * console.log(opp.title);
   *
   * // With a custom-fields schema for typed access
   * const OpportunitySchema = withCustomFields(OpportunityBaseSchema, [
   *   { key: "legacyId", fieldType: "integer", value: z.number().int() },
   * ] as const);
   * const typed = await client.opportunities.get(id, { schema: OpportunitySchema });
   * console.log(typed.customFields?.legacyId?.value); // typed as number
   * ```
   */
  async get<S extends OppSchema = z.ZodType<TItem, z.ZodTypeDef, unknown>>(
    id: string,
    options?: GetOptions<S>
  ): Promise<z.infer<S>> {
    const schema = this.resolveSchema(options?.schema);
    const response = await this.client.get(`${this.basePath}/${encodeURIComponent(id)}`);

    if (!response.ok) {
      throw new Error(`Failed to get opportunity ${id}: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const result = OkSchema(schema).parse(json) as { data: z.infer<S> };

    return result.data;
  }

  // ############################################################################
  // List opportunities
  // ############################################################################

  /**
   * List opportunities with auto-pagination by default.
   *
   * Rows are parsed individually: valid rows land in `items`, per-row failures
   * in `errors` (set `onParseError: "throw"` to fail hard on the first bad row).
   *
   * @param options - Pagination and schema options. If `page` is specified, fetches only that page.
   *                  Use `schema` for typed custom field access.
   * @returns Paginated list of opportunities plus per-row parse failures
   * @throws {Error} If the request fails
   *
   * @example
   * ```ts
   * // Auto-paginate to fetch all opportunities (default)
   * const all = await client.opportunities.list();
   *
   * // Auto-paginate with custom limits
   * const limited = await client.opportunities.list({ maxItems: 500, pageSize: 50 });
   *
   * // Get a specific page (disables auto-pagination)
   * const page2 = await client.opportunities.list({ page: 2, pageSize: 10 });
   *
   * // With a custom-fields schema
   * const typed = await client.opportunities.list({ schema: OpportunitySchema });
   * ```
   */
  async list<S extends OppSchema = z.ZodType<TItem, z.ZodTypeDef, unknown>>(
    options?: ListOptions<S>
  ): Promise<ListResult<z.infer<S>>> {
    const schema = this.resolveSchema(options?.schema);

    // If page is specified, fetch only that page
    if (options?.page !== undefined) {
      const params: Record<string, number> = { page: options.page };
      if (options?.pageSize) params.pageSize = options.pageSize;

      const response = await this.client.get(this.basePath, {
        params,
        signal: options?.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to list opportunities: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      // Validate the envelope with raw rows, then partition rows individually.
      const envelope = PaginatedSchema(z.unknown()).parse(json);
      const { items, errors } = parseBatch(
        schema,
        envelope.items as unknown[],
        options?.onParseError ?? "collect"
      );
      return { ...envelope, items, errors } as ListResult<z.infer<S>>;
    }

    // Auto-paginate by default
    return this.client.fetchMany(this.basePath, {
      ...options,
      schema,
    }) as Promise<ListResult<z.infer<S>>>;
  }

  // ############################################################################
  // Search opportunities
  // ############################################################################

  /**
   * Search for opportunities based on query text and filters.
   *
   * Supports auto-pagination by default. If `page` is specified, only fetches that page.
   *
   * Filter validation is fail-fast: an invalid value on any filter — standard,
   * registered custom, or ad-hoc — throws `FilterError` before the request is
   * sent. A caught `FilterError`'s `.sourceValue` may carry PII; redact before
   * logging. `filterInfo.errors` on the response carries server-returned errors only.
   * Rows are parsed individually: valid rows land in `items`, per-row failures
   * in `errors` (set `onParseError: "throw"` to fail hard on the first bad row).
   *
   * @param options - Search options including query text, status filters, pagination, and schema
   * @returns Filtered list of opportunities plus per-row parse failures
   * @throws {FilterError} If a filter value is invalid (before any request)
   * @throws {Error} If the request fails
   *
   * @example
   * ```ts
   * // Search with query text (auto-paginates)
   * const results = await client.opportunities.search({ query: "education" });
   *
   * // Search with status filter
   * const openOpps = await client.opportunities.search({ statuses: ["open"] });
   *
   * // Search with both query and statuses
   * const filtered = await client.opportunities.search({
   *   query: "community",
   *   statuses: ["open", "forecasted"],
   * });
   *
   * // Get a specific page (disables auto-pagination)
   * const page2 = await client.opportunities.search({
   *   query: "grants",
   *   page: 2,
   *   pageSize: 10,
   * });
   *
   * // Auto-paginate with limits
   * const limited = await client.opportunities.search({
   *   query: "research",
   *   maxItems: 100,
   *   pageSize: 25,
   * });
   *
   * // With a custom-fields schema
   * const typed = await client.opportunities.search({ query: "test", schema: OpportunitySchema });
   * ```
   */
  async search<S extends OppSchema = z.ZodType<TItem, z.ZodTypeDef, unknown>>(
    options?: SearchOptions<S, R>
  ): Promise<SearchResult<z.infer<S>>> {
    const schema = this.resolveSchema(options?.schema);

    // Build the base search body (without pagination). Invalid filter values
    // throw FilterError here — before any request is sent.
    const searchBody = this.buildSearchBody(options);

    // If page is specified, fetch only that page
    if (options?.page !== undefined) {
      return this.fetchSearchPage(
        searchBody,
        options.page,
        options.pageSize,
        options.signal,
        schema,
        options?.onParseError
      );
    }

    // Auto-paginate using fetchMany with POST method.
    // fetchMany preserves the first page's full response envelope, so
    // sortInfo and filterInfo pass through without an extra request.
    const result = await this.client.fetchMany(this.basePath + "/search", {
      ...options,
      method: "POST",
      body: searchBody as Record<string, unknown>,
      schema,
    });

    return result as unknown as SearchResult<z.infer<S>>;
  }

  // ############################################################################
  // Private helpers
  // ############################################################################

  /**
   * Builds the search request body from options.
   *
   * Filter classification is fail-fast: `classifyFilters` throws `FilterError`
   * on the first invalid value, so a body is only produced for valid input.
   */
  private buildSearchBody(options?: SearchOptions<OppSchema, R>): OppSearchRequest {
    const body: OppSearchRequest = {};

    if (options?.query) {
      body.search = options.query;
    }

    let filters: OppFilters | undefined;
    if (options?.filters) {
      filters = classifyFilters(this.routes ?? {}, "opportunities", "search", options.filters);
    }

    // statuses shorthand → status default field (augments any classified filters)
    if (options?.statuses?.length) {
      if (filters?.status !== undefined) {
        throw new FilterError(
          "specified via both the statuses shorthand and the filters argument; pass one or the other",
          { path: "filters.status", sourceValue: options.statuses }
        );
      }
      filters = filters ?? {};
      filters.status = {
        operator: ArrayOperator.in,
        value: options.statuses,
      };
    }

    if (filters) {
      body.filters = filters;
    }

    return body;
  }

  /** Fetches a single search page */
  private async fetchSearchPage<S extends OppSchema>(
    searchBody: OppSearchRequest,
    page: number,
    pageSize: number | undefined,
    signal: AbortSignal | undefined,
    schema: S,
    onParseError?: OnParseError
  ): Promise<SearchResult<z.infer<S>>> {
    const requestBody: OppSearchRequest = {
      ...searchBody,
      pagination: {
        page,
        ...(pageSize && { pageSize }),
      },
    };

    const response = await this.client.post(`${this.basePath}/search`, requestBody, { signal });

    if (!response.ok) {
      throw new Error(`Failed to search opportunities: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    // Validate the envelope with raw rows, then partition rows individually.
    // filterInfo passes through exactly as the server returned it.
    const envelope = FilteredSchema(z.unknown(), OppFiltersSchema).parse(json);
    const { items, errors } = parseBatch(
      schema,
      envelope.items as unknown[],
      onParseError ?? "collect"
    );
    return { ...envelope, items, errors } as unknown as SearchResult<z.infer<S>>;
  }
}
