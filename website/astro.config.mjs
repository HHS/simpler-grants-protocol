// @ts-check
import { defineConfig, sessionDrivers } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";

import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://commongrants.org",
  // Every page here is prerendered at build time; `output: "static"` is declared
  // explicitly (rather than left to Astro's default) because it is a deliberate
  // constraint of the mock-API experiment, not an incidental setting — see
  // #1078-T2 in the ADR discussion. The one exception is
  // `src/pages/api/[...path].ts`, which opts out per-route with
  // `export const prerender = false`; that single dynamic route is the only
  // reason an adapter is needed at all.
  output: "static",
  // Required to serve the one dynamic route from a build. In static mode the
  // adapter emits the prerendered site plus a small Worker for that route, so the
  // deploy artifact becomes a Worker-with-assets instead of assets alone — see
  // `wrangler.jsonc`.
  adapter: cloudflare({
    // Keep prerendering in Node. The adapter defaults to prerendering inside a
    // workerd sandbox, which this site cannot survive: its build-time code reads
    // ~1000 generated files off disk (extension schemas, OpenAPI specs, forms,
    // plugin metadata), and `Paths` in `src/lib/schema/paths.ts` derives every
    // one of those locations from `process.cwd()` — which is `/` in workerd. The
    // symptom is a build that dies with `Schema CustomLegacySerialId not found in
    // /.extension-schemas`. Only the single dynamic API route needs the
    // Cloudflare runtime, and it gets it at request time either way.
    prerenderEnvironment: "node",
    // Optimize images with Sharp at build time (`sharp` is already a dependency)
    // rather than the adapter's default `cloudflare-binding`, which defers
    // optimization to a runtime `/_image` endpoint and requires an `IMAGES`
    // binding. Every page carrying an image is prerendered, so there is nothing
    // for a runtime image service to do, and build-time output stays immutably
    // cacheable.
    imageService: "compile",
  }),
  // We don't use Astro sessions, but `@astrojs/cloudflare` v14 injects a `SESSION`
  // KV binding by default and auto-provisions the namespace on deploy — which
  // fails once it already exists (`already exists [code: 10014]`), exactly the
  // repeat-upload pattern `wrangler versions upload` uses for PR previews. A
  // non-KV in-memory driver stops the adapter injecting the binding at all, so
  // there is no namespace to create, collide with, or manage.
  session: { driver: sessionDrivers.lruCache() },
  security: {
    // Left ON deliberately, and stated rather than defaulted so it reads as a
    // decision (#1078-T2). This CSRF guard answers 403 before the mock route runs
    // for a non-GET/HEAD request carrying no `Origin` header, where the 3A
    // standalone Worker returned a protocol-shaped 404 — the one case out of 31
    // where byte-identity doesn't hold end-to-end. It costs nothing real: only
    // `PUT`/`DELETE` and form-content-type POSTs are affected, none of which the
    // mock serves, while `GET` and `POST /search` with a JSON body pass even
    // cross-origin. Disabling a site-wide guard to recover a 404's exact wording
    // would be the worse trade.
    checkOrigin: true,
  },
  // Restore the documented GFM default for .mdx files. Astro 6.4.x stopped
  // populating `markdown.gfm`, and the @astrojs/mdx version bundled by
  // Starlight 0.39.x silently drops remark-gfm when the value is absent,
  // breaking tables in .mdx pages. See withastro/astro#16971. This line can
  // be removed once Starlight is on @astrojs/mdx@^6 (Starlight >= 0.40.0).
  markdown: { gfm: true },
  redirects: {
    // These pages were consolidated into a single page for the opportunity models.
    "/protocol/models/opp-base": "/protocol/models/opportunity#opportunitybase",
    "/protocol/models/opp-status": "/protocol/models/opportunity#oppstatus",
    "/protocol/models/opp-funding": "/protocol/models/opportunity#oppfunding",
    "/protocol/models/opp-timeline": "/protocol/models/opportunity#opptimeline",
    "/form-playground": "/forms/playground",
    // forms-new -> forms migration redirects
    "/forms/library": "/forms/",
    "/forms-new": "/forms/",
    "/forms-new/[slug]": "/forms/[slug]",
  },
  integrations: [
    starlight({
      head: [
        // Adds Cabin analytics to the page.
        {
          tag: "script",
          attrs: {
            async: true,
            src: "https://scripts.withcabin.com/hello.js",
          },
        },
      ],
      favicon: "/favicon.ico",
      customCss: ["./src/styles/custom.css"],
      components: {
        Header: "./src/components/starlight-overrides/Header.astro",
        PageFrame: "./src/components/starlight-overrides/PageFrame.astro",
      },
      plugins: [
        // Generate the OpenAPI documentation pages.
        starlightLinksValidator({
          errorOnLocalLinks: false,
          exclude: [
            "/protocol/api-docs",
            "/protocol/api-docs/**",
            "/protocol/api-docs**", // Catches ?version=v0.2.0
            "/custom-fields",
            "/custom-fields/**",
            "/forms",
            "/forms/**",
            "/question-bank",
            "/question-bank/**",
            "/plugins",
            "/plugins/**",
            "/registries",
            "/registries/**",
          ],
        }),
      ],
      title: "CommonGrants",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/HHS/simpler-grants-protocol",
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/HHS/simpler-grants-protocol/edit/main/website/",
      },
      sidebar: [
        {
          label: "Get involved",
          collapsed: true,
          items: [
            {
              label: "Vote for features →",
              link: "https://commongrants.fider.io",
            },
            {
              label: "Contact us →",
              link: "https://forms.gle/XUJuEnNtaZkdc1MQ6",
            },
            {
              label: "Ask a question →",
              link: "https://forum.simpler.grants.gov/c/commongrants/8",
            },
          ],
        },
        {
          label: "Welcome",
          items: [
            { label: "Getting started", link: "getting-started" },
            { label: "About CommonGrants", link: "about" },
            { label: "Community stewardship group", link: "community" },
          ],
        },
        {
          label: "Catalogs",
          items: [
            {
              label: "Custom fields",
              link: "custom-fields",
            },
            {
              label: "Plugins",
              link: "plugins",
            },
            {
              label: "ID registries",
              link: "registries",
            },
          ],
        },
        {
          label: "Protocol",
          items: [
            {
              label: "Specification",
              link: "protocol/specification",
            },
            {
              label: "OpenAPI docs",
              link: "protocol/api-docs",
            },
            {
              label: "Types",
              collapsed: true,
              items: [{ autogenerate: { directory: "protocol/types" } }],
            },
            {
              label: "Fields",
              collapsed: true,
              items: [{ autogenerate: { directory: "protocol/fields" } }],
            },
            {
              label: "Models",
              collapsed: true,
              items: [{ autogenerate: { directory: "protocol/models" } }],
            },
            {
              label: "Filters",
              collapsed: true,
              items: [{ autogenerate: { directory: "protocol/filters" } }],
            },
            {
              label: "Responses",
              collapsed: true,
              items: [{ autogenerate: { directory: "protocol/responses" } }],
            },
            {
              label: "Pagination",
              link: "protocol/pagination",
            },
            {
              label: "Sorting",
              link: "protocol/sorting",
            },
            {
              label: "Authentication and scopes",
              link: "protocol/auth",
            },
          ],
        },
        {
          label: "Forms",
          items: [
            {
              label: "Form library",
              link: "forms",
            },
            {
              label: "Form question bank",
              link: "question-bank",
            },
            {
              label: "Pre-fill playground",
              link: "forms/playground",
            },
          ],
        },
        {
          label: "Guides",
          items: [{ autogenerate: { directory: "guides" } }],
        },
        {
          label: "Governance",
          items: [
            {
              label: "Recording decisions",
              link: "governance/decisions",
            },
            {
              label: "ADRs",
              collapsed: true,
              items: [{ autogenerate: { directory: "governance/adr" } }],
            },
            {
              label: "RFCs",
              collapsed: true,
              items: [{ autogenerate: { directory: "governance/rfc" } }],
            },
          ],
        },
      ],
    }),
    react(),
  ],
});
