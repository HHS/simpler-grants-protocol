import { beforeEach, describe, it, expect } from "@jest/globals";
import { DefaultPreviewService } from "../../../commands/preview/preview-service";
import { join } from "path";
import request from "supertest";
import express from "express";

describe("DefaultPreviewService", () => {
  let service: DefaultPreviewService;
  const fixturesPath = join(__dirname, "..", "fixtures");
  beforeEach(() => {
    service = new DefaultPreviewService();
  });

  describe("createPreviewApp", () => {
    it("should create app with valid YAML spec", async () => {
      const yamlPath = join(fixturesPath, "valid.yaml");
      const app = await service.createPreviewApp(yamlPath);

      const response = await request(app as express.Express).get("/");
      expect(response.status).toBe(200);
      expect(response.text).toContain("swagger-ui");
    });

    it("should create app with valid JSON spec", async () => {
      const jsonPath = join(fixturesPath, "valid.json");
      const app = await service.createPreviewApp(jsonPath);

      const response = await request(app as express.Express).get("/");
      expect(response.status).toBe(200);
      expect(response.text).toContain("swagger-ui");
    });

    it("should throw error when file doesn't exist", async () => {
      const nonexistentPath = join(fixturesPath, "nonexistent.yaml");
      await expect(service.createPreviewApp(nonexistentPath)).rejects.toThrow(
        /.*ENOENT: no such file or directory/
      );
    });

    it("should throw error when spec is invalid", async () => {
      const invalidPath = join(fixturesPath, "invalid.yaml");
      await expect(service.createPreviewApp(invalidPath)).rejects.toThrow(
        "Invalid OpenAPI specification format"
      );
    });
  });
});
