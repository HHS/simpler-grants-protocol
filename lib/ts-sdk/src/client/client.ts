/**
 * Main HTTP client for the CommonGrants API.
 */

import { type ClientConfig, type ResolvedConfig, resolveConfig } from "./config";
import { Auth, buildAuthHeaders, type AuthMethod } from "./auth";
import { Opportunities } from "./opportunities";
import type { Paginated } from "../types";

// =============================================================================
// Options interfaces
// =============================================================================

/** Options for GET requests */
export interface GetOptions {
  /** Query parameters to append to the URL */
  params?: Record<string, string | number | boolean>;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/** Options for POST requests */
export interface PostOptions {
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/** Options for the fetchMany auto-pagination method. */
export interface FetchManyOptions<T = unknown> {
  /** Starting page number (default: 1) */
  page?: number;
  /** Items per page (uses client default if not specified) */
  pageSize?: number;
  /** Maximum total items to fetch (uses client default if not specified) */
  maxItems?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** HTTP method (default: "GET") */
  method?: "GET" | "POST";
  /** Request body for POST requests (pagination will be merged in) */
  body?: Record<string, unknown>;
  /** Optional function to parse/validate each item (e.g., using Zod schema.parse) */
  parseItem?: (item: unknown) => T;
}

// =============================================================================
// Client class
// =============================================================================

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

  // =============================================================================
  // Client constructor
  // =============================================================================

  constructor(options: ClientConfig & { auth?: AuthMethod }) {
    this.config = resolveConfig(options);
    this.auth = options.auth ?? Auth.none();

    // Initialize resource namespaces
    this.opportunities = new Opportunities(this);
  }

  // =============================================================================
  // Client.fetch - raw fetch with auth
  // =============================================================================

  /**
   * Makes an authenticated fetch request to the API.
   * This is the lowest-level method - use `get()` or `post()` for convenience.
   *
   * @param path - API path (will be appended to baseUrl)
   * @param init - Fetch init options
   * @returns Fetch Response
   *
   * @example
   * ```ts
   * const response = await client.fetch("/common-grants/opportunities", {
   *   method: "DELETE",
   * });
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

  // =============================================================================
  // Client.get - GET request helper
  // =============================================================================

  /**
   * Makes an authenticated GET request to the API.
   *
   * @param path - API path (will be appended to baseUrl)
   * @param options - GET request options
   * @returns Fetch Response
   *
   * @example
   * ```ts
   * const response = await client.get("/common-grants/opportunities", {
   *   params: { page: 1, pageSize: 10 }
   * });
   * const data = await response.json();
   * ```
   */
  async get(path: string, options?: GetOptions): Promise<Response> {
    let fullPath = path;

    // Append query params if provided
    if (options?.params && Object.keys(options.params).length > 0) {
      const url = new URL(this.url(path));
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, String(value));
      }
      fullPath = url.pathname + url.search;
    }

    return this.fetch(fullPath, {
      method: "GET",
      signal: options?.signal,
    });
  }

  // =============================================================================
  // Client.post - POST request helper
  // =============================================================================

  /**
   * Makes an authenticated POST request to the API.
   *
   * @param path - API path (will be appended to baseUrl)
   * @param body - Request body (will be JSON stringified)
   * @param options - POST request options
   * @returns Fetch Response
   *
   * @example
   * ```ts
   * const response = await client.post("/common-grants/opportunities/search", {
   *   filters: { status: "open" },
   *   pagination: { page: 1, pageSize: 10 }
   * });
   * const data = await response.json();
   * ```
   */
  async post(path: string, body: unknown, options?: PostOptions): Promise<Response> {
    return this.fetch(path, {
      method: "POST",
      body: JSON.stringify(body),
      signal: options?.signal,
    });
  }

  // =============================================================================
  // Client.fetchMany - auto-pagination
  // =============================================================================

  /**
   * Fetches all items from a paginated endpoint with auto-pagination.
   *
   * @param path - API path (will be appended to baseUrl)
   * @param options - Pagination options
   * @returns All items aggregated from paginated responses
   *
   * @example
   * ```ts
   * // GET with auto-pagination
   * const result = await client.fetchMany<Opportunity>("/common-grants/opportunities");
   *
   * // POST with auto-pagination (for search endpoints)
   * const searched = await client.fetchMany<Opportunity>("/common-grants/opportunities/search", {
   *   method: "POST",
   *   body: { filters: { status: "open" } }
   * });
   * ```
   */
  async fetchMany<T>(path: string, options?: FetchManyOptions<T>): Promise<Paginated<T>> {
    // Set defaults.
    const pageSize = options?.pageSize ?? this.config.pageSize;
    const maxItems = options?.maxItems ?? this.config.maxItems;
    const method = options?.method ?? "GET";
    const startPage = options?.page ?? 1;

    // Fetch first page so we always have firstPageJson.
    const firstResult = await this.fetchOnePage<T>(path, method, startPage, pageSize, options);
    const firstPageJson = firstResult.json;
    const allItems: T[] = [...firstResult.items.slice(0, maxItems)];

    // Fetch remaining pages, up to maxItems.
    let currentPage = startPage + 1;
    while (allItems.length < maxItems && !firstResult.isLastPage) {
      const result = await this.fetchOnePage<T>(path, method, currentPage, pageSize, options);

      // Add items up to maxItems limit.
      const remainingCapacity = maxItems - allItems.length;
      allItems.push(...result.items.slice(0, remainingCapacity));

      // Stop if we've fetched all available items.
      if (result.isLastPage || allItems.length >= maxItems) break;
      currentPage++;
    }

    // Return the results.
    return {
      ...firstPageJson,
      items: allItems,
      paginationInfo: {
        ...firstPageJson.paginationInfo,
        page: 1,
        pageSize: allItems.length,
      },
    } as Paginated<T>;
  }

  // =============================================================================
  // Private helper functions
  // =============================================================================

  /**
   * Fetches a single page from a paginated endpoint and returns the parsed
   * items plus metadata needed to drive fetchMany's aggregation loop.
   */
  private async fetchOnePage<T>(
    path: string,
    method: "GET" | "POST",
    currentPage: number,
    pageSize: number,
    options?: FetchManyOptions<T>
  ): Promise<{
    json: Paginated<unknown>;
    items: T[];
    isLastPage: boolean;
    totalPages: number | undefined;
  }> {
    let response: Response;

    // Fetch the page.
    if (method === "POST") {
      // Add pagination to the request body if it's a POST request.
      const requestBody = {
        ...options?.body,
        pagination: { page: currentPage, pageSize },
      };
      response = await this.post(path, requestBody, { signal: options?.signal });
    } else {
      // Add pagination to the request params if it's a GET request.
      response = await this.get(path, {
        params: { page: currentPage, pageSize },
        signal: options?.signal,
      });
    }

    // Throw an error if the response is not OK.
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
    }

    // Parse/validate items if parseItem function is provided
    const json = (await response.json()) as Paginated<unknown>;
    const { items: rawItems, paginationInfo } = json;
    const items: T[] = options?.parseItem
      ? rawItems.map(item => options.parseItem!(item))
      : (rawItems as T[]);

    // Determine if this is the last page.
    const totalPages = paginationInfo.totalPages ?? undefined;
    const isLastPage =
      items.length < pageSize ||
      (totalPages !== undefined && currentPage >= totalPages) ||
      items.length === 0;

    // Return the results.
    return { json, items, isLastPage, totalPages };
  }

  /** Constructs the full URL for an API path. */
  private url(path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.config.baseUrl}${normalizedPath}`;
  }

  /** Gets the resolved client configuration. */
  getConfig(): ResolvedConfig {
    return { ...this.config };
  }
}
