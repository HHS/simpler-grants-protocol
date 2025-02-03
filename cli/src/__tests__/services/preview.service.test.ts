import { beforeEach, describe, it, jest, expect } from "@jest/globals";
import { DefaultPreviewService } from "../../services/preview.service";

describe("DefaultPreviewService", () => {
  let service: DefaultPreviewService;

  beforeEach(() => {
    service = new DefaultPreviewService();
  });

  describe("previewSpec", () => {
    it("should preview spec with swagger", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.previewSpec("spec.yaml", { ui: "swagger" });
      expect(consoleSpy).toHaveBeenCalledWith("Mock: Previewing spec", {
        specPath: "spec.yaml",
        options: { ui: "swagger" },
      });
    });

    it("should preview spec with redocly", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.previewSpec("spec.yaml", { ui: "redocly" });
      expect(consoleSpy).toHaveBeenCalledWith("Mock: Previewing spec", {
        specPath: "spec.yaml",
        options: { ui: "redocly" },
      });
    });
  });
});
