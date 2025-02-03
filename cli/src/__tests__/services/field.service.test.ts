import { beforeEach, describe, it, jest, expect } from "@jest/globals";
import { DefaultFieldService } from "../../services/field.service";

describe("DefaultFieldService", () => {
  let service: DefaultFieldService;

  beforeEach(() => {
    service = new DefaultFieldService();
  });

  describe("addField", () => {
    it("should add field with basic options", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.addField("testField", "string", {});
      expect(consoleSpy).toHaveBeenCalledWith("Mock: Adding field", {
        name: "testField",
        type: "string",
        options: {},
      });
    });

    it("should add field with example and description", async () => {
      const consoleSpy = jest.spyOn(console, "log");
      await service.addField("testField", "number", {
        example: "100",
        description: "A test field",
      });
      expect(consoleSpy).toHaveBeenCalledWith("Mock: Adding field", {
        name: "testField",
        type: "number",
        options: { example: "100", description: "A test field" },
      });
    });
  });
});
