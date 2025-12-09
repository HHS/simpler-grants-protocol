import { describe, it, expect } from "vitest";
import { Auth, buildAuthHeaders, AuthType } from "../../src/client/auth";

// =============================================================================
// Auth type
// =============================================================================

describe("Auth", () => {
  describe("bearer", () => {
    it("creates bearer token auth config", () => {
      const auth = Auth.bearer("test-token");

      expect(auth).toEqual({ type: "bearer", token: "test-token" });
    });
  });

  describe("apiKey", () => {
    it("creates API key auth config with default header", () => {
      const auth = Auth.apiKey("my-api-key");

      expect(auth).toEqual({ type: "apiKey", key: "my-api-key", header: "X-API-Key" });
    });

    it("creates API key auth config with custom header", () => {
      const auth = Auth.apiKey("my-api-key", "X-Custom-Header");

      expect(auth).toEqual({ type: "apiKey", key: "my-api-key", header: "X-Custom-Header" });
    });
  });

  describe("none", () => {
    it("creates no-auth config", () => {
      const auth = Auth.none();

      expect(auth).toEqual({ type: "none" });
    });
  });
});

// =============================================================================
// buildAuthHeaders
// =============================================================================

describe("buildAuthHeaders", () => {
  it("builds bearer token header", () => {
    const headers = buildAuthHeaders({ type: AuthType.BEARER, token: "my-token" });

    expect(headers).toEqual({ Authorization: "Bearer my-token" });
  });

  it("builds API key header with default name", () => {
    const headers = buildAuthHeaders({ type: AuthType.API_KEY, key: "my-key" });

    expect(headers).toEqual({ "X-API-Key": "my-key" });
  });

  it("builds API key header with custom name", () => {
    const headers = buildAuthHeaders({ type: AuthType.API_KEY, key: "my-key", header: "X-Custom" });

    expect(headers).toEqual({ "X-Custom": "my-key" });
  });

  it("returns empty headers for no auth", () => {
    const headers = buildAuthHeaders({ type: AuthType.NONE });

    expect(headers).toEqual({});
  });
});
