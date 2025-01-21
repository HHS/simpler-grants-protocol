// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";

// https://astro.build/config
export default defineConfig({
  site: "https://hhs.github.io",
  // Base needs trailing slash to make relative links work when hosting locally
  base: "simpler-grants-protocol/",
  integrations: [
    starlight({
      plugins: [starlightLinksValidator()],
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
          label: "Reference",
          autogenerate: { directory: "reference" },
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
