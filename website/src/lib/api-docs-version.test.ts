import { describe, it, expect } from "vitest";
import { resolveVersion } from "./api-docs-version";

const versions = ["0.3.0", "0.2.0", "0.1.0"];

describe("resolveVersion", () => {
  it("returns a known bare version unchanged", () => {
    expect(resolveVersion("0.2.0", versions)).toBe("0.2.0");
    expect(resolveVersion("0.1.0", versions)).toBe("0.1.0");
  });

  it("normalizes the v-prefixed deep-link form to a known version", () => {
    expect(resolveVersion("v0.2.0", versions)).toBe("0.2.0");
    expect(resolveVersion("v0.3.0", versions)).toBe("0.3.0");
  });

  it("falls back to the latest version when the value is missing", () => {
    expect(resolveVersion("", versions)).toBe("0.3.0");
  });

  it("falls back to the latest version when the value is unknown", () => {
    expect(resolveVersion("9.9.9", versions)).toBe("0.3.0");
    expect(resolveVersion("v9.9.9", versions)).toBe("0.3.0");
    expect(resolveVersion("nonsense", versions)).toBe("0.3.0");
  });
});
