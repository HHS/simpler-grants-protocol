/**
 * Client configuration types and helpers.
 */

/**
 * Configuration options for the CommonGrants client.
 */
export interface ClientConfig {
  /** Base URL of the API (e.g., "https://api.example.org") */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Default page size for list operations (default: 25) */
  pageSize?: number;
  /** Maximum items to fetch when auto-paginating (default: 1000) */
  maxItems?: number;
}

/**
 * Resolved configuration with all defaults applied.
 */
export interface ResolvedConfig {
  baseUrl: string;
  timeout: number;
  pageSize: number;
  maxItems: number;
}

/**
 * Resolves client config with defaults.
 */
export function resolveConfig(config: ClientConfig): ResolvedConfig {
  return {
    baseUrl: config.baseUrl.replace(/\/+$/, ""), // Strip trailing slashes
    timeout: config.timeout ?? 30000,
    pageSize: config.pageSize ?? 25,
    maxItems: config.maxItems ?? 1000,
  };
}
