/**
 * Client configuration and auth types.
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
 * Authentication method for API requests.
 */
export type AuthMethod =
  | { type: "bearer"; token: string }
  | { type: "apiKey"; key: string; header?: string }
  | { type: "none" };

/**
 * Auth helper for creating authentication configurations.
 */
export const Auth = {
  /**
   * Bearer token authentication.
   *
   * @example
   * Auth.bearer("your-jwt-token")
   */
  bearer(token: string): AuthMethod {
    return { type: "bearer", token };
  },

  /**
   * API key authentication.
   *
   * @example
   * Auth.apiKey("your-api-key")
   * Auth.apiKey("your-api-key", "X-Custom-Header")
   */
  apiKey(key: string, header = "X-API-Key"): AuthMethod {
    return { type: "apiKey", key, header };
  },

  /**
   * No authentication.
   */
  none(): AuthMethod {
    return { type: "none" };
  },
};

/**
 * Builds authorization headers from an auth method.
 */
export function buildAuthHeaders(auth: AuthMethod): Record<string, string> {
  switch (auth.type) {
    case "bearer":
      return { Authorization: `Bearer ${auth.token}` };
    case "apiKey":
      return { [auth.header ?? "X-API-Key"]: auth.key };
    case "none":
      return {};
  }
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
