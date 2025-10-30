import { describe, it, expect } from "vitest";
import { hello } from "./index";

describe("SDK", () => {
  describe("hello", () => {
    it("should return a greeting to the audience", () => {
      expect(hello("world")).toBe("hello world");
    });
  });
});
