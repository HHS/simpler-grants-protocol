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

export { Auth };
export type { ClientConfig, AuthMethod };

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
