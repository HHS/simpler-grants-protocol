import { beforeEach, describe, it, jest, expect } from "@jest/globals";
import { DefaultCodeGenerationService } from "../../services/code-generation.service";

describe("DefaultCodeGenerationService", () => {
  let service: DefaultCodeGenerationService;

  beforeEach(() => {
    service = new DefaultCodeGenerationService();
  });

  describe("generateServer", () => {
    it("should generate server code with options", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.generateServer("spec.yaml", {
        lang: "typescript",
        only: ["controllers", "models"],
      });
      expect(consoleSpy).toHaveBeenCalledWith("Mock: Generating server", {
        specPath: "spec.yaml",
        options: { lang: "typescript", only: ["controllers", "models"] },
      });
    });
  });

  describe("generateClient", () => {
    it("should generate client code with options", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.generateClient("spec.yaml", {
        lang: "python",
        output: "./sdk",
        docs: true,
      });
      expect(consoleSpy).toHaveBeenCalledWith("Mock: Generating client", {
        specPath: "spec.yaml",
        options: { lang: "python", output: "./sdk", docs: true },
      });
    });
  });
});
