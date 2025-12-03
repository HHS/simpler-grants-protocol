/** Authentication types and helpers. */

// =============================================================================
// Auth method type
// =============================================================================

/** Authentication method for API requests. */
export type AuthMethod =
  | { type: "bearer"; token: string }
  | { type: "apiKey"; key: string; header?: string }
  | { type: "none" };

// =============================================================================
// Auth helper functions
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

  /** No authentication. */
  none(): AuthMethod {
    return { type: "none" };
  },
};

// =============================================================================
// Auth helper functions
// =============================================================================

/** Builds authorization headers from an auth method. */
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
