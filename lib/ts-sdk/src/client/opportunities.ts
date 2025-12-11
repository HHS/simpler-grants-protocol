/**
 * Opportunities resource namespace for the CommonGrants API.
 */

import type { Client, FetchManyOptions } from "./client";
import type {
  OpportunityBase,
  OpportunitiesListResponse,
  OpportunitiesFilteredResponse,
  OppStatusOptions,
} from "@/types";
import {
  OkSchema,
  PaginatedSchema,
  FilteredSchema,
  OpportunityBaseSchema,
  OppFiltersSchema,
} from "@/schemas";

// Response schemas with validation
const OpportunityResponseSchema = OkSchema(OpportunityBaseSchema);
const OpportunitiesListResponseSchema = PaginatedSchema(OpportunityBaseSchema);
const OpportunitiesFilteredResponseSchema = FilteredSchema(OpportunityBaseSchema, OppFiltersSchema);

// =============================================================================
// Search options
// =============================================================================

/** Options for searching opportunities */
export interface SearchOptions {
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
    const response = await this.client.fetch(`${this.basePath}/${id}`);

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
      const params = new URLSearchParams();
      params.set("page", String(options.page));
      if (options?.pageSize) params.set("pageSize", String(options.pageSize));

      const response = await this.client.fetch(`${this.basePath}?${params}`, {
        signal: options?.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to list opportunities: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      return OpportunitiesListResponseSchema.parse(json);
    }

    // Auto-paginate by default
    return this.client.fetchMany<OpportunityBase>(this.basePath, options);
  }

  // ############################################################################
  // Search opportunities
  // ############################################################################

  /**
   * Search for opportunities based on query text and filters.
   *
   * @param options - Search options including query text and status filters
   * @returns Filtered list of opportunities
   * @throws {Error} If the request fails
   *
   * @example
   * ```ts
   * // Search with query text
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
   * ```
   */
  async search(options?: SearchOptions): Promise<OpportunitiesFilteredResponse> {
    // Build request body
    const body: Record<string, unknown> = {};

    if (options?.query) {
      body.search = options.query;
    }

    if (options?.statuses && options.statuses.length > 0) {
      body.filters = {
        status: {
          operator: "in",
          value: options.statuses,
        },
      };
    }

    const response = await this.client.fetch(`${this.basePath}/search`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to search opportunities: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return OpportunitiesFilteredResponseSchema.parse(json);
  }
}
