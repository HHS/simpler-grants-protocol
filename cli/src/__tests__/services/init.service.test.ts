import { beforeEach, describe, it, jest, expect } from "@jest/globals";
import { DefaultInitService } from "../../services/init.service";

describe("DefaultInitService", () => {
  let service: DefaultInitService;

  beforeEach(() => {
    service = new DefaultInitService();
  });

  describe("listTemplates", () => {
    it("should return available templates", async () => {
      const templates = await service.listTemplates();
      expect(templates).toEqual(["grants-api", "custom-fields", "minimal-api"]);
    });
  });

  describe("init", () => {
    it("should handle initialization with template", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.init({ template: "grants-api" });
      expect(consoleSpy).toHaveBeenCalledWith("Initializing project with options:", {
        template: "grants-api",
      });
    });

    it("should handle initialization with directory", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.init({ output: "./my-project" });
      expect(consoleSpy).toHaveBeenCalledWith("Initializing project with options:", {
        output: "./my-project",
      });
    });
  });
});
