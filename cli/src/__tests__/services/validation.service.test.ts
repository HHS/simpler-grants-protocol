import { beforeEach, describe, it, jest, expect } from "@jest/globals";
import { DefaultValidationService } from "../../services/validation.service";

describe("DefaultValidationService", () => {
  let service: DefaultValidationService;

  beforeEach(() => {
    service = new DefaultValidationService();
  });

  describe("checkApi", () => {
    it("should validate API implementation", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.checkApi("http://api.example.com", "spec.yaml", {
        client: "httpx",
        report: "json",
      });
      expect(consoleSpy).toHaveBeenCalledWith("Mock: Checking API", {
        apiUrl: "http://api.example.com",
        specPath: "spec.yaml",
        options: { client: "httpx", report: "json" },
      });
    });
  });

  describe("checkSpec", () => {
    it("should validate spec compliance", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.checkSpec("spec.yaml", {
        version: "v2.0.1",
        base: "base-spec.yaml",
      });
      expect(consoleSpy).toHaveBeenCalledWith("Mock: Checking spec compliance", {
        specPath: "spec.yaml",
        options: { version: "v2.0.1", base: "base-spec.yaml" },
      });
    });
  });
});
