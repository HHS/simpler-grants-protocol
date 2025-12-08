/** Authentication types and helpers. */

// =============================================================================
// Auth method type
// =============================================================================

/** Supported authentication types. */
enum AuthType {
  BEARER = "bearer",
  API_KEY = "apiKey",
  NONE = "none",
}

/** Authentication method for API requests. */
export type AuthMethod =
  | { type: AuthType.BEARER; token: string }
  | { type: AuthType.API_KEY; key: string; header?: string }
  | { type: AuthType.NONE };

// =============================================================================
// Auth constructor functions
// =============================================================================

/** Auth namespace for creating authentication configurations. */
export const Auth = {
  /**
   * Bearer token authentication.
   *
   * @example
   * Auth.bearer("your-jwt-token")
   */
  bearer(token: string): AuthMethod {
    return { type: AuthType.BEARER, token };
  },

  /**
   * API key authentication.
   *
   * @example
   * Auth.apiKey("your-api-key")
   * Auth.apiKey("your-api-key", "X-Custom-Header")
   */
  apiKey(key: string, header = "X-API-Key"): AuthMethod {
    return { type: AuthType.API_KEY, key, header };
  },

  /** No authentication. */
  none(): AuthMethod {
    return { type: AuthType.NONE };
  },
};

// =============================================================================
// Auth header builder function
// =============================================================================

/** Builds authorization headers from an auth method. */
export function buildAuthHeaders(auth: AuthMethod): Record<string, string> {
  switch (auth.type) {
    case AuthType.BEARER:
      return { Authorization: `Bearer ${auth.token}` };
    case AuthType.API_KEY:
      return { [auth.header ?? "X-API-Key"]: auth.key };
    default:
      return {};
  }
}
