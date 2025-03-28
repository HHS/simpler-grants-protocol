// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://commongrants.org",
  integrations: [
    starlight({
      favicon: "/favicon.ico",
      customCss: ["./src/styles/custom.css"],
      plugins: [
        // Generate the OpenAPI documentation pages.
        starlightLinksValidator({
          errorOnLocalLinks: false,
          exclude: ["/protocol/api-docs", "/protocol/api-docs/**"],
        }),
      ],
      title: "CommonGrants",
      social: {
        github: "https://github.com/HHS/simpler-grants-protocol",
      },
      editLink: {
        baseUrl:
          "https://github.com/HHS/simpler-grants-protocol/edit/main/website/",
      },
      sidebar: [
        {
          label: "Welcome",
          items: [
            { label: "Getting started", link: "getting-started" },
            { label: "About CommonGrants", link: "about" },
          ],
        },
        {
          label: "Protocol",
          items: [
            { label: "Specification", link: "protocol/specification" },
            {
              label: "OpenAPI docs",
              link: "protocol/api-docs",
            },
            {
              label: "Types",
              collapsed: true,
              autogenerate: { directory: "protocol/types" },
            },
            {
              label: "Fields",
              collapsed: true,
              autogenerate: { directory: "protocol/fields" },
            },
            {
              label: "Models",
              collapsed: true,
              autogenerate: { directory: "protocol/models" },
            },
            {
              label: "Filters",
              collapsed: true,
              autogenerate: { directory: "protocol/filters" },
            },
            {
              label: "Responses",
              collapsed: true,
              autogenerate: { directory: "protocol/responses" },
            },
            {
              label: "Pagination",
              link: "protocol/pagination",
            },
            {
              label: "Sorting",
              link: "protocol/sorting",
            },
          ],
        },
        {
          label: "Guides",
          autogenerate: { directory: "guides" },
        },
        {
          label: "Governance",
          items: [
            {
              label: "Request for Comments",
              link: "governance/rfc",
            },
            {
              label: "Recording decisions",
              link: "governance/decisions",
            },
            {
              label: "ADRs",
              collapsed: true,
              autogenerate: { directory: "governance/adr" },
            },
          ],
        },
      ],
    }),
    react(),
  ],
});
