import { describe, it, expect } from "vitest";
import { resolveConfig } from "../../src/client/config";

const BASE_URL = "https://api.example.org";

describe("resolveConfig", () => {
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

    expect(config.pageSize).toBe(25);
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
});
