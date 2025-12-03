import { describe, it, expect } from "vitest";
import { Client, Auth } from "../../src/client";

describe("Client", () => {
  // =============================================================================
  // Client constructor
  // =============================================================================

  describe("constructor", () => {
    it("creates a client with minimal config", () => {
      const client = new Client({ baseUrl: "https://api.example.org" });

      expect(client).toBeInstanceOf(Client);
      expect(client.getConfig().baseUrl).toBe("https://api.example.org");
    });

    it("exposes opportunities namespace", () => {
      const client = new Client({ baseUrl: "https://api.example.org" });

      expect(client.opportunities).toBeDefined();
    });

    it("uses Auth.none() by default", () => {
      const client = new Client({ baseUrl: "https://api.example.org" });

      // Client should be created without errors when no auth is provided
      expect(client).toBeInstanceOf(Client);
    });

    it("accepts auth configuration", () => {
      const client = new Client({
        baseUrl: "https://api.example.org",
        auth: Auth.bearer("test-token"),
      });

      expect(client).toBeInstanceOf(Client);
    });
  });

  // =============================================================================
  // Client.getConfig
  // =============================================================================

  describe("getConfig", () => {
    it("returns resolved configuration", () => {
      const client = new Client({
        baseUrl: "https://api.example.org",
        timeout: 5000,
        pageSize: 50,
        maxItems: 500,
      });
      const config = client.getConfig();

      expect(config.baseUrl).toBe("https://api.example.org");
      expect(config.timeout).toBe(5000);
      expect(config.pageSize).toBe(50);
      expect(config.maxItems).toBe(500);
    });

    it("returns a copy of the config rather a shared reference", () => {
      const client = new Client({ baseUrl: "https://api.example.org" });
      const config1 = client.getConfig();
      const config2 = client.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
});
