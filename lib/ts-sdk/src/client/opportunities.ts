/**
 * Opportunities resource namespace for the CommonGrants API.
 */

import type { Client, FetchManyOptions } from "./client";
import type { OpportunityBase, OpportunitiesListResponse } from "@/types";
import { OkSchema, PaginatedSchema, OpportunityBaseSchema } from "@/schemas";

// Response schemas with validation
const OpportunityResponseSchema = OkSchema(OpportunityBaseSchema);
const OpportunitiesListResponseSchema = PaginatedSchema(OpportunityBaseSchema);

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
}
