// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";
import starlightOpenAPI, { openAPISidebarGroups } from "starlight-openapi";

// https://astro.build/config
export default defineConfig({
  site: "https://hhs.github.io",
  // Base needs trailing slash to make relative links work when hosting locally
  base: "simpler-grants-protocol/",
  integrations: [
    starlight({
      plugins: [
        // Generate the OpenAPI documentation pages.
        starlightOpenAPI([
          {
            base: "protocol/api",
            label: "Routes",
            schema: "./tsp-output/@typespec/openapi3/openapi.yaml",
          },
        ]),
        starlightLinksValidator({
          errorOnLocalLinks: false,
          exclude: ["/simpler-grants-protocol/protocol/api/operations/*"],
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
          label: "Guides",
          autogenerate: { directory: "guides" },
        },
        {
          label: "Protocol",
          items: [
            { label: "Specification", link: "protocol/specification" },
            {
              label: "Schemas",
              collapsed: true,
              items: [
                {
                  label: "Overview",
                  link: "protocol/schemas/overview",
                },
                {
                  label: "Base types",
                  collapsed: true,
                  autogenerate: { directory: "protocol/schemas/types" },
                },
                {
                  label: "Core fields",
                  collapsed: true,
                  autogenerate: { directory: "protocol/schemas/fields" },
                },
                {
                  label: "Opportunity models",
                  collapsed: true,
                  autogenerate: { directory: "protocol/schemas/opportunity" },
                },
              ],
            },
            ...openAPISidebarGroups,
          ],
        },
        {
          label: "Decisions",
          items: [
            "decisions/overview",
            {
              label: "ADRs",
              collapsed: true,
              autogenerate: { directory: "decisions/adr" },
            },
          ],
        },
      ],
    }),
  ],
});
