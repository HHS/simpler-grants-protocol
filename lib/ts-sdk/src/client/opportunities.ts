/**
 * Opportunities resource namespace for the CommonGrants API.
 */

import { z } from "zod";
import type { Client, FetchManyOptions } from "./client";
import type {
  OpportunityBase,
  OppStatusOptions,
  OppFilters,
  OppSearchRequest,
  Paginated,
  Filtered,
} from "../types";
import {
  OkSchema,
  PaginatedSchema,
  FilteredSchema,
  OpportunityBaseSchema,
  OppFiltersSchema,
} from "../schemas";
import { ArrayOperator } from "../constants";
import { classifyFilters } from "../extensions/custom-filters";
import type { PluginRoutes } from "../extensions/types";

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
type OppSchema = z.ZodType<OpportunityBase, z.ZodTypeDef, unknown>;

// =============================================================================
// Custom-filter bag typing (routes-driven)
// =============================================================================

/** Raw `{ operator, value }` filter object, as produced by the `F.*` helpers. */
type RawFilter = { operator: string; value: unknown };

/**
 * The declared custom-filter names for `opportunities.search` in a routes type.
 * `definePlugin` preserves the literal `routes` type (its `const TRoutes` generic),
 * so a plugin defined inline yields concrete filter-name literals here.
 */
type SearchFilterNames<R extends PluginRoutes> = R extends {
  opportunities: { search: { filters: infer Fs } };
}
  ? Extract<keyof Fs, string>
  : never;

/**
 * Typed filter bag for `search({ filters })`.
 *
 * Declared filter names surface in editor autocomplete with a typed value, while
 * arbitrary keys remain accepted — the spec supports ad-hoc (escape-hatch) filters
 * (bucket 3 of `classifyFilters`), so an unknown key cannot be rejected at the type
 * level without dropping ad-hoc support. Net: autocomplete + value-shape checking
 * for declared filters; NO typo-rejection on filter names (a typo is structurally
 * an intentional ad-hoc key). See SPIKE-FINDINGS.md.
 */
type CustomFilterBag<R extends PluginRoutes> = {
  [K in SearchFilterNames<R>]?: RawFilter;
} & Record<string, RawFilter>;

// =============================================================================
// Options types (schema in options for consistent API)
// =============================================================================

/** Options for getting a single opportunity */
export interface GetOptions<S extends OppSchema = typeof OpportunityBaseSchema> {
  /** Zod schema to parse and type the response. Defaults to `OpportunityBaseSchema`. */
  schema?: S;
}

/** Options for listing opportunities */
export interface ListOptions<
  S extends OppSchema = typeof OpportunityBaseSchema,
> extends FetchManyOptions<z.infer<S>> {
  /** Zod schema to parse and type each item. Defaults to `OpportunityBaseSchema`. */
  schema?: S;
}

/** Options for searching opportunities */
export interface SearchOptions<
  S extends OppSchema = typeof OpportunityBaseSchema,
  R extends PluginRoutes = PluginRoutes,
> extends FetchManyOptions<z.infer<S>> {
  /** Text query to search for in opportunity titles and descriptions */
  query?: string;
  /** Filter by opportunity statuses */
  statuses?: OppStatusOptions[];
  /**
   * Flat custom-filter bag (filter name → `{ operator, value }`, e.g. built with `F.*`).
   * Classified into the `OppFilters` request body via `classifyFilters` when present —
   * the same per-call channel as `schema`, which types the response. Pass `routes`
   * alongside so registered custom filters get typed names and validate against their specs.
   */
  filters?: CustomFilterBag<R>;
  /** The plugin's `routes` declaration. Used to classify/validate registered custom filters. */
  routes?: R;
  /** Zod schema to parse and type each item. Defaults to `OpportunityBaseSchema`. */
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
export class Opportunities {
  private readonly client: Client;
  private readonly basePath = "/common-grants/opportunities";

  constructor(client: Client) {
    this.client = client;
  }

  // ############################################################################
  // View opportunity details
  // ############################################################################

  /**
   * Get a specific opportunity by ID.
   *
   * @param id - The opportunity ID
   * @param options - Optional settings; use `schema` for typed custom field access.
   * @returns The opportunity data
   * @throws {Error} If the request fails
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
  async get<S extends OppSchema = typeof OpportunityBaseSchema>(
    id: string,
    options?: GetOptions<S>
  ): Promise<z.infer<S>> {
    const schema = options?.schema ?? (OpportunityBaseSchema as unknown as S);
    const response = await this.client.get(`${this.basePath}/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to get opportunity ${id}: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const result = OkSchema(schema).parse(json);

    return result.data as z.infer<S>;
  }

  // ############################################################################
  // List opportunities
  // ############################################################################

  /**
   * List opportunities with auto-pagination by default.
   *
   * @param options - Pagination and schema options. If `page` is specified, fetches only that page.
   *                  Use `schema` for typed custom field access.
   * @returns Paginated list of opportunities
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
  async list<S extends OppSchema = typeof OpportunityBaseSchema>(
    options?: ListOptions<S>
  ): Promise<Paginated<z.infer<S>>> {
    const schema = options?.schema ?? (OpportunityBaseSchema as unknown as S);

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
      return PaginatedSchema(schema).parse(json) as Paginated<z.infer<S>>;
    }

    // Auto-paginate by default
    return this.client.fetchMany(this.basePath, {
      ...options,
      schema,
    });
  }

  // ############################################################################
  // Search opportunities
  // ############################################################################

  /**
   * Search for opportunities based on query text and filters.
   *
   * Supports auto-pagination by default. If `page` is specified, only fetches that page.
   *
   * @param options - Search options including query text, status filters, pagination, and schema
   * @returns Filtered list of opportunities
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
  async search<
    S extends OppSchema = typeof OpportunityBaseSchema,
    R extends PluginRoutes = PluginRoutes,
  >(options?: SearchOptions<S, R>): Promise<Filtered<z.infer<S>, OppFilters>> {
    const schema = options?.schema ?? (OpportunityBaseSchema as unknown as S);

    // Build the base search body (without pagination)
    const searchBody = this.buildSearchBody(options);

    // If page is specified, fetch only that page
    if (options?.page !== undefined) {
      return this.fetchSearchPage(
        searchBody,
        options.page,
        options.pageSize,
        options.signal,
        schema
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

    return result as Filtered<z.infer<S>, OppFilters>;
  }

  // ############################################################################
  // Private helpers
  // ############################################################################

  /** Builds the search request body from options */
  private buildSearchBody(options?: SearchOptions<OppSchema>): OppSearchRequest {
    const body: OppSearchRequest = {};

    if (options?.query) {
      body.search = options.query;
    }

    // Custom filters → OppFilters wire body. Classification is wire-request
    // marshalling — the same category as the `statuses` shorthand below — so it
    // lives in the client method, not on the caller. `routes` arrives per-call,
    // mirroring the `schema` option that types the response.
    let filters: OppFilters | undefined;
    if (options?.filters) {
      // ponytail: cast bridges the Zod-inferred OppFilters to the hand-authored
      // OppFilters type alias; they are structurally the same shape.
      filters = classifyFilters(
        options.routes ?? {},
        "opportunities",
        "search",
        options.filters
      ) as OppFilters;
    }

    // statuses shorthand → status default field (augments any classified filters)
    if (options?.statuses?.length) {
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
    pageSize?: number,
    signal?: AbortSignal,
    schema: S = OpportunityBaseSchema as unknown as S
  ): Promise<Filtered<z.infer<S>, OppFilters>> {
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
    return FilteredSchema(schema, OppFiltersSchema).parse(json) as Filtered<z.infer<S>, OppFilters>;
  }
}
