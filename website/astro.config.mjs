// @ts-check
import { defineConfig, sessionDrivers } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";

import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://commongrants.org",
  // Every page is prerendered. The one exception, `src/pages/api/[...path].ts`,
  // opts out with `prerender = false` and is the only reason an adapter is needed.
  output: "static",
  // Serves the one dynamic route: the adapter emits the prerendered site plus
  // a small Worker for that route — see `wrangler.jsonc`.
  adapter: cloudflare({
    // Prerender in Node, not the adapter's default workerd sandbox: build-time
    // code reads ~1000 generated files via `process.cwd()`, which is `/` there.
    prerenderEnvironment: "node",
    // Optimize images with Sharp at build time; the default `cloudflare-binding`
    // defers to a runtime endpoint and needs an `IMAGES` binding.
    imageService: "compile",
  }),
  // Sessions are unused, but a non-KV driver stops the adapter injecting a
  // `SESSION` KV binding, whose auto-provisioning fails on repeat preview uploads.
  session: { driver: sessionDrivers.lruCache() },
  security: {
    // Left ON deliberately (#1078). This CSRF guard answers a bare 403 to a
    // cross-origin non-GET that takes no body, where the 3A Worker returned a
    // protocol-shaped 404 — the accepted trade-off. The mock's own GET and
    // JSON POST requests pass even cross-origin.
    checkOrigin: true,
  },
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
