/**
 * Main HTTP client for the CommonGrants API.
 */

import {
  type ClientConfig,
  type ResolvedConfig,
  type AuthMethod,
  Auth,
  buildAuthHeaders,
  resolveConfig,
} from "./types";
import { Opportunities } from "./opportunities";
import type { Paginated } from "@/types";

/**
 * Options for the fetchMany auto-pagination method.
 */
export interface FetchManyOptions {
  /** Starting page number (default: 1) */
  page?: number;
  /** Items per page (uses client default if not specified) */
  pageSize?: number;
  /** Maximum total items to fetch (uses client default if not specified) */
  maxItems?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * HTTP client for interacting with the CommonGrants API.
 *
 * @example
 * ```ts
 * import { Client, Auth } from "@common-grants/sdk/client";
 *
 * const client = new Client({
 *   baseUrl: "https://api.example.org",
 *   auth: Auth.bearer("your-token"),
 * });
 *
 * // Get an opportunity
 * const opp = await client.opportunities.get("opp-123");
 * console.log(opp.title);
 *
 * // List opportunities
 * const list = await client.opportunities.list({ page: 1 });
 * ```
 */
export class Client {
  private readonly config: ResolvedConfig;
  private readonly auth: AuthMethod;

  /** Opportunities resource namespace */
  public readonly opportunities: Opportunities;

  constructor(options: ClientConfig & { auth?: AuthMethod }) {
    this.config = resolveConfig(options);
    this.auth = options.auth ?? Auth.none();

    // Initialize resource namespaces
    this.opportunities = new Opportunities(this);
  }

  /**
   * Makes an authenticated fetch request to the API.
   *
   * @param path - API path (will be appended to baseUrl)
   * @param init - Fetch init options
   * @returns Fetch Response
   *
   * @example
   * ```ts
   * const response = await client.fetch("/common-grants/opportunities");
   * const data = await response.json();
   * ```
   */
  async fetch(path: string, init?: RequestInit): Promise<Response> {
    const url = this.url(path);
    const headers = {
      "Content-Type": "application/json",
      ...buildAuthHeaders(this.auth),
      ...init?.headers,
    };

    const response = await fetch(url, {
      ...init,
      headers,
      signal: init?.signal ?? AbortSignal.timeout(this.config.timeout),
    });

    return response;
  }

  /**
   * Fetches all items from a paginated endpoint with auto-pagination.
   *
   * @param path - API path (will be appended to baseUrl)
   * @param options - Pagination options
   * @returns All items aggregated from paginated responses
   *
   * @example
   * ```ts
   * const result = await client.fetchMany<Opportunity>("/common-grants/opportunities");
   * console.log(result.items); // All opportunities
   * console.log(result.paginationInfo.totalItems);
   * ```
   */
  async fetchMany<T>(path: string, options?: FetchManyOptions): Promise<Paginated<T>> {
    const pageSize = options?.pageSize ?? this.config.pageSize;
    const maxItems = options?.maxItems ?? this.config.maxItems;
    let currentPage = options?.page ?? 1;

    const allItems: T[] = [];
    let totalItems: number | undefined;
    let totalPages: number | undefined;

    while (allItems.length < maxItems) {
      // Build URL with pagination params
      const url = new URL(this.url(path));
      url.searchParams.set("page", String(currentPage));
      url.searchParams.set("pageSize", String(pageSize));

      const response = await this.fetch(url.pathname + url.search, {
        signal: options?.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
      }

      const json = (await response.json()) as Paginated<T>;

      const { items, paginationInfo } = json;

      // Store pagination metadata from first response
      if (totalItems === undefined) {
        totalItems = paginationInfo.totalItems;
        totalPages = paginationInfo.totalPages;
      }

      // Add items up to maxItems limit
      const remainingCapacity = maxItems - allItems.length;
      const itemsToAdd = items.slice(0, remainingCapacity);
      allItems.push(...itemsToAdd);

      // Stop if we've fetched all available items
      const isLastPage =
        items.length < pageSize ||
        (totalPages !== undefined && currentPage >= totalPages) ||
        items.length === 0;

      if (isLastPage || allItems.length >= maxItems) {
        break;
      }

      currentPage++;
    }

    return {
      status: 200,
      message: "Success",
      items: allItems,
      paginationInfo: {
        page: 1,
        pageSize: allItems.length,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Constructs the full URL for an API path.
   */
  private url(path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.config.baseUrl}${normalizedPath}`;
  }

  /**
   * Gets the resolved client configuration.
   */
  getConfig(): ResolvedConfig {
    return { ...this.config };
  }
}
