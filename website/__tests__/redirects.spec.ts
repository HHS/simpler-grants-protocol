import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type { RedirectConfig } from "astro";
import { Paths } from "@/lib/schema/paths";
import { getFormIds } from "@/lib/forms";
import astroConfig from "../astro.config.mjs";

/**
 * Regression guard for #1078-T2.
 *
 * Adding the `@astrojs/cloudflare` adapter unconditionally sets
 * `build: { redirects: false }` (see `@astrojs/cloudflare/dist/index.js:180-182`),
 * so Astro stops writing the meta-refresh HTML page it used to generate for
 * every entry in `astro.config.mjs`'s `redirects` map
 * (`astro/dist/core/build/generate.js:332` is the branch that now skips it) and
 * instead only emits a Cloudflare-specific `dist/client/_redirects` file.
 * GitHub Pages — which serves production today via
 * `.github/workflows/cd-deploy-website.yml` — has no `_redirects` support, so
 * every configured redirect silently began 404ing there, and nothing in the
 * suite noticed.
 *
 * The fix is committed meta-refresh HTML under `website/public/<source>/index.html`
 * for each redirect source: files under `public/` are copied verbatim and
 * bypass Astro's redirect handling entirely, so `build.redirects: false` cannot
 * suppress them. This test reads the redirect map straight out of
 * `astro.config.mjs` and checks the *built* output under `dist/client` for
 * exactly that artifact, so adding a new redirect to the config without a
 * matching `public/` page fails here instead of silently 404ing in production.
 */

interface AstroConfigWithRedirects {
  redirects: Record<string, RedirectConfig>;
}

function destinationOf(value: RedirectConfig): string {
  return typeof value === "string" ? value : value.destination;
}

function extractRefreshTarget(html: string): string | undefined {
  const metaTag = html.match(
    /<meta[^>]*http-equiv=["']refresh["'][^>]*>/i,
  )?.[0];
  return metaTag?.match(/content=["']\s*\d+\s*;\s*url=([^"']+)["']/i)?.[1];
}

const { redirects } = astroConfig as AstroConfigWithRedirects;

const DIST_CLIENT_DIR = path.join(Paths.WEBSITE_ROOT, "dist", "client");

// `/forms-new/[slug]` is the one dynamic pattern (8 configured redirects, 7
// static); it's handled separately below.
const staticRedirects = Object.entries(redirects).filter(
  ([source]) => !source.includes("["),
);

describe("redirect meta-refresh pages", () => {
  // `it.each([])` registers zero cases and reports green, so an emptied or
  // shrunken `redirects` map would make every assertion below silently vanish —
  // the same "nothing noticed" failure this suite exists to prevent. Pin the
  // count so shrinking the map fails loudly and deliberately.
  it("still covers the redirect map this suite was written against", () => {
    expect(staticRedirects.length).toBe(7);
    expect(redirects["/forms-new/[slug]"]).toBeDefined();
  });

  it.each(staticRedirects)(
    "%s serves a meta-refresh page matching its configured destination",
    (source, value) => {
      const destination = destinationOf(value);
      const indexPath = path.join(DIST_CLIENT_DIR, source, "index.html");

      expect(fs.existsSync(indexPath)).toBe(true);

      const html = fs.readFileSync(indexPath, "utf-8");
      expect(html).toContain('http-equiv="refresh"');
      expect(extractRefreshTarget(html)).toBe(destination);
    },
  );

  // The `/forms-new/[slug]` pattern is dynamic, so no finite set of static pages
  // can cover the whole space `[slug]` could match. What it can cover is every
  // slug the site actually builds a form page for, which is the only set the old
  // `/forms-new/<slug>` URLs could ever have pointed at.
  it("covers every built form slug under the dynamic /forms-new/[slug] redirect", () => {
    const sourceTemplate = "/forms-new/[slug]";
    const destinationTemplate = destinationOf(redirects[sourceTemplate]);

    // Taken from `getFormIds()` — the same list `src/pages/forms/[slug].astro`
    // feeds to `getStaticPaths` — rather than scraped from directory names under
    // `dist/client/forms`. Scraping picks up anything else that happens to live
    // there, including the `/forms/library` redirect page this very fix adds.
    const formSlugs = getFormIds();

    expect(formSlugs.length).toBeGreaterThan(0);

    for (const slug of formSlugs) {
      const indexPath = path.join(
        DIST_CLIENT_DIR,
        sourceTemplate.replace("[slug]", slug),
        "index.html",
      );
      const destination = destinationTemplate.replace("[slug]", slug);

      expect(fs.existsSync(indexPath)).toBe(true);

      const html = fs.readFileSync(indexPath, "utf-8");
      expect(extractRefreshTarget(html)).toBe(destination);
    }
  });
});
