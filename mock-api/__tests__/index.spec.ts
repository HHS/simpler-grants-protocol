import { describe, it, expect } from "vitest";
import worker from "../src/index";

describe("worker fetch handler", () => {
  describe("GET /", () => {
    it("returns a health response with the service name and supported versions", async () => {
      const response = await worker.fetch(new Request("https://mock.example/"));

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("application/json");

      const body = await response.json();
      expect(body).toMatchObject({
        name: "@common-grants/mock-api",
        supportedVersions: ["0.1.0", "0.2.0", "0.3.0", "0.4.0"],
      });
    });
  });
});
