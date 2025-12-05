import { describe, it, expect } from "vitest";
import { resolveConfig } from "../../src/client/config";

describe("resolveConfig", () => {
  it("strips trailing slashes from baseUrl", () => {
    const config = resolveConfig({ baseUrl: "https://api.example.org///" });

    expect(config.baseUrl).toBe("https://api.example.org");
  });

  it("applies default timeout", () => {
    const config = resolveConfig({ baseUrl: "https://api.example.org" });

    expect(config.timeout).toBe(30000);
  });

  it("applies default pageSize", () => {
    const config = resolveConfig({ baseUrl: "https://api.example.org" });

    expect(config.pageSize).toBe(25);
  });

  it("applies default maxItems", () => {
    const config = resolveConfig({ baseUrl: "https://api.example.org" });

    expect(config.maxItems).toBe(1000);
  });

  it("preserves custom timeout", () => {
    const config = resolveConfig({ baseUrl: "https://api.example.org", timeout: 5000 });

    expect(config.timeout).toBe(5000);
  });

  it("preserves custom pageSize", () => {
    const config = resolveConfig({ baseUrl: "https://api.example.org", pageSize: 50 });

    expect(config.pageSize).toBe(50);
  });

  it("preserves custom maxItems", () => {
    const config = resolveConfig({ baseUrl: "https://api.example.org", maxItems: 500 });

    expect(config.maxItems).toBe(500);
  });
});
