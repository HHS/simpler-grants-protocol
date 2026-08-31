/**
 * Tests for `src/scripts/inject-mock-server.ts` and
 * `src/lib/mock/docs-wiring.ts` (#1078). The mock is served same-origin, so
 * there is no configurable base URL — only the `MOCK_API_ENABLED` build-time
 * gate and a relative URL built from `MOCK_API_BASE_PATH`.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  assertMockServesVersion,
  injectServers,
  versionFromSpecFilename,
  MockServerInjector,
} from "@/scripts/inject-mock-server";
import { isMockApiEnabled, serverUrlFor } from "@/lib/mock/docs-wiring";
import { MOCK_API_BASE_PATH } from "@/lib/mock/router";
import { SUPPORTED_VERSIONS } from "@/lib/mock/data/fixtures";

// Mimics the real spec's shape: no top-level `servers:` key, a top-level
// `paths:` line, and a nested unrelated `servers:` key.
const FIXTURE_YAML = `openapi: 3.0.0
info:
  title: CommonGrants Base API
  version: 0.4.0
tags:
  - name: Opportunities
    description: Endpoints related to funding opportunities
paths:
  /common-grants/opportunities:
    get:
      operationId: Opportunities_listOpportunities
      summary: List opportunities
      x-fake-nested-block:
        servers:
          - url: https://not-a-real-top-level-key.example.com
`;

describe("serverUrlFor", () => {
  it("builds the version-prefixed server URL relative to MOCK_API_BASE_PATH", () => {
    expect(serverUrlFor("0.4.0")).toBe(`${MOCK_API_BASE_PATH}/v0.4.0`);
  });
});

describe("versionFromSpecFilename", () => {
  it("extracts the version from a versioned spec filename", () => {
    expect(versionFromSpecFilename("openapi.0.4.0.yaml")).toBe("0.4.0");
    expect(versionFromSpecFilename("openapi.0.1.0.yaml")).toBe("0.1.0");
  });

  it("returns null for filenames that are not versioned specs", () => {
    expect(versionFromSpecFilename("README.md")).toBeNull();
    expect(versionFromSpecFilename("openapi.yaml")).toBeNull();
  });
});

describe("injectServers", () => {
  const serverUrl = `${MOCK_API_BASE_PATH}/v0.4.0`;

  it("inserts a top-level servers block immediately before the top-level paths line", () => {
    const result = injectServers(FIXTURE_YAML, serverUrl);

    expect(result).toContain(`servers:\n  - url: ${serverUrl}`);

    const serversIndex = result.indexOf("servers:");
    const pathsIndex = result.indexOf("\npaths:");
    expect(serversIndex).toBeGreaterThan(-1);
    expect(pathsIndex).toBeGreaterThan(-1);
    expect(serversIndex).toBeLessThan(pathsIndex);
  });

  it("preserves every original line byte-for-byte, adding only the servers block", () => {
    const result = injectServers(FIXTURE_YAML, serverUrl);

    const injectedBlock = `servers:\n  - url: ${serverUrl}\n`;
    expect(result).toContain(injectedBlock);

    const withInjectedBlockRemoved = result.replace(injectedBlock, "");
    expect(withInjectedBlockRemoved).toBe(FIXTURE_YAML);
  });

  it("does not mistake a nested indented servers key for the top-level one", () => {
    const result = injectServers(FIXTURE_YAML, serverUrl);

    expect(result).toContain(
      "      x-fake-nested-block:\n        servers:\n          - url: https://not-a-real-top-level-key.example.com",
    );

    const topLevelServersMatches = result.match(/^servers:/gm) ?? [];
    expect(topLevelServersMatches).toHaveLength(1);
  });

  it("is idempotent: replaces an existing top-level servers block rather than duplicating it", () => {
    const firstPass = injectServers(FIXTURE_YAML, serverUrl);
    const newerServerUrl = `${MOCK_API_BASE_PATH}/v0.5.0`;
    const secondPass = injectServers(firstPass, newerServerUrl);

    const topLevelServersMatches = secondPass.match(/^servers:/gm) ?? [];
    expect(topLevelServersMatches).toHaveLength(1);
    expect(secondPass).toContain(`servers:\n  - url: ${newerServerUrl}`);
    expect(secondPass).not.toContain(serverUrl);
  });
});

describe("isMockApiEnabled", () => {
  const originalMockApiEnabled = process.env.MOCK_API_ENABLED;

  afterEach(() => {
    if (originalMockApiEnabled === undefined) {
      delete process.env.MOCK_API_ENABLED;
    } else {
      process.env.MOCK_API_ENABLED = originalMockApiEnabled;
    }
  });

  it("is false when MOCK_API_ENABLED is unset", () => {
    delete process.env.MOCK_API_ENABLED;

    expect(isMockApiEnabled()).toBe(false);
  });

  it("is false when MOCK_API_ENABLED is blank or whitespace-only", () => {
    process.env.MOCK_API_ENABLED = "   ";

    expect(isMockApiEnabled()).toBe(false);
  });

  it("is true when MOCK_API_ENABLED is set to a non-blank value", () => {
    process.env.MOCK_API_ENABLED = "true";

    expect(isMockApiEnabled()).toBe(true);
  });

  // A gate keyed on mere presence would read "false" and "0" as ON, silently
  // enabling Execute buttons on a build meant to be production-inert.
  it.each(["false", "FALSE", "0", "off", "no"])(
    "is false for the falsy value %s",
    (value) => {
      process.env.MOCK_API_ENABLED = value;

      expect(isMockApiEnabled()).toBe(false);
    },
  );

  it.each(["1", "true", "TRUE", "yes", "on"])(
    "is true for the truthy value %s",
    (value) => {
      process.env.MOCK_API_ENABLED = value;

      expect(isMockApiEnabled()).toBe(true);
    },
  );
});

describe("assertMockServesVersion", () => {
  it.each(SUPPORTED_VERSIONS)(
    "accepts v%s, which the router serves",
    (version) => {
      expect(() =>
        assertMockServesVersion(version, `openapi.${version}.yaml`),
      ).not.toThrow();
    },
  );

  // The injector advertises a server for every emitted spec, so a protocol
  // version the fixtures cannot shape has to fail the build rather than ship a
  // docs page whose every Execute answers 404.
  it("throws for a spec version the router does not serve", () => {
    expect(() =>
      assertMockServesVersion("0.5.0", "openapi.0.5.0.yaml"),
    ).toThrowError(/openapi\.0\.5\.0\.yaml.*does not serve/s);
  });
});

describe("MockServerInjector", () => {
  const originalMockApiEnabled = process.env.MOCK_API_ENABLED;

  beforeEach(() => {
    delete process.env.MOCK_API_ENABLED;
  });

  afterEach(() => {
    if (originalMockApiEnabled === undefined) {
      delete process.env.MOCK_API_ENABLED;
    } else {
      process.env.MOCK_API_ENABLED = originalMockApiEnabled;
    }
  });

  it("is a clean no-op when MOCK_API_ENABLED is unset, writing nothing", () => {
    const result = MockServerInjector.inject();

    expect(result).toEqual({ skipped: true, written: [] });
  });
});
