// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";
import starlightOpenAPI, { openAPISidebarGroups } from "starlight-openapi";

// https://astro.build/config
export default defineConfig({
  site: "https://commongrants.org",
  integrations: [
    starlight({
      plugins: [
        // Generate the OpenAPI documentation pages.
        starlightOpenAPI([
          {
            base: "protocol/openapi",
            label: "OpenAPI spec",
            schema: "./tsp-output/@typespec/openapi3/openapi.yaml",
          },
        ]),
        starlightLinksValidator({
          errorOnLocalLinks: false,
          exclude: ["/protocol/openapi/**"],
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
              label: "Core library",
              collapsed: true,
              items: [
                {
                  label: "Overview",
                  link: "protocol/overview",
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
                  label: "Pagination",
                  link: "protocol/pagination",
                },
                {
                  label: "Sorting",
                  link: "protocol/sorting",
                },
              ],
            },
            ...openAPISidebarGroups,
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
  ],
});
