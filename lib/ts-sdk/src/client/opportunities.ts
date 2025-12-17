/**
 * Opportunities resource namespace for the CommonGrants API.
 */

import type { Client, FetchManyOptions } from "./client";
import type {
  OpportunityBase,
  OpportunitiesListResponse,
  OpportunitiesFilteredResponse,
  OppStatusOptions,
  OppFilters,
  OppSearchRequest,
} from "../types";
import {
  OkSchema,
  PaginatedSchema,
  FilteredSchema,
  OpportunityBaseSchema,
  OppFiltersSchema,
} from "../schemas";
import { ArrayOperator } from "../constants";

// Response schemas with validation
const OpportunityResponseSchema = OkSchema(OpportunityBaseSchema);
const OpportunitiesListResponseSchema = PaginatedSchema(OpportunityBaseSchema);
const OpportunitiesFilteredResponseSchema = FilteredSchema(OpportunityBaseSchema, OppFiltersSchema);

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
   * @returns The opportunity data
   * @throws {Error} If the request fails
   *
   * @example
   * ```ts
   * const opp = await client.opportunities.get("123e4567-e89b-12d3-a456-426614174000");
   * console.log(opp.title);
   * ```
   */
  async get(id: string): Promise<OpportunityBase> {
    const response = await this.client.get(`${this.basePath}/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to get opportunity ${id}: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const result = OpportunityResponseSchema.parse(json);

    return result.data;
  }

  // ############################################################################
  // List opportunities
  // ############################################################################

  /**
   * List opportunities with auto-pagination by default.
   *
   * @param options - Pagination options. If `page` is specified, fetches only that page.
   *                  Otherwise, auto-paginates to fetch all items.
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
   * ```
   */
  async list(options?: FetchManyOptions): Promise<OpportunitiesListResponse> {
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
      return OpportunitiesListResponseSchema.parse(json);
    }

    // Auto-paginate by default
    return this.client.fetchMany<OpportunityBase>(this.basePath, {
      ...options,
      parseItem: item => OpportunityBaseSchema.parse(item),
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
   * ```
   */
  async search(options?: SearchOptions): Promise<OpportunitiesFilteredResponse> {
    // Build the base search body (without pagination)
    const searchBody = this.buildSearchBody(options);

    // If page is specified, fetch only that page
    if (options?.page !== undefined) {
      return this.fetchSearchPage(searchBody, options.page, options.pageSize, options.signal);
    }

    // Auto-paginate by default using fetchMany with POST method
    const result = await this.client.fetchMany<OpportunityBase>(`${this.basePath}/search`, {
      method: "POST",
      body: searchBody as Record<string, unknown>,
      pageSize: options?.pageSize,
      maxItems: options?.maxItems,
      signal: options?.signal,
      parseItem: item => OpportunityBaseSchema.parse(item),
    });

    // Fetch first page to get sortInfo and filterInfo metadata
    const firstPageResponse = await this.fetchSearchPage(searchBody, 1, options?.pageSize);

    // Merge the aggregated items with metadata from first page
    return {
      ...result,
      sortInfo: firstPageResponse.sortInfo,
      filterInfo: firstPageResponse.filterInfo,
    };
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
  private async fetchSearchPage(
    searchBody: OppSearchRequest,
    page: number,
    pageSize?: number,
    signal?: AbortSignal
  ): Promise<OpportunitiesFilteredResponse> {
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
    return OpportunitiesFilteredResponseSchema.parse(json);
  }
}
