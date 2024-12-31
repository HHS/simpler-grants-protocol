// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  site: "https://hhs.github.io",
  // Base needs trailing slash to make relative links work when hosting locally
  base: "simpler-grants-protocol/",
  integrations: [
    starlight({
      title: "Simpler Grant Protocol",
      social: {
        github: "https://github.com/HHS/simpler-grants-protocol",
      },
      sidebar: [
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
