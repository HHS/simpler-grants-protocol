import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type { RedirectConfig } from "astro";
import { Paths } from "@/lib/schema/paths";
import astroConfig from "../astro.config.mjs";

/**
 * Regression guard for #1078. The `@astrojs/cloudflare` adapter skips Astro's
 * meta-refresh redirect pages and instead emits `dist/client/_redirects`, one
 * `source destination status` line per pattern. This suite checks that built
 * file against the `astro.config.mjs` redirect map, so a dropped redirect
 * fails here instead of silently 404ing in production.
 *
 * Requires a build: `pnpm --filter website build` writes the file under test.
 */

interface AstroConfigWithRedirects {
  redirects: Record<string, RedirectConfig>;
}

interface RedirectRule {
  source: string;
  destination: string;
  status: string;
}

function destinationOf(value: RedirectConfig): string {
  return typeof value === "string" ? value : value.destination;
}

function parseRedirectsFile(content: string): RedirectRule[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [source, destination, status] = line.split(/\s+/);
      return { source, destination, status };
    });
}

const { redirects } = astroConfig as AstroConfigWithRedirects;

const REDIRECTS_PATH = path.join(
  Paths.WEBSITE_ROOT,
  "dist",
  "client",
  "_redirects",
);

// `/forms-new/[slug]` is the one dynamic pattern; handled separately below.
const staticRedirects = Object.entries(redirects).filter(
  ([source]) => !source.includes("["),
);

describe("adapter-emitted _redirects", () => {
  let rules: RedirectRule[];

  beforeAll(() => {
    // The bare read fails with an ENOENT that reads like a broken suite rather
    // than a missing prerequisite, so say which command produces the file.
    if (!fs.existsSync(REDIRECTS_PATH)) {
      throw new Error(
        `${REDIRECTS_PATH} does not exist. This suite checks built output — ` +
          "run `pnpm --filter website build` before `pnpm --filter website test`.",
      );
    }

    rules = parseRedirectsFile(fs.readFileSync(REDIRECTS_PATH, "utf-8"));
  });

  // `it.each([])` registers zero cases and reports green, so pin the count to
  // keep a shrunken redirect map from passing vacuously.
  it("still covers the redirect map this suite was written against", () => {
    expect(staticRedirects.length).toBe(7);
    expect(redirects["/forms-new/[slug]"]).toBeDefined();
  });

  // Same guard one layer down: 7 static patterns are doubled (trailing-slash
  // and bare) and the dynamic one is emitted once, so 7 * 2 + 1.
  it("pins the total line count so a parse that silently yields nothing can't pass vacuously", () => {
    expect(rules.length).toBe(15);
  });

  it.each(staticRedirects)(
    "%s is emitted with both a trailing-slash and bare variant pointing at its configured destination",
    (source, value) => {
      const destination = destinationOf(value);

      const withTrailingSlash = rules.find(
        (rule) => rule.source === `${source}/`,
      );
      const bare = rules.find((rule) => rule.source === source);

      expect(withTrailingSlash).toEqual({
        source: `${source}/`,
        destination,
        status: "301",
      });
      expect(bare).toEqual({ source, destination, status: "301" });
    },
  );

  // The adapter rewrites `[slug]` to Cloudflare's `:slug` form and appends
  // `/index.html`, from the directory build format of the target page.
  it("rewrites the dynamic /forms-new/[slug] redirect to :slug with the directory build's /index.html suffix", () => {
    const sourceTemplate = "/forms-new/[slug]";
    const destinationTemplate = destinationOf(redirects[sourceTemplate]);

    const expectedSource = sourceTemplate.replace("[slug]", ":slug");
    const expectedDestination = `${destinationTemplate.replace(
      "[slug]",
      ":slug",
    )}/index.html`;

    const rule = rules.find((r) => r.source === expectedSource);

    expect(rule).toEqual({
      source: expectedSource,
      destination: expectedDestination,
      status: "301",
    });
  });
});
