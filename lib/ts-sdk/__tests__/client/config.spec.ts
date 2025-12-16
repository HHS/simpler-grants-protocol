import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveConfig } from "../../src/client/config";

const BASE_URL = "https://api.example.org";

describe("resolveConfig", () => {
  // Store original env vars to restore after tests
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars before each test
    delete process.env.CG_API_BASE_URL;
    delete process.env.CG_API_TIMEOUT;
    delete process.env.CG_API_PAGE_SIZE;
    delete process.env.CG_API_LIST_ITEMS_LIMIT;
  });

  afterEach(() => {
    // Restore original env vars after each test
    process.env = { ...originalEnv };
  });

  // ===========================================================================
  // Default values
  // ===========================================================================

  it("strips trailing slashes from baseUrl", () => {
    const config = resolveConfig({ baseUrl: `${BASE_URL}///` });

    expect(config.baseUrl).toBe(BASE_URL);
  });

  it("applies default timeout", () => {
    const config = resolveConfig({ baseUrl: BASE_URL });

    expect(config.timeout).toBe(30000);
  });

  it("applies default pageSize", () => {
    const config = resolveConfig({ baseUrl: BASE_URL });

    expect(config.pageSize).toBe(100);
  });

  it("applies default maxItems", () => {
    const config = resolveConfig({ baseUrl: BASE_URL });

    expect(config.maxItems).toBe(1000);
  });

  it("preserves custom timeout", () => {
    const config = resolveConfig({ baseUrl: BASE_URL, timeout: 5000 });

    expect(config.timeout).toBe(5000);
  });

  it("preserves custom pageSize", () => {
    const config = resolveConfig({ baseUrl: BASE_URL, pageSize: 50 });

    expect(config.pageSize).toBe(50);
  });

  it("preserves custom maxItems", () => {
    const config = resolveConfig({ baseUrl: BASE_URL, maxItems: 500 });

    expect(config.maxItems).toBe(500);
  });

  // ===========================================================================
  // Environment variable fallbacks
  // ===========================================================================

  it("falls back to CG_API_BASE_URL env var", () => {
    process.env.CG_API_BASE_URL = "https://env.example.org";

    const config = resolveConfig({});

    expect(config.baseUrl).toBe("https://env.example.org");
  });

  it("falls back to CG_API_TIMEOUT env var", () => {
    process.env.CG_API_TIMEOUT = "5000";

    const config = resolveConfig({ baseUrl: BASE_URL });

    expect(config.timeout).toBe(5000);
  });

  it("falls back to CG_API_PAGE_SIZE env var", () => {
    process.env.CG_API_PAGE_SIZE = "50";

    const config = resolveConfig({ baseUrl: BASE_URL });

    expect(config.pageSize).toBe(50);
  });

  it("falls back to CG_API_LIST_ITEMS_LIMIT env var", () => {
    process.env.CG_API_LIST_ITEMS_LIMIT = "500";

    const config = resolveConfig({ baseUrl: BASE_URL });

    expect(config.maxItems).toBe(500);
  });

  it("prefers config values over env vars", () => {
    process.env.CG_API_BASE_URL = "https://env.example.org";
    process.env.CG_API_TIMEOUT = "1000";

    const config = resolveConfig({ baseUrl: BASE_URL, timeout: 5000 });

    expect(config.baseUrl).toBe(BASE_URL);
    expect(config.timeout).toBe(5000);
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  it("throws if baseUrl is not provided and env var is not set", () => {
    expect(() => resolveConfig({})).toThrow("baseUrl is required");
  });

  it("throws if baseUrl does not use http:// or https://", () => {
    expect(() => resolveConfig({ baseUrl: "ftp://example.org" })).toThrow(
      "baseUrl must use http:// or https://"
    );
  });

  it("throws if baseUrl is not a valid URL", () => {
    expect(() => resolveConfig({ baseUrl: "not a valid url" })).toThrow("Invalid baseUrl");
  });

  it("accepts http:// URLs", () => {
    const config = resolveConfig({ baseUrl: "http://localhost:8000" });

    expect(config.baseUrl).toBe("http://localhost:8000");
  });

  it("accepts https:// URLs", () => {
    const config = resolveConfig({ baseUrl: "https://api.example.org" });

    expect(config.baseUrl).toBe("https://api.example.org");
  });
});
