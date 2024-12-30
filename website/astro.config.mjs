// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// Use the BASE_URL environment variable for PR previews, if set,
// or default to using the production BASE_URL for prod deploys
const base = process.env.BASE_URL || "/simpler-grants-protocol/";

// https://astro.build/config
export default defineConfig({
  site: "https://hhs.github.io",
  // Dynamically set the base to enable PR previews
  base: base,
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
