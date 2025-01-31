import { describe, it, expect } from "@jest/globals";
import {
  validatePreviewOptions,
  validateCheckApiOptions,
  validateGenerateServerOptions,
} from "../../types/command-options";

describe("Command Options Validation", () => {
  describe("validatePreviewOptions", () => {
    it("should accept valid UI options", () => {
      expect(validatePreviewOptions({ ui: "swagger" })).toEqual({
        ui: "swagger",
      });
      expect(validatePreviewOptions({ ui: "redocly" })).toEqual({
        ui: "redocly",
      });
    });

    it("should use swagger as default UI", () => {
      expect(validatePreviewOptions({})).toEqual({ ui: "swagger" });
    });

    it("should reject invalid UI options", () => {
      expect(() => validatePreviewOptions({ ui: "invalid" })).toThrow(
        'UI option must be either "swagger" or "redocly"'
      );
    });
  });

  describe("validateCheckApiOptions", () => {
    it("should accept valid report formats", () => {
      expect(validateCheckApiOptions({ report: "json" })).toEqual({
        client: undefined,
        report: "json",
        auth: undefined,
      });
      expect(validateCheckApiOptions({ report: "html" })).toEqual({
        client: undefined,
        report: "html",
        auth: undefined,
      });
    });

    it("should reject invalid report formats", () => {
      expect(() => validateCheckApiOptions({ report: "invalid" })).toThrow(
        'Report format must be either "json" or "html"'
      );
    });
  });

  describe("validateGenerateServerOptions", () => {
    it("should accept valid component options", () => {
      expect(
        validateGenerateServerOptions({ only: "controllers,models" })
      ).toEqual({ lang: undefined, only: "controllers,models" });
    });

    it("should reject invalid components", () => {
      expect(() =>
        validateGenerateServerOptions({ only: "invalid,components" })
      ).toThrow(/Invalid components: invalid, components/);
    });
  });
});
