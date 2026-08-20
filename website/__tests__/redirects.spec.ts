import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type { RedirectConfig } from "astro";
import { Paths } from "@/lib/schema/paths";
import astroConfig from "../astro.config.mjs";

/**
 * Regression guard for #1078-T5.
 *
 * The `@astrojs/cloudflare` adapter unconditionally sets
 * `build: { redirects: false }` (see `@astrojs/cloudflare/dist/index.js:180-182`),
 * so Astro never writes the meta-refresh HTML page it would otherwise generate
 * for every entry in `astro.config.mjs`'s `redirects` map
 * (`astro/dist/core/build/generate.js:332` is the branch that skips it).
 * Instead the adapter emits a single Cloudflare-specific `dist/client/_redirects`
 * file, translating each configured pattern into a whitespace-delimited
 * `source destination status` line.
 *
 * GitHub Pages has no `_redirects` support, so it cannot read that file — which
 * is exactly why this PR's merge is gated on the Cloudflare Pages/Workers
 * migration rather than continuing to serve from GitHub Pages. This test reads
 * the redirect map straight out of `astro.config.mjs` and checks the *built*
 * `dist/client/_redirects` for exactly the lines it should have produced, so a
 * redirect added to the config but dropped by the adapter's output fails here
 * instead of silently 404ing in production.
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

// `/forms-new/[slug]` is the one dynamic pattern (8 configured redirects, 7
// static); it's handled separately below.
const staticRedirects = Object.entries(redirects).filter(
  ([source]) => !source.includes("["),
);

describe("adapter-emitted _redirects", () => {
  let rules: RedirectRule[];

  beforeAll(() => {
    rules = parseRedirectsFile(fs.readFileSync(REDIRECTS_PATH, "utf-8"));
  });

  // `it.each([])` registers zero cases and reports green, so an emptied or
  // shrunken `redirects` map would make every assertion below silently vanish —
  // the same "nothing noticed" failure this suite exists to prevent. Pin the
  // count so shrinking the map fails loudly and deliberately.
  it("still covers the redirect map this suite was written against", () => {
    expect(staticRedirects.length).toBe(7);
    expect(redirects["/forms-new/[slug]"]).toBeDefined();
  });

  // The parsed-rule count is the same guard one layer down: a file the adapter
  // emitted empty, or one this parser fails to split into rules, would leave
  // every `find` below returning `undefined` for a reason unrelated to the
  // redirects themselves. 7 static patterns are doubled (trailing-slash and
  // bare) and the dynamic one is emitted once, so 7 * 2 + 1.
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

  // The adapter rewrites Astro's `[slug]` placeholder to Cloudflare's `:slug`
  // form and emits a single line rather than one per built page, since
  // `_redirects` patterns are matched at request time. The destination also
  // gains an `/index.html` suffix, from Astro's directory build format for the
  // `/forms/[slug]` page the redirect ultimately targets — a naive translation
  // of the config would miss both transforms.
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
