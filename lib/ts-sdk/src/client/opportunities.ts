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
// Search types
// =============================================================================

/** Options for searching opportunities */
export interface SearchOptions extends FetchManyOptions {
  /** Text query to search for in opportunity titles and descriptions */
  query?: string;
  /** Filter by opportunity statuses */
  statuses?: OppStatusOptions[];
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
   * @param schema - Zod schema to parse and type the response. Defaults to `OpportunityBaseSchema`.
   *                 Pass a schema from `withCustomFields()` for typed custom field access.
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
   *   { key: "legacyId", fieldType: "integer", valueSchema: z.number().int() },
   * ] as const);
   * const typed = await client.opportunities.get(id, OpportunitySchema);
   * console.log(typed.customFields?.legacyId?.value); // typed as number
   * ```
   */
  async get<S extends OppSchema = typeof OpportunityBaseSchema>(
    id: string,
    schema: S = OpportunityBaseSchema as unknown as S
  ): Promise<z.infer<S>> {
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
   * @param options - Pagination options. If `page` is specified, fetches only that page.
   *                  Otherwise, auto-paginates to fetch all items.
   * @param schema - Zod schema to parse and type each item. Defaults to `OpportunityBaseSchema`.
   *                 Pass a schema from `withCustomFields()` for typed custom field access.
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
   * const typed = await client.opportunities.list(undefined, OpportunitySchema);
   * ```
   */
  async list<S extends OppSchema = typeof OpportunityBaseSchema>(
    options?: FetchManyOptions,
    schema: S = OpportunityBaseSchema as unknown as S
  ): Promise<Paginated<z.infer<S>>> {
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
      parseItem: (item: unknown) => schema.parse(item) as z.infer<S>,
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
   * @param options - Search options including query text, status filters, and pagination
   * @param schema - Zod schema to parse and type each item. Defaults to `OpportunityBaseSchema`.
   *                 Pass a schema from `withCustomFields()` for typed custom field access.
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
   * const typed = await client.opportunities.search({ query: "test" }, OpportunitySchema);
   * ```
   */
  async search<S extends OppSchema = typeof OpportunityBaseSchema>(
    options?: SearchOptions,
    schema: S = OpportunityBaseSchema as unknown as S
  ): Promise<Filtered<z.infer<S>, OppFilters>> {
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

    // Auto-paginate by default using fetchMany with POST method
    const result = await this.client.fetchMany(this.basePath + "/search", {
      method: "POST",
      body: searchBody as Record<string, unknown>,
      pageSize: options?.pageSize,
      maxItems: options?.maxItems,
      signal: options?.signal,
      parseItem: (item: unknown) => schema.parse(item) as z.infer<S>,
    });

    // Fetch first page to get sortInfo and filterInfo metadata
    const firstPageResponse = await this.fetchSearchPage(
      searchBody,
      1,
      options?.pageSize,
      undefined,
      schema
    );

    // Merge the aggregated items with metadata from first page
    return {
      ...result,
      sortInfo: firstPageResponse.sortInfo,
      filterInfo: firstPageResponse.filterInfo,
    } as Filtered<z.infer<S>, OppFilters>;
  }

  // ############################################################################
  // Private helpers
  // ############################################################################

  /** Builds the search request body from options */
  private buildSearchBody(options?: SearchOptions): OppSearchRequest {
    const body: OppSearchRequest = {};

    if (options?.query) {
      body.search = options.query;
    }

    // Build filters from statuses shorthand and/or explicit filters
    if (options?.statuses?.length) {
      const filters: OppFilters = {};

      filters.status = {
        operator: ArrayOperator.in,
        value: options.statuses,
      };

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
